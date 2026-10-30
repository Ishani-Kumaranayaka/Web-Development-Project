import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Prisma, PrismaClient } from '@prisma/client';
import { z } from 'zod';
const app = express();
const prisma = new PrismaClient();
const port = Number(process.env.API_PORT ?? 4000);
const jwtSecret = process.env.JWT_SECRET ?? 'travelmate-local-development-secret-change-me';
app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));
function asyncRoute(handler) {
    return (request, response, next) => {
        void handler(request, response, next).catch(next);
    };
}
function requireAuth(request, response, next) {
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) {
        response.status(401).json({ message: 'Authentication required' });
        return;
    }
    try {
        const decoded = jwt.verify(token, jwtSecret);
        if (typeof decoded === 'string' || !decoded.sub || !decoded.email || (decoded.role !== 'USER' && decoded.role !== 'ADMIN')) {
            response.status(401).json({ message: 'Invalid authentication token' });
            return;
        }
        request.authUser = { id: decoded.sub, role: decoded.role, email: decoded.email };
        next();
    }
    catch {
        response.status(401).json({ message: 'Invalid or expired authentication token' });
    }
}
function requireAdmin(request, response, next) {
    if (request.authUser?.role !== 'ADMIN') {
        response.status(403).json({ message: 'Administrator access required' });
        return;
    }
    next();
}
function respondError(error, _request, response, _next) {
    if (error instanceof z.ZodError) {
        response.status(400).json({ message: 'Request validation failed', errors: error.issues });
        return;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        console.error('Database error code:', error.code);
        console.error('Database error message:', error.message);
        const status = error.code === 'P2025' ? 404 : error.code === 'P2002' ? 409 : 400;
        response.status(status).json({ message: error.code === 'P2025' ? 'Record not found' : error.code === 'P2002' ? 'A record with those details already exists' : 'Database request failed' });
        return;
    }
    console.error(error);
    response.status(500).json({ message: 'Unexpected server error' });
}
const idParam = z.string().regex(/^[a-f\d]{24}$/i, 'Expected a MongoDB ObjectId');
const destinationSchema = z.object({ name: z.string().min(2), description: z.string().min(10), location: z.string().min(2), province: z.string().min(2), category: z.string().min(2), image: z.string().url(), bestTime: z.string(), averageCost: z.number().nonnegative(), rating: z.number().min(0).max(5).optional(), latitude: z.number().optional(), longitude: z.number().optional() });
const hotelSchema = z.object({ name: z.string().min(2), description: z.string().min(10), location: z.string().min(2), pricePerNight: z.number().nonnegative(), rating: z.number().min(0).max(5).optional(), image: z.string().url(), facilities: z.array(z.string()), destinationId: idParam });
const activitySchema = z.object({ name: z.string().min(2), description: z.string().min(10), category: z.string().min(2), price: z.number().nonnegative(), duration: z.string(), image: z.string().url(), rating: z.number().min(0).max(5).optional(), destinationId: idParam });
const packageSchema = z.object({ name: z.string().min(2), description: z.string().min(10), duration: z.string(), price: z.number().nonnegative(), image: z.string().url(), includedActivities: z.array(z.string()), hotelInformation: z.string(), itinerary: z.array(z.object({ day: z.number().int().positive(), place: z.string(), detail: z.string() })), destinationIds: z.array(idParam) });
app.get('/api/health', asyncRoute(async (_request, response) => {
    try {
        await prisma.$runCommandRaw({ ping: 1 });
        response.json({
            status: 'ok',
            databaseConnected: true,
        });
    }
    catch (error) {
        console.error('Database health check failed:', error);
        response.status(503).json({
            status: 'error',
            databaseConnected: false,
            message: 'Cannot connect to the database. Please try again later.',
        });
    }
}));
app.post('/api/auth/register', asyncRoute(async (request, response) => {
    const input = z.object({ name: z.string().min(2), email: z.string().email(), password: z.string().min(8) }).parse(request.body);
    const password = await bcrypt.hash(input.password, 12);
    const user = await prisma.user.create({ data: { ...input, password } });
    const token = jwt.sign({ email: user.email, role: user.role }, jwtSecret, { subject: user.id, expiresIn: '7d' });
    response.status(201).json({ data: { user: { id: user.id, name: user.name, email: user.email, role: user.role, profileImage: user.profileImage, createdAt: user.createdAt }, token } });
}));
app.post('/api/auth/login', asyncRoute(async (request, response) => {
    const input = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1) }).parse(request.body);
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !(await bcrypt.compare(input.password, user.password))) {
        response.status(401).json({ message: 'Email or password was not recognized' });
        return;
    }
    const token = jwt.sign({ email: user.email, role: user.role }, jwtSecret, { subject: user.id, expiresIn: '7d' });
    response.json({ data: { user: { id: user.id, name: user.name, email: user.email, role: user.role, profileImage: user.profileImage, createdAt: user.createdAt }, token } });
}));
app.get('/api/auth/me', requireAuth, asyncRoute(async (request, response) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: request.authUser.id }, select: { id: true, name: true, email: true, role: true, profileImage: true, createdAt: true } });
    response.json({ data: user });
}));
app.patch('/api/users/me', requireAuth, asyncRoute(async (request, response) => {
    const input = z.object({ name: z.string().min(2).optional(), profileImage: z.string().url().nullable().optional() }).parse(request.body);
    const user = await prisma.user.update({ where: { id: request.authUser.id }, data: input, select: { id: true, name: true, email: true, role: true, profileImage: true, createdAt: true } });
    response.json({ data: user });
}));
app.get('/api/destinations', asyncRoute(async (request, response) => {
    const query = z.object({ search: z.string().optional(), province: z.string().optional(), category: z.string().optional(), sort: z.enum(['rating', 'cost']).optional() }).parse(request.query);
    const destinations = await prisma.destination.findMany({ where: { AND: [{ name: { contains: query.search, mode: 'insensitive' } }, { province: query.province }, { category: query.category }] }, orderBy: query.sort === 'rating' ? { rating: 'desc' } : query.sort === 'cost' ? { averageCost: 'asc' } : { name: 'asc' } });
    response.json({ data: destinations });
}));
app.get('/api/destinations/:id', asyncRoute(async (request, response) => response.json({ data: await prisma.destination.findUniqueOrThrow({ where: { id: idParam.parse(request.params.id) }, include: { hotels: true, activities: true } }) })));
app.post('/api/destinations', requireAuth, requireAdmin, asyncRoute(async (request, response) => response.status(201).json({ data: await prisma.destination.create({ data: destinationSchema.parse(request.body) }) })));
app.patch('/api/destinations/:id', requireAuth, requireAdmin, asyncRoute(async (request, response) => response.json({ data: await prisma.destination.update({ where: { id: idParam.parse(request.params.id) }, data: destinationSchema.partial().parse(request.body) }) })));
app.delete('/api/destinations/:id', requireAuth, requireAdmin, asyncRoute(async (request, response) => {
    const id = idParam.parse(request.params.id);
    try {
        const result = await prisma.$transaction(async (tx) => {
            const destination = await tx.destination.findUnique({
                where: { id },
                select: {
                    name: true,
                    _count: {
                        select: {
                            hotels: true,
                            activities: true,
                            tripItems: true,
                            packageItems: true,
                            reviews: true,
                        },
                    },
                },
            });
            if (!destination) {
                return {
                    status: 404,
                    message: 'Destination not found.',
                };
            }
            const wishlistItems = await tx.wishlist.count({
                where: {
                    kind: 'DESTINATION',
                    itemId: id,
                },
            });
            const linked = [
                {
                    label: 'hotels',
                    count: destination._count.hotels,
                },
                {
                    label: 'activities',
                    count: destination._count.activities,
                },
                {
                    label: 'trip stops',
                    count: destination._count.tripItems,
                },
                {
                    label: 'package links',
                    count: destination._count.packageItems,
                },
                {
                    label: 'reviews',
                    count: destination._count.reviews,
                },
                {
                    label: 'wishlist items',
                    count: wishlistItems,
                },
            ]
                .filter(item => item.count > 0)
                .map(item => item.label + ': ' + item.count);
            if (linked.length > 0) {
                return {
                    status: 409,
                    message: 'Cannot delete "' +
                        destination.name +
                        '". Linked records: ' +
                        linked.join(', ') +
                        '. Remove or reassign these links first.',
                };
            }
            await tx.destination.delete({
                where: { id },
            });
            return {
                status: 204,
                message: '',
            };
        });
        if (result.status === 204) {
            response.status(204).end();
            return;
        }
        response.status(result.status).json({
            message: result.message,
        });
    }
    catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2003' || error.code === 'P2014') {
                response.status(409).json({
                    message: 'This destination still has linked records. Remove or reassign those links before deleting it.',
                });
                return;
            }
            if (error.code === 'P2034') {
                response.status(409).json({
                    message: 'The data changed while deleting. Refresh the page and try again.',
                });
                return;
            }
        }
        throw error;
    }
}));
app.get('/api/hotels', asyncRoute(async (_request, response) => response.json({ data: await prisma.hotel.findMany({ include: { destination: true } }) })));
app.get('/api/hotels/:id', asyncRoute(async (request, response) => response.json({ data: await prisma.hotel.findUniqueOrThrow({ where: { id: idParam.parse(request.params.id) }, include: { destination: true, reviews: { include: { user: { select: { name: true } } } } } }) })));
app.post('/api/hotels', requireAuth, requireAdmin, asyncRoute(async (request, response) => response.status(201).json({ data: await prisma.hotel.create({ data: hotelSchema.parse(request.body) }) })));
app.patch('/api/hotels/:id', requireAuth, requireAdmin, asyncRoute(async (request, response) => response.json({ data: await prisma.hotel.update({ where: { id: idParam.parse(request.params.id) }, data: hotelSchema.partial().parse(request.body) }) })));
app.delete('/api/hotels/:id', requireAuth, requireAdmin, asyncRoute(async (request, response) => {
    const id = idParam.parse(request.params.id);
    try {
        const result = await prisma.$transaction(async (tx) => {
            const hotel = await tx.hotel.findUnique({
                where: { id },
                select: {
                    name: true,
                    _count: {
                        select: {
                            bookings: true,
                            reviews: true,
                        },
                    },
                },
            });
            if (!hotel) {
                return {
                    status: 404,
                    message: 'Hotel not found.',
                };
            }
            const wishlistItems = await tx.wishlist.count({
                where: {
                    kind: 'HOTEL',
                    itemId: id,
                },
            });
            const linked = [
                {
                    label: 'bookings',
                    count: hotel._count.bookings,
                },
                {
                    label: 'reviews',
                    count: hotel._count.reviews,
                },
                {
                    label: 'wishlist items',
                    count: wishlistItems,
                },
            ]
                .filter(item => item.count > 0)
                .map(item => item.label + ': ' + item.count);
            if (linked.length > 0) {
                return {
                    status: 409,
                    message: 'Cannot delete "' +
                        hotel.name +
                        '". Linked records: ' +
                        linked.join(', ') +
                        '. Remove or reassign these links first.',
                };
            }
            await tx.hotel.delete({
                where: { id },
            });
            return {
                status: 204,
                message: '',
            };
        });
        if (result.status === 204) {
            response.status(204).end();
            return;
        }
        response.status(result.status).json({
            message: result.message,
        });
    }
    catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2003' || error.code === 'P2014') {
                response.status(409).json({
                    message: 'This hotel still has linked records and cannot be deleted.',
                });
                return;
            }
            if (error.code === 'P2034') {
                response.status(409).json({
                    message: 'The data changed while deleting. Refresh the page and try again.',
                });
                return;
            }
        }
        throw error;
    }
}));
app.get('/api/activities', asyncRoute(async (_request, response) => response.json({ data: await prisma.activity.findMany({ include: { destination: true } }) })));
app.post('/api/activities', requireAuth, requireAdmin, asyncRoute(async (request, response) => response.status(201).json({ data: await prisma.activity.create({ data: activitySchema.parse(request.body) }) })));
app.patch('/api/activities/:id', requireAuth, requireAdmin, asyncRoute(async (request, response) => response.json({ data: await prisma.activity.update({ where: { id: idParam.parse(request.params.id) }, data: activitySchema.partial().parse(request.body) }) })));
app.delete('/api/activities/:id', requireAuth, requireAdmin, asyncRoute(async (request, response) => { await prisma.activity.delete({ where: { id: idParam.parse(request.params.id) } }); response.status(204).end(); }));
app.get('/api/packages', asyncRoute(async (_request, response) => response.json({ data: await prisma.tourPackage.findMany({ include: { destinations: { include: { destination: true }, orderBy: { order: 'asc' } } } }) })));
app.post('/api/packages', requireAuth, requireAdmin, asyncRoute(async (request, response) => {
    const input = packageSchema.parse(request.body);
    const tourPackage = await prisma.tourPackage.create({ data: { name: input.name, description: input.description, duration: input.duration, price: input.price, image: input.image, includedActivities: input.includedActivities, hotelInformation: input.hotelInformation, itinerary: input.itinerary, destinations: { create: input.destinationIds.map((destinationId, order) => ({ order, destination: { connect: { id: destinationId } } })) } }, include: { destinations: true } });
    response.status(201).json({ data: tourPackage });
}));
app.patch('/api/packages/:id', requireAuth, requireAdmin, asyncRoute(async (request, response) => {
    const input = packageSchema.partial().parse(request.body);
    const { destinationIds, ...fields } = input;
    const tourPackage = await prisma.tourPackage.update({ where: { id: idParam.parse(request.params.id) }, data: { ...fields, ...(destinationIds ? { destinations: { deleteMany: {}, create: destinationIds.map((destinationId, order) => ({ order, destination: { connect: { id: destinationId } } })) } } : {}) }, include: { destinations: true } });
    response.json({ data: tourPackage });
}));
app.delete('/api/packages/:id', requireAuth, requireAdmin, asyncRoute(async (request, response) => { await prisma.tourPackage.delete({ where: { id: idParam.parse(request.params.id) } }); response.status(204).end(); }));
app.get('/api/trips', requireAuth, asyncRoute(async (request, response) => response.json({ data: await prisma.trip.findMany({ where: { userId: request.authUser.id }, include: { destinations: { include: { destination: true }, orderBy: { order: 'asc' } } }, orderBy: { startDate: 'asc' } }) })));
app.post('/api/trips', requireAuth, asyncRoute(async (request, response) => {
    const input = z.object({ name: z.string().min(2), startDate: z.coerce.date(), endDate: z.coerce.date() }).refine(value => value.endDate >= value.startDate, 'End date must be on or after start date').parse(request.body);
    response.status(201).json({ data: await prisma.trip.create({ data: { ...input, userId: request.authUser.id } }) });
}));
app.delete('/api/trips/:id', requireAuth, asyncRoute(async (request, response) => { await prisma.trip.delete({ where: { id: idParam.parse(request.params.id), userId: request.authUser.id } }); response.status(204).end(); }));
app.post('/api/trips/:id/destinations', requireAuth, asyncRoute(async (request, response) => {
    const input = z.object({ destinationId: idParam, order: z.number().int().nonnegative().optional(), notes: z.string().max(500).optional() }).parse(request.body);
    const trip = await prisma.trip.findFirstOrThrow({ where: { id: idParam.parse(request.params.id), userId: request.authUser.id } });
    response.status(201).json({ data: await prisma.tripDestination.create({ data: { ...input, tripId: trip.id } }) });
}));
app.delete('/api/trips/:id/destinations/:destinationId', requireAuth, asyncRoute(async (request, response) => {
    const tripId = idParam.parse(request.params.id);
    const trip = await prisma.trip.findFirstOrThrow({ where: { id: tripId, userId: request.authUser.id } });
    await prisma.tripDestination.delete({ where: { tripId_destinationId: { tripId: trip.id, destinationId: idParam.parse(request.params.destinationId) } } });
    response.status(204).end();
}));
app.get('/api/wishlist', requireAuth, asyncRoute(async (request, response) => response.json({ data: await prisma.wishlist.findMany({ where: { userId: request.authUser.id }, orderBy: { createdAt: 'desc' } }) })));
app.post('/api/wishlist', requireAuth, asyncRoute(async (request, response) => {
    const input = z.object({ kind: z.enum(['DESTINATION', 'HOTEL', 'ACTIVITY', 'PACKAGE']), itemId: idParam }).parse(request.body);
    response.status(201).json({ data: await prisma.wishlist.create({ data: { ...input, userId: request.authUser.id } }) });
}));
app.delete('/api/wishlist/:id', requireAuth, asyncRoute(async (request, response) => { await prisma.wishlist.delete({ where: { id: idParam.parse(request.params.id), userId: request.authUser.id } }); response.status(204).end(); }));
app.get('/api/bookings', requireAuth, asyncRoute(async (request, response) => response.json({ data: await prisma.booking.findMany({ where: request.authUser.role === 'ADMIN' ? {} : { userId: request.authUser.id }, include: { hotel: true, tourPackage: true, user: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: 'desc' } }) })));
app.post('/api/bookings', requireAuth, asyncRoute(async (request, response) => {
    const input = z.object({ hotelId: idParam.optional(), packageId: idParam.optional(), checkIn: z.coerce.date(), checkOut: z.coerce.date(), guests: z.number().int().min(1).max(30), specialRequests: z.string().max(1000).optional() }).refine(value => Boolean(value.hotelId) !== Boolean(value.packageId), 'Choose exactly one hotel or package').refine(value => value.checkOut > value.checkIn, 'Check-out must be after check-in').parse(request.body);
    const nights = Math.ceil((input.checkOut.getTime() - input.checkIn.getTime()) / 86400000);
    const price = input.hotelId ? (await prisma.hotel.findUniqueOrThrow({ where: { id: input.hotelId } })).pricePerNight * nights : (await prisma.tourPackage.findUniqueOrThrow({ where: { id: input.packageId } })).price * input.guests;
    response.status(201).json({ data: await prisma.booking.create({ data: { ...input, totalPrice: price, userId: request.authUser.id } }) });
}));
app.patch('/api/bookings/:id/status', requireAuth, requireAdmin, asyncRoute(async (request, response) => {
    const { status } = z.object({ status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']) }).parse(request.body);
    response.json({ data: await prisma.booking.update({ where: { id: idParam.parse(request.params.id) }, data: { status } }) });
}));
app.patch('/api/bookings/:id/payment-status', requireAuth, requireAdmin, asyncRoute(async (request, response) => {
    const { paymentStatus } = z.object({ paymentStatus: z.enum(['UNPAID', 'PAID', 'REFUNDED']) }).parse(request.body);
    response.json({ data: await prisma.booking.update({ where: { id: idParam.parse(request.params.id) }, data: { paymentStatus } }) });
}));
app.post('/api/bookings/:id/cancel', requireAuth, asyncRoute(async (request, response) => {
    const id = idParam.parse(request.params.id);
    const booking = await prisma.booking.findFirstOrThrow({ where: { id, userId: request.authUser.id } });
    if (booking.status !== 'PENDING' && booking.status !== 'CONFIRMED') {
        response.status(409).json({ message: 'This booking can no longer be cancelled' });
        return;
    }
    response.json({ data: await prisma.booking.update({ where: { id }, data: { status: 'CANCELLED' } }) });
}));
app.get('/api/reviews/mine', requireAuth, asyncRoute(async (request, response) => response.json({ data: await prisma.review.findMany({ where: { userId: request.authUser.id }, orderBy: { createdAt: 'desc' } }) })));
app.get('/api/reviews', asyncRoute(async (request, response) => {
    const query = z.object({ destinationId: idParam.optional(), hotelId: idParam.optional(), activityId: idParam.optional(), packageId: idParam.optional() }).parse(request.query);
    response.json({ data: await prisma.review.findMany({ where: query, include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } }) });
}));
app.post('/api/reviews', requireAuth, asyncRoute(async (request, response) => {
    const input = z.object({ bookingId: idParam, hotelId: idParam.optional(), destinationId: idParam.optional(), activityId: idParam.optional(), packageId: idParam.optional(), rating: z.number().int().min(1).max(5), comment: z.string().min(10).max(1200) }).refine(value => [value.hotelId, value.destinationId, value.activityId, value.packageId].filter(Boolean).length === 1, 'Review exactly one item').parse(request.body);
    const booking = await prisma.booking.findFirstOrThrow({ where: { id: input.bookingId, userId: request.authUser.id, status: 'COMPLETED' } });
    if ((input.hotelId && input.hotelId !== booking.hotelId) || (input.packageId && input.packageId !== booking.packageId)) {
        response.status(400).json({ message: 'Review item must match the completed booking' });
        return;
    }
    if (await prisma.review.findFirst({ where: { userId: request.authUser.id, bookingId: booking.id } })) {
        response.status(409).json({ message: 'A review has already been submitted for this booking' });
        return;
    }
    const { bookingId, ...fields } = input;
    response.status(201).json({ data: await prisma.review.create({ data: { ...fields, bookingId, userId: request.authUser.id } }) });
}));
app.get('/api/dashboard', requireAuth, asyncRoute(async (request, response) => {
    const userId = request.authUser.id;
    const [trips, bookings, wishlistCount, reviews, upcomingBookings] = await Promise.all([
        prisma.trip.findMany({ where: { userId }, include: { destinations: { include: { destination: true }, orderBy: { order: 'asc' } } }, orderBy: { startDate: 'asc' } }),
        prisma.booking.findMany({ where: { userId }, include: { hotel: true, tourPackage: true }, orderBy: { createdAt: 'desc' }, take: 8 }),
        prisma.wishlist.count({ where: { userId } }),
        prisma.review.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 8 }),
        prisma.booking.findMany({ where: { userId, checkIn: { gte: new Date() }, status: { in: ['PENDING', 'CONFIRMED'] } }, orderBy: { checkIn: 'asc' }, take: 5 }),
    ]);
    response.json({ data: { trips, bookings, wishlistCount, reviews, upcomingBookings } });
}));
app.get('/api/admin/stats', requireAuth, requireAdmin, asyncRoute(async (_request, response) => {
    const [users, destinations, hotels, activities, packages, bookings, recentBookings, recentUsers] = await Promise.all([
        prisma.user.count(), prisma.destination.count(), prisma.hotel.count(), prisma.activity.count(), prisma.tourPackage.count(), prisma.booking.count(),
        prisma.booking.findMany({ include: { user: { select: { name: true, email: true } }, hotel: true, tourPackage: true }, orderBy: { createdAt: 'desc' }, take: 8 }),
        prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 8 }),
    ]);
    const revenue = await prisma.booking.aggregate({ where: { status: { in: ['CONFIRMED', 'COMPLETED'] } }, _sum: { totalPrice: true } });
    response.json({ data: { users, destinations, hotels, activities, packages, bookings, revenue: revenue._sum.totalPrice ?? 0, recentBookings, recentUsers } });
}));
app.get('/api/admin/users', requireAuth, requireAdmin, asyncRoute(async (request, response) => {
    const search = z.string().optional().parse(request.query.search);
    response.json({ data: await prisma.user.findMany({ where: search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] } : {}, select: { id: true, name: true, email: true, role: true, createdAt: true }, orderBy: { createdAt: 'desc' } }) });
}));
app.patch('/api/admin/users/:id/role', requireAuth, requireAdmin, asyncRoute(async (request, response) => {
    const { role } = z.object({ role: z.enum(['USER', 'ADMIN']) }).parse(request.body);
    response.json({ data: await prisma.user.update({ where: { id: idParam.parse(request.params.id) }, data: { role }, select: { id: true, name: true, email: true, role: true } }) });
}));
app.delete('/api/admin/users/:id', requireAuth, requireAdmin, asyncRoute(async (request, response) => { await prisma.user.delete({ where: { id: idParam.parse(request.params.id) } }); response.status(204).end(); }));
app.use(respondError);
app.listen(port, () => console.info(`TravelMate API listening on http://localhost:${port}`));
process.on('beforeExit', async () => prisma.$disconnect());
