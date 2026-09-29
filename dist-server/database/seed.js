import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const image = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1100&q=85`;
const destinationSeeds = [
    { key: 'ella', name: 'Ella', location: 'Badulla, Uva Province', province: 'Uva', category: 'Mountains', description: 'Misty tea hills, iconic railway journeys and slow mornings above the clouds.', image: image('photo-1544735716-392fe2489ffa'), bestTime: 'January – April', averageCost: 85, rating: 4.9, latitude: 6.8667, longitude: 81.0466 },
    { key: 'galle', name: 'Galle Fort', location: 'Galle, Southern Province', province: 'Southern', category: 'Culture', description: 'A living coastal fort where Dutch architecture meets the rhythm of the Indian Ocean.', image: image('photo-1533105079780-92b9be482077'), bestTime: 'December – April', averageCost: 110, rating: 4.8, latitude: 6.0328, longitude: 80.2168 },
    { key: 'sigiriya', name: 'Sigiriya', location: 'Matale, Central Province', province: 'Central', category: 'Heritage', description: 'Climb the ancient lion rock for frescoes, water gardens and a view worth the early start.', image: image('photo-1470770841072-f978cf4d019e'), bestTime: 'May – September', averageCost: 95, rating: 4.9, latitude: 7.957, longitude: 80.7603 },
    { key: 'mirissa', name: 'Mirissa', location: 'Matara, Southern Province', province: 'Southern', category: 'Beach', description: 'Palm-lined coves, blue-water mornings and seafood dinners that turn into long evenings.', image: image('photo-1519046904884-53103b34b206'), bestTime: 'November – April', averageCost: 75, rating: 4.7, latitude: 5.9483, longitude: 80.4716 },
    { key: 'kandy', name: 'Kandy', location: 'Kandy, Central Province', province: 'Central', category: 'Culture', description: 'A lakeside city of temple traditions, botanical gardens and highland hospitality.', image: image('photo-1609137144813-7d9921338f24'), bestTime: 'January – April', averageCost: 70, rating: 4.6, latitude: 7.2906, longitude: 80.6337 },
    { key: 'yala', name: 'Yala National Park', location: 'Hambantota, Southern Province', province: 'Southern', category: 'Wildlife', description: 'Track elephants and leopards through a landscape that shifts from jungle to open coast.', image: image('photo-1516426122078-c23e76319801'), bestTime: 'February – July', averageCost: 140, rating: 4.8, latitude: 6.3725, longitude: 81.5185 },
];
async function main() {
    const destinationIds = new Map();
    for (const destination of destinationSeeds) {
        const { key, ...data } = destination;
        const existing = await prisma.destination.findFirst({ where: { name: data.name } });
        const saved = existing
            ? await prisma.destination.update({ where: { id: existing.id }, data })
            : await prisma.destination.create({ data });
        destinationIds.set(key, saved.id);
    }
    const hotelSeeds = [
        { name: 'The Tea Garden House', location: 'Ella, Uva Province', description: 'A hillside hideaway with a long verandah, thoughtful local cooking and tea fields just beyond the garden.', image: image('photo-1445019980597-93fa8acb246c'), pricePerNight: 142, rating: 4.9, facilities: ['Breakfast', 'Pool', 'Mountain view', 'Free Wi-Fi'], destinationId: destinationIds.get('ella') },
        { name: 'Fort Bazaar', location: 'Galle Fort, Southern Province', description: 'An intimate restored townhouse on a quiet lane inside the historic fort walls.', image: image('photo-1566073771259-6a8506099945'), pricePerNight: 218, rating: 4.8, facilities: ['Restaurant', 'Spa', 'Free Wi-Fi', 'Air conditioning'], destinationId: destinationIds.get('galle') },
        { name: 'Wild Coast Tented Lodge', location: 'Yala, Southern Province', description: 'Canvas cocoon suites on the edge of the park, with the wild coastline on your doorstep.', image: image('photo-1520250497591-112f2f40a3f4'), pricePerNight: 390, rating: 4.9, facilities: ['All-inclusive', 'Pool', 'Safari', 'Beach'], destinationId: destinationIds.get('yala') },
    ];
    for (const hotel of hotelSeeds) {
        const existing = await prisma.hotel.findFirst({ where: { name: hotel.name } });
        if (existing)
            await prisma.hotel.update({ where: { id: existing.id }, data: hotel });
        else
            await prisma.hotel.create({ data: hotel });
    }
    const activitySeeds = [
        { name: 'The blue train to Ella', description: 'Settle into the open doorway and watch the highlands roll past, one tea valley at a time.', destinationId: destinationIds.get('ella'), category: 'Nature', price: 28, duration: '6 hours', image: image('photo-1474487548417-781cb71495f3'), rating: 4.9 },
        { name: 'Galle Fort at golden hour', description: 'Follow a local storyteller through the ramparts, old lanes and a favourite sunset lookout.', destinationId: destinationIds.get('galle'), category: 'Cultural', price: 32, duration: '2.5 hours', image: image('photo-1518509562904-e7ef99cdcc86'), rating: 4.8 },
        { name: 'Yala dawn safari', description: 'A small-group game drive through the park with an expert naturalist and picnic breakfast.', destinationId: destinationIds.get('yala'), category: 'Wildlife', price: 95, duration: '5 hours', image: image('photo-1549366021-9f761d450615'), rating: 4.8 },
    ];
    for (const activity of activitySeeds) {
        const existing = await prisma.activity.findFirst({ where: { name: activity.name } });
        if (existing)
            await prisma.activity.update({ where: { id: existing.id }, data: activity });
        else
            await prisma.activity.create({ data: activity });
    }
    const itinerary = [
        { day: 1, place: 'Colombo', detail: 'Arrive, unwind and take a relaxed introduction to the city.' },
        { day: 2, place: 'Kandy', detail: 'Visit the lakeside city and continue into the highlands.' },
        { day: 3, place: 'Ella', detail: 'Ride the legendary train and take a guided tea-country walk.' },
        { day: 4, place: 'Yala', detail: 'An early safari followed by a quiet evening by the coast.' },
        { day: 5, place: 'Galle', detail: 'Explore the fort before a final ocean-side lunch.' },
    ];
    const packageInput = { name: '5-Day Sri Lanka Adventure', description: 'A considered route from lively Colombo to hill-country trails, wild plains and the southern coast.', duration: '5 days · 4 nights', price: 890, image: image('photo-1500530855697-b586d89ba3ee'), includedActivities: ['Scenic train journey', 'Yala jeep safari', 'Galle Fort walking tour'], hotelInformation: 'Hand-picked boutique stays', itinerary };
    const existingPackage = await prisma.tourPackage.findFirst({ where: { name: packageInput.name } });
    const tourPackage = existingPackage
        ? await prisma.tourPackage.update({ where: { id: existingPackage.id }, data: packageInput })
        : await prisma.tourPackage.create({ data: packageInput });
    await prisma.packageDestination.deleteMany({ where: { packageId: tourPackage.id } });
    for (const [order, key] of ['kandy', 'ella', 'yala', 'galle'].entries()) {
        await prisma.packageDestination.create({ data: { packageId: tourPackage.id, destinationId: destinationIds.get(key), order } });
    }
    const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@travelmate.local';
    const adminPassword = process.env.ADMIN_PASSWORD ?? 'ChangeMe-TravelMate-2026';
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    await prisma.user.upsert({ where: { email: adminEmail }, update: { name: 'TravelMate Admin', password: hashedPassword, role: 'ADMIN' }, create: { name: 'TravelMate Admin', email: adminEmail, password: hashedPassword, role: 'ADMIN' } });
    console.info(`Seeded ${destinationSeeds.length} destinations, ${hotelSeeds.length} hotels, ${activitySeeds.length} activities, and one tour package.`);
}
main().catch(error => {
    console.error(error);
    process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
