# Frontend Guide

The frontend is grouped by responsibility under `src/`.

## Components

- `components/layout/`: shared navigation and footer.
- `components/home/`: homepage hero banner.
- `components/pages/MainPage.vue`: homepage sections and travel search.
- `components/pages/catalog/`: destination, hotel, activity, package listings and detail views.
- `components/pages/trips/`: trip planner and itinerary timeline.
- `components/pages/bookings/`: booking form and booking history.
- `components/pages/dashboard/`: user dashboard.
- `components/pages/admin/`: admin dashboard and statistics.
- `components/pages/auth/`: account landing and authentication dialog.
- `components/pages/WishlistPage.vue`: saved destinations, hotels, activities, and packages.
- `components/feedback/`: toast notification and trip-planner shortcut.

## Shared Frontend Code

- `App.vue`: app shell, route selection, shared state, and global dialogs.
- `context/appPageContext.ts`: typed state/actions provided to page components.
- `stores/travel.ts`: Pinia user, wishlist, trip, and booking state.
- `data.ts`: typed local demo catalogue and review content.
- `services/api.ts`: Axios client and authentication API calls.
- `router.ts`: routes and admin access guard.
- `style.css`: global design tokens, shared component styles, and responsive rules.
