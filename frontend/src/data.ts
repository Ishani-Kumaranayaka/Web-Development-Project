import type { Activity, Destination, Hotel, Review, TourPackage } from './types'

const photo = (id: string, width = 1100) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=85`

export const destinations: Destination[] = [
  { id: 'ella', name: 'Ella', location: 'Badulla, Uva Province', province: 'Uva', category: 'Mountains', description: 'Misty tea hills, iconic railway journeys and slow mornings above the clouds.', image: photo('photo-1544735716-392fe2489ffa'), bestTime: 'January – April', averageCost: 85, rating: 4.9, latitude: 6.8667, longitude: 81.0466, tags: ['Scenic train', 'Tea country', 'Hiking'] },
  { id: 'galle', name: 'Galle Fort', location: 'Galle, Southern Province', province: 'Southern', category: 'Culture', description: 'A living coastal fort where Dutch architecture meets the rhythm of the Indian Ocean.', image: photo('photo-1533105079780-92b9be482077'), bestTime: 'December – April', averageCost: 110, rating: 4.8, latitude: 6.0328, longitude: 80.2168, tags: ['UNESCO', 'Coast', 'Heritage'] },
  { id: 'sigiriya', name: 'Sigiriya', location: 'Matale, Central Province', province: 'Central', category: 'Heritage', description: 'Climb the ancient lion rock for frescoes, water gardens and a view worth the early start.', image: photo('photo-1470770841072-f978cf4d019e'), bestTime: 'May – September', averageCost: 95, rating: 4.9, latitude: 7.957, longitude: 80.7603, tags: ['UNESCO', 'History', 'Wildlife'] },
  { id: 'mirissa', name: 'Mirissa', location: 'Matara, Southern Province', province: 'Southern', category: 'Beach', description: 'Palm-lined coves, blue-water mornings and seafood dinners that turn into long evenings.', image: photo('photo-1519046904884-53103b34b206'), bestTime: 'November – April', averageCost: 75, rating: 4.7, latitude: 5.9483, longitude: 80.4716, tags: ['Beach', 'Whales', 'Surf'] },
  { id: 'kandy', name: 'Kandy', location: 'Kandy, Central Province', province: 'Central', category: 'Culture', description: 'A lakeside city of temple traditions, botanical gardens and highland hospitality.', image: photo('photo-1609137144813-7d9921338f24'), bestTime: 'January – April', averageCost: 70, rating: 4.6, latitude: 7.2906, longitude: 80.6337, tags: ['Temple', 'Culture', 'Gardens'] },
  { id: 'yala', name: 'Yala National Park', location: 'Hambantota, Southern Province', province: 'Southern', category: 'Wildlife', description: 'Track elephants and leopards through a landscape that shifts from jungle to open coast.', image: photo('photo-1516426122078-c23e76319801'), bestTime: 'February – July', averageCost: 140, rating: 4.8, latitude: 6.3725, longitude: 81.5185, tags: ['Safari', 'Wildlife', 'Nature'] },
]

export const hotels: Hotel[] = [
  { id: 'tea-trails', name: 'The Tea Garden House', location: 'Ella, Uva Province', description: 'A hillside hideaway with a long verandah, thoughtful local cooking and tea fields just beyond the garden.', image: photo('photo-1445019980597-93fa8acb246c'), pricePerNight: 142, rating: 4.9, facilities: ['Breakfast', 'Pool', 'Mountain view', 'Free Wi-Fi'], destinationId: 'ella' },
  { id: 'fort-bazaar', name: 'Fort Bazaar', location: 'Galle Fort, Southern Province', description: 'An intimate restored townhouse on a quiet lane inside the historic fort walls.', image: photo('photo-1566073771259-6a8506099945'), pricePerNight: 218, rating: 4.8, facilities: ['Restaurant', 'Spa', 'Free Wi-Fi', 'Air conditioning'], destinationId: 'galle' },
  { id: 'wild-coast', name: 'Wild Coast Tented Lodge', location: 'Yala, Southern Province', description: 'Canvas cocoon suites on the edge of the park, with the wild coastline on your doorstep.', image: photo('photo-1520250497591-112f2f40a3f4'), pricePerNight: 390, rating: 4.9, facilities: ['All-inclusive', 'Pool', 'Safari', 'Beach'], destinationId: 'yala' },
]

export const activities: Activity[] = [
  { id: 'ella-train', name: 'The blue train to Ella', description: 'Settle into the open doorway and watch the highlands roll past, one tea valley at a time.', destinationId: 'ella', category: 'Nature', price: 28, duration: '6 hours', image: photo('photo-1474487548417-781cb71495f3'), rating: 4.9 },
  { id: 'galle-walk', name: 'Galle Fort at golden hour', description: 'Follow a local storyteller through the ramparts, old lanes and a favourite sunset lookout.', destinationId: 'galle', category: 'Cultural', price: 32, duration: '2.5 hours', image: photo('photo-1518509562904-e7ef99cdcc86'), rating: 4.8 },
  { id: 'yala-safari', name: 'Yala dawn safari', description: 'A small-group game drive through the park with an expert naturalist and picnic breakfast.', destinationId: 'yala', category: 'Wildlife', price: 95, duration: '5 hours', image: photo('photo-1549366021-9f761d450615'), rating: 4.8 },
]

export const packages: TourPackage[] = [
  { id: 'island-adventure', name: '5-Day Sri Lanka Adventure', description: 'A considered route from lively Colombo to hill-country trails, wild plains and the southern coast.', duration: '5 days · 4 nights', price: 890, image: photo('photo-1500530855697-b586d89ba3ee'), destinationIds: ['kandy', 'ella', 'yala', 'galle'], includedActivities: ['Scenic train journey', 'Yala jeep safari', 'Galle Fort walking tour'], hotel: 'Hand-picked boutique stays', itinerary: [
    { day: 1, place: 'Colombo', detail: 'Arrive, unwind and take a relaxed introduction to the city.' },
    { day: 2, place: 'Kandy', detail: 'Visit the lakeside city and continue into the highlands.' },
    { day: 3, place: 'Ella', detail: 'Ride the legendary train and take a guided tea-country walk.' },
    { day: 4, place: 'Yala', detail: 'An early safari followed by a quiet evening by the coast.' },
    { day: 5, place: 'Galle', detail: 'Explore the fort before a final ocean-side lunch.' },
  ] },
  { id: 'southern-slow', name: 'The Southern Slowdown', description: 'Four easy days of fort-town culture, hidden beaches and coastal dining.', duration: '4 days · 3 nights', price: 620, image: photo('photo-1530789253388-582c481c54b0'), destinationIds: ['galle', 'mirissa'], includedActivities: ['Fort walk', 'Whale watching', 'Cooking class'], hotel: 'Coastal design hotels', itinerary: [
    { day: 1, place: 'Galle', detail: 'Check in and wander the fort at your own pace.' },
    { day: 2, place: 'Galle', detail: 'A private heritage walk and long lunch by the sea.' },
    { day: 3, place: 'Mirissa', detail: 'Choose a beach morning or a whale-watching trip.' },
    { day: 4, place: 'Mirissa', detail: 'A slow breakfast and a final swim before departure.' },
  ] },
]

export const reviews: Review[] = [
  { id: 'r1', userId: 'guest1', userName: 'Amelia R.', itemId: 'island-adventure', itemType: 'package', rating: 5, comment: 'Every transfer and stay felt considered. Ella was the moment we still talk about.', createdAt: '2026-02-12' },
  { id: 'r2', userId: 'guest2', userName: 'Jonas K.', itemId: 'fort-bazaar', itemType: 'hotel', rating: 5, comment: 'A beautiful little refuge in the middle of the fort. The team made it feel personal.', createdAt: '2026-01-28' },
]