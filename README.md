# TravelMate

TravelMate is a responsive travel and tourism management platform built around Sri Lanka travel. The frontend can be explored immediately in browser-based demo mode. An Express REST API and Prisma/MongoDB data layer are included for accounts and persistent travel workflows.

## Project Folders

- `frontend/`: Vue 3, TypeScript, Vite, Tailwind CSS, routes, stores and UI assets.
- `backend/`: Express REST API and server TypeScript configuration.
- `database/`: Prisma MongoDB schema and seed data.
- Root: shared npm dependencies, environment configuration and project scripts.

## Stack

- Vue 3, TypeScript, Vite, Tailwind CSS 4, Vue Router, Pinia, Axios
- Node.js, Express, TypeScript, Zod, JWT, bcryptjs
- Prisma ORM with MongoDB

The technology section specified MongoDB while the later database example mentioned MySQL. This project follows MongoDB to stay consistent with the requested Prisma + MongoDB stack. MongoDB uses ObjectId relations; explicit join models represent ordered trip stops and package destinations.

## Run The Demo

1. Install Node.js 20.19+ or 22.12+ and npm.
2. From the project root, run `npm install`.
3. Run `npm run dev:client` and open the Vite URL printed in the terminal.

The demo catalog, trips, wishlist, and bookings are stored in local browser storage. Sign-in uses the demo form. Select **Use local admin demo** to view the separate admin dashboard. This demo login is for coursework demonstrations only and is not a production authentication mechanism.

## Run The API And Database

1. Install MongoDB locally or create a MongoDB Atlas database.
2. Copy the root `.env.example` to `.env`; set `DATABASE_URL` and a long random `JWT_SECRET`.
3. Change `ADMIN_PASSWORD` before seeding. The seed script creates or updates the configured admin user.
4. Run `npm run db:generate`, `npm run db:push`, and `npm run db:seed`.
5. Run `npm run dev` to start Vite and the Express API together. Vite proxies `/api` requests to port 4000.

The default development seed account is `admin@travelmate.local`; its password comes from `ADMIN_PASSWORD` in `.env` (the sample value is deliberately development-only). The API reports database configuration at `GET /api/health`. Once the database is configured, the sign-in/register form uses the API and saves its JWT in browser storage.

## Commands

- `npm run dev:client`: Start Vite from `frontend/`.
- `npm run dev:server`: Start Express from `backend/`.
- `npm run dev`: Start the Vite client and Express API together.
- `npm run build`: Type-check/build the client and compile the server.
- `npm run db:generate`: Generate Prisma Client from `database/schema.prisma`.
- `npm run db:push`: Apply `database/schema.prisma` to MongoDB.
- `npm run db:seed`: Run `database/seed.ts` to create/update sample data.

## Included Workflows

- Browse, search, filter, sort and inspect destination, hotel, activity and tour-package listings.
- Save catalogue items, build multi-stop trips, submit hotel/package booking requests, and cancel eligible bookings.
- User dashboard, profile summary, itinerary view, booking history and recommendations.
- Protected admin overview with booking statistics, charts, user management endpoints and catalogue CRUD endpoints.
- JWT registration/login, hashed passwords, role authorization, request validation and typed REST response contracts.
- Five-day route: Colombo, Kandy, Ella, Yala and Galle.

The visual client currently includes local demo workflows and can connect to the API for authentication. Other REST resources are ready for client integration. Reviews must be associated with a completed booking; duplicate reviews for the same booking are rejected.
