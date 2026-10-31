export function isDemoPaymentEnabled(env = process.env) {
    return env.DEMO_PAYMENTS_ENABLED === 'true' && env.NODE_ENV !== 'production';
}
// This endpoint simulates a payment. It never contacts a bank or accepts card data.
export function createDemoPaymentHandler(prisma, bookingInclude, enabled = isDemoPaymentEnabled) {
    return async (request, response, next) => {
        try {
            if (!enabled()) {
                response.status(403).json({ message: 'Demo payments are disabled.' });
                return;
            }
            const accountId = request.authUser?.id;
            if (!accountId) {
                response.status(401).json({ message: 'Authentication required' });
                return;
            }
            if (request.authUser?.role !== 'USER') {
                response.status(403).json({ message: 'Demo checkout is for traveller accounts.' });
                return;
            }
            const id = request.params.id;
            if (typeof id !== 'string' || !/^[a-f\d]{24}$/i.test(id)) {
                response.status(400).json({ message: 'Invalid booking identifier.' });
                return;
            }
            const existing = await prisma.booking.findFirst({
                where: { id, userId: accountId }, include: bookingInclude,
            });
            if (!existing) {
                response.status(404).json({ message: 'Booking not found.' });
                return;
            }
            if (!['PENDING', 'CONFIRMED'].includes(existing.status)) {
                response.status(409).json({ message: 'Only active bookings can use demo checkout.' });
                return;
            }
            if (existing.paymentStatus === 'DEMO_PAID') {
                response.json({ data: existing, message: 'Demo payment already recorded. No money was charged.' });
                return;
            }
            if (existing.paymentStatus !== 'UNPAID') {
                response.status(409).json({ message: 'This booking is already paid or refunded.' });
                return;
            }
            if (!Number.isFinite(existing.totalPrice) || existing.totalPrice <= 0) {
                response.status(409).json({ message: 'This booking does not have a payable total.' });
                return;
            }
            try {
                // Conditions also protect against changes after the initial read.
                const saved = await prisma.booking.update({
                    where: {
                        id, userId: accountId, paymentStatus: 'UNPAID',
                        status: { in: ['PENDING', 'CONFIRMED'] },
                    },
                    data: { paymentStatus: 'DEMO_PAID' },
                    include: bookingInclude,
                });
                response.json({ data: saved, message: 'Demo payment recorded. No money was charged.' });
            }
            catch (error) {
                if (typeof error !== 'object' || error === null || !('code' in error) || error.code !== 'P2025') {
                    throw error;
                }
                // A repeated request can safely return the previously saved demo result.
                const latest = await prisma.booking.findFirst({
                    where: { id, userId: accountId }, include: bookingInclude,
                });
                if (latest?.paymentStatus === 'DEMO_PAID' && ['PENDING', 'CONFIRMED'].includes(latest.status)) {
                    response.json({ data: latest, message: 'Demo payment already recorded. No money was charged.' });
                    return;
                }
                response.status(409).json({ message: 'The booking changed. Refresh your history and try again.' });
            }
        }
        catch (error) {
            next(error);
        }
    };
}
