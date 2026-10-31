import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Select a valid destination');
const text = (min, max) => z.string().trim().min(min).max(max);
const image = z.string().trim().url().refine(value => /^https?:\/\//i.test(value), 'Use an HTTP or HTTPS image URL');
const common = {
    name: text(2, 150), description: text(10, 3000),
    price: z.number().nonnegative().max(1_000_000_000),
    duration: text(1, 150), image,
};
export const experienceSchema = z.object({
    ...common, category: text(2, 100), destinationId: objectId,
    rating: z.number().min(0).max(5).optional(),
}).strict();
export const journeySchema = z.object({
    ...common,
    includedActivities: z.array(text(1, 300)).max(100),
    hotelInformation: text(2, 1000),
    destinationIds: z.array(objectId).min(1).max(100).refine(ids => new Set(ids).size === ids.length, 'Choose each destination once'),
    itinerary: z.array(z.object({
        day: z.number().int().positive().max(365),
        place: text(1, 150), detail: text(1, 1500),
    }).strict()).min(1).max(365).refine(days => new Set(days.map(day => day.day)).size === days.length, 'Use a different day number for each itinerary day'),
}).strict();
class CatalogError extends Error {
    status;
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}
async function checkDestinations(tx, ids) {
    const count = await tx.destination.count({ where: { id: { in: ids } } });
    if (count !== ids.length)
        throw new CatalogError(400, 'One or more selected destinations no longer exist. Refresh and choose again.');
}
// The app supplies its existing authentication and administrator middleware.
export function createExperienceJourneyRouter(prisma, requireAuth, requireAdmin) {
    const router = Router();
    const run = (handler) => (req, res, next) => {
        Promise.resolve().then(() => handler(req, res, next)).catch(error => {
            if (error instanceof z.ZodError) {
                res.status(400).json({ message: error.issues.slice(0, 3).map(issue => `${issue.path.join('.') || 'Input'}: ${issue.message}`).join('; '), errors: error.issues });
            }
            else if (error instanceof CatalogError) {
                res.status(error.status).json({ message: error.message });
            }
            else if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
                res.status(409).json({ message: 'This record changed during your request. Refresh and try again.' });
            }
            else {
                next(error);
            }
        });
    };
    router.get('/activities', run(async (_req, res) => {
        res.json({ data: await prisma.activity.findMany({ orderBy: { name: 'asc' } }) });
    }));
    router.get('/activities/:id', run(async (req, res) => {
        res.json({ data: await prisma.activity.findUniqueOrThrow({ where: { id: objectId.parse(req.params.id) } }) });
    }));
    router.post('/activities', requireAuth, requireAdmin, run(async (req, res) => {
        const data = experienceSchema.parse(req.body);
        const saved = await prisma.$transaction(async (tx) => {
            await checkDestinations(tx, [data.destinationId]);
            return tx.activity.create({ data });
        });
        res.status(201).json({ data: saved });
    }));
    router.patch('/activities/:id', requireAuth, requireAdmin, run(async (req, res) => {
        const id = objectId.parse(req.params.id);
        const data = experienceSchema.partial().refine(value => Object.keys(value).length > 0, 'Provide fields to update').parse(req.body);
        const saved = await prisma.$transaction(async (tx) => {
            if (data.destinationId)
                await checkDestinations(tx, [data.destinationId]);
            return tx.activity.update({ where: { id }, data });
        });
        res.json({ data: saved });
    }));
    router.delete('/activities/:id', requireAuth, requireAdmin, run(async (req, res) => {
        const id = objectId.parse(req.params.id);
        await prisma.$transaction(async (tx) => {
            await tx.activity.findUniqueOrThrow({ where: { id } });
            const [reviews, saved] = await Promise.all([
                tx.review.count({ where: { activityId: id } }),
                tx.wishlist.count({ where: { kind: 'ACTIVITY', itemId: id } }),
            ]);
            if (reviews || saved)
                throw new CatalogError(409, 'This experience has linked reviews or saved places and cannot be deleted.');
            await tx.activity.delete({ where: { id } });
        });
        res.status(204).end();
    }));
    const include = { destinations: { orderBy: { order: 'asc' } } };
    router.get('/packages', run(async (_req, res) => {
        res.json({ data: await prisma.tourPackage.findMany({ include, orderBy: { name: 'asc' } }) });
    }));
    router.get('/packages/:id', run(async (req, res) => {
        res.json({ data: await prisma.tourPackage.findUniqueOrThrow({ where: { id: objectId.parse(req.params.id) }, include }) });
    }));
    router.post('/packages', requireAuth, requireAdmin, run(async (req, res) => {
        const { destinationIds, ...fields } = journeySchema.parse(req.body);
        const saved = await prisma.$transaction(async (tx) => {
            await checkDestinations(tx, destinationIds);
            return tx.tourPackage.create({
                data: { ...fields, itinerary: [...fields.itinerary].sort((a, b) => a.day - b.day),
                    destinations: { create: destinationIds.map((destinationId, order) => ({ order, destination: { connect: { id: destinationId } } })) },
                }, include,
            });
        });
        res.status(201).json({ data: saved });
    }));
    router.patch('/packages/:id', requireAuth, requireAdmin, run(async (req, res) => {
        const id = objectId.parse(req.params.id);
        const { destinationIds, ...fields } = journeySchema.partial().refine(value => Object.keys(value).length > 0, 'Provide fields to update').parse(req.body);
        const saved = await prisma.$transaction(async (tx) => {
            if (destinationIds)
                await checkDestinations(tx, destinationIds);
            return tx.tourPackage.update({ where: { id },
                data: { ...fields,
                    ...(fields.itinerary ? { itinerary: [...fields.itinerary].sort((a, b) => a.day - b.day) } : {}),
                    ...(destinationIds ? { destinations: {
                            deleteMany: {}, create: destinationIds.map((destinationId, order) => ({ order, destination: { connect: { id: destinationId } } })),
                        } } : {}),
                }, include,
            });
        });
        res.json({ data: saved });
    }));
    router.delete('/packages/:id', requireAuth, requireAdmin, run(async (req, res) => {
        const id = objectId.parse(req.params.id);
        await prisma.$transaction(async (tx) => {
            await tx.tourPackage.findUniqueOrThrow({ where: { id } });
            const [bookings, reviews, saved] = await Promise.all([
                tx.booking.count({ where: { packageId: id } }),
                tx.review.count({ where: { packageId: id } }),
                tx.wishlist.count({ where: { kind: 'PACKAGE', itemId: id } }),
            ]);
            if (bookings || reviews || saved)
                throw new CatalogError(409, 'This journey has linked bookings, reviews or saved places and cannot be deleted.');
            await tx.packageDestination.deleteMany({ where: { packageId: id } });
            await tx.tourPackage.delete({ where: { id } });
        });
        res.status(204).end();
    }));
    return router;
}
