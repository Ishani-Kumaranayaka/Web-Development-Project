TravelMate — Sri Lanka Travel Planner

TravelMate is a web application for exploring Sri Lankan destinations, hotels,
activities and tour packages, planning itineraries, and managing bookings.
The interface uses Sri Lankan rupees (LKR).

This README describes the version with the authentication, database booking,
admin dashboard and database catalogue updates applied.

Technology

Layer

Technologies

Frontend

Vue 3, TypeScript, Pinia, Vue Router, Vite, Tailwind CSS, Lucide icons

Backend

Express, TypeScript, Zod, JWT, bcryptjs

Database

MongoDB with Prisma

HTTP client

Axios

Features and storage

Feature

Current behaviour

Storage

Authentication

Register, sign in, restore a verified session and sign out; no automatic demo login

MongoDB accounts and a JWT stored in the browser

Destinations

Browse, search, filter, sort and view details; admins can create, edit and delete

MongoDB through the API

Hotels

Browse, search, sort and view details; admins can create and delete

MongoDB through the API

Activities and packages

Browse actual database records and view their details

MongoDB through the API

Hotel/package bookings

Create bookings, view personal history and cancel eligible bookings

MongoDB through the API

Admin dashboard

Load database totals and all bookings; search bookings and update booking/payment status

MongoDB through the API

Trip planner

Create itineraries, select destinations, activities and transport preferences

Browser storage under the signed-in account's key

Wishlist

Save and remove catalogue items

Browser storage under the signed-in account's key

Reviews

Personal review entries remain local; displayed sample reviews are not a live database review feed

Browser storage and sample data

Account changes clear the previous account's personal data from application
memory. Trips, wishlist items and local reviews do not synchronize between
browsers or devices. Bookings are loaded from the API, not restored from the
old browser booking cache.

Destination deletion checks linked hotels, activities, database trip stops,
package links, reviews and wishlist records. Hotel deletion checks bookings,
reviews and wishlist records. A blocked deletion returns an error and keeps the
record. Browser-only trip and wishlist references are not visible to these
backend checks.

Requirements

Node.js 22.12 or newer in a compatible supported release, with npm.

MongoDB Atlas, or a local MongoDB deployment configured as a replica set.
Prisma's MongoDB transactions require replica-set support; a standalone local
MongoDB instance is insufficient for transactional operations.

Network access from the backend computer to MongoDB.

Run all npm commands from the project root, beside package.json. The frontend
and backend share the root dependency installation.

First-time setup

1. Install dependencies

npm install

2. Create local environment configuration

If .env already exists, edit it instead of overwriting it. Otherwise, copy the
example in PowerShell:

Copy-Item .env.example .env

Example .env configuration for Atlas:

DATABASE_URL="mongodb+srv://<DB_USER>:<DB_PASSWORD>@<CLUSTER_HOST>/travelmate?retryWrites=true&w=majority"
JWT_SECRET="replace-with-a-long-random-secret"
API_PORT=4000
CLIENT_ORIGIN="http://localhost:5173"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="replace-with-a-strong-unique-password"
VITE_API_BASE_URL="/api"

Replace every placeholder. Use an Atlas database user's credentials, include
the database name, and URL-encode special characters in the connection-string
password. In Atlas Network Access, allow the backend computer's IP address.
The database user must have suitable access to the project database.

ADMIN_EMAIL and ADMIN_PASSWORD are read by the seed script to create or
update the development administrator. They do not automatically create an
administrator whenever the server starts.

Keep .env out of Git and public screenshots. Values prefixed VITE_ are
exposed to frontend code: never put database passwords or JWT secrets in them.
Restart the development servers after changing environment variables.

3. Generate Prisma Client and synchronize the schema

npm run db:generate
npm run db:push

Review the database target before running db:push. This project uses Prisma's
MongoDB connector and db push; it does not use SQL migration files.

4. Seed a new development database, if needed

Before seeding, review all price fields in database/seed.ts and enter the
intended LKR sample amounts. The older sample amounts were not converted by the
currency-formatting update. Set your own administrator credentials in .env.

For a new development database:

npm run db:seed

The seed creates/updates sample destinations, hotels, activities and a package.
It also recreates that package's destination links and creates/updates the
configured administrator, including their password and role. Do not rerun it
casually on an existing database containing changes you want to preserve.
If the database is already prepared, skip this step.

5. Start the application

npm run dev

Leave that terminal running. By default:

Frontend: http://localhost:5173

Backend health check: http://localhost:4000/api/health

Health check through the frontend development proxy:
http://localhost:5173/api/health

Use the frontend address printed by Vite if its port differs. The Vite
development configuration proxies /api to http://localhost:4000.
If you change the API port, update that proxy in frontend/vite.config.ts too.

A working database health response includes:

{"status":"ok","databaseConnected":true}

An HTTP 503 health response indicates a database connection problem; inspect
the backend terminal and local MongoDB configuration.

6. Sign in

Create a normal account through the registration form. For administrator
access, use the account configured by the development seed. There is no local
admin-demo checkbox or default signed-in user. API permissions are checked by
the backend as well as by the interface.

Commands

Command

Purpose

npm run dev

Start frontend and backend together

npm run dev:client

Start only the Vite development server

npm run dev:server

Start only the backend with file watching

npm run build

Type-check and build the frontend, then compile the backend

npm run build:client

Type-check and build only the frontend

npm run build:server

Compile only the backend

npm run preview

Preview the built frontend; the backend must run separately

npm run db:generate

Generate Prisma Client from the database schema

npm run db:push

Synchronize the Prisma schema with MongoDB

npm run db:seed

Create/update the development catalogue and administrator

npm run build finishes after producing output. It does not leave a server
running. Frontend output is in frontend/dist; backend output is in
dist-server. A production deployment also needs backend hosting,
environment configuration, frontend route fallback and API routing.

Project structure

Path

Purpose

frontend/src/App.vue

Shared page state, catalogue loading and booking coordination

frontend/src/components/

Layout, forms, pages and reusable components

frontend/src/stores/travel.ts

Session, personal browser data and database booking actions

frontend/src/services/api.ts

Authentication, booking and admin API helpers

frontend/src/services/catalog.ts

Reactive catalogue collections and catalogue API operations

frontend/src/context/appPageContext.ts

Typed shared page context

frontend/src/data.ts

Remaining sample content; not the source of bookable database listings

backend/server/index.ts

API routes, validation, authorization and Prisma queries

database/schema.prisma

MongoDB models, relations and enums

database/seed.ts

Development seed data and administrator setup

API overview

Routes use the /api prefix. Protected routes require
Authorization: Bearer <token>. Most data responses use { "data": ... };
errors provide a message, and successful deletions return HTTP 204.

Routes

Purpose

GET /health

Check backend/database connectivity

POST /auth/register, POST /auth/login, GET /auth/me

Account and session operations

GET /destinations, GET /hotels, GET /activities, GET /packages

Read catalogues

POST, PATCH, DELETE catalogue routes

Administrator catalogue operations

GET /bookings?scope=mine

Current account's bookings

GET /bookings?scope=all

All bookings; administrator only

POST /bookings

Create a hotel or package booking

POST /bookings/:id/cancel

Cancel an eligible booking belonging to the current account

PATCH /bookings/:id/status

Administrator booking-status update

PATCH /bookings/:id/payment-status

Administrator payment-status update

GET /admin/stats

Administrator database totals and paid booking revenue

Additional trip, wishlist, review and account-management endpoints exist in the
backend. Endpoint availability does not mean every endpoint is connected to
the current frontend; see the storage table above.

Booking rules and currency

A booking selects exactly one database hotel or package.

Check-out must be after check-in. Guest count is an integer from 1 to 30.

Special requests are optional, with a maximum of 1,000 characters.

The server calculates the total using current database prices: hotel price
per night multiplied by nights, or package price multiplied by guests.

A new booking starts as Pending and Unpaid. A user may cancel their own
Pending or Confirmed booking.

Payment status is maintained by an administrator. There is no payment gateway.

The paid revenue figure sums bookings marked Paid; it is not an independent
bank/payment-provider reconciliation.

Stored monetary values are treated as LKR. Formatting does not perform
exchange-rate conversion, and records do not have individual currency fields.

Updating catalogue prices does not reprice historical bookings. Review older
non-LKR amounts separately before relying on totals.

Planner estimates include destination daily costs and selected activities;
accommodation and transport fares are excluded.

Manual verification

Run npm run build first, then npm run dev. Build checks do not prove live
MongoDB persistence, authorization behaviour or mobile usability. Record the
actual results of these checks for the report and demonstration.

Check

Expected result

Registration/login/logout

New users are ordinary users; logout removes the JWT and clears personal state from memory

Account isolation

A second account does not display the first account's bookings, trips or wishlist

Destination CRUD

Admin changes remain after refresh and server restart

Linked destination deletion

Server blocks deletion, records remain, confirmation stays open with a useful error

Hotel deletion

Unlinked disposable hotel can be deleted; booked/linked hotel is protected

Catalogue data

Activities/packages match database records, and cards use actual record IDs

Hotel search/sort

Search count matches visible results; price/rating sorting changes order

Booking persistence

Hotel/package bookings reappear after refresh and restart; Atlas contains the corresponding records

Invalid booking

Missing selections, invalid dates and invalid guest counts are rejected

Cancellation

An eligible own booking becomes Cancelled and stays cancelled after refresh

Admin updates

Saved booking/payment statuses persist and dashboard figures refresh

Authorization

Signed-out users cannot use protected APIs; ordinary users cannot request all bookings or admin operations

Backend failure

Booking/deletion errors are visible and do not show a false success

Empty database

Home/dashboard render without undefined-record errors

Mobile layouts

Check 360px, 390px, 768px and desktop: menu, forms, modals, LKR prices and table scrolling

The project currently has no npm test script. No live database or device test
result is implied by this checklist.

Troubleshooting

Symptom

What to check

ERR_CONNECTION_REFUSED at localhost

Run npm run dev and keep the terminal open; building alone does not start servers

Frontend opens, API requests fail

Backend terminal, port 4000 and Vite /api proxy target

Database health returns 503

Connection string, database name, database-user credentials, Atlas IP access and replica-set support

Prisma Client errors after schema changes

Run npm run db:generate; review npm run db:push against the intended database

Admin sign-in fails

Confirm the account exists and has ADMIN role; seed environment variables alone do not create it

Deletion returns a linked-record error

Keep the destination/hotel; review the listed dependencies instead of bypassing the protection

Rupee values are unexpectedly small

Review the stored numeric amounts; an LKR label did not convert earlier sample values

PowerShell says y is not recognized

The terminal is already back at its prompt; enter your next npm command instead

Current limitations

Trips, wishlist and personal reviews remain browser-based; cross-device
persistence for those features requires further frontend API integration.

Hotel editing and activity/package management are not complete admin UI flows,
although corresponding backend routes exist.

No real payment processing, room-inventory enforcement or booking-availability
search is implemented.

Some marketing content and public review content remain sample material.

Mobile layouts and live database behaviour need verification on the target
computer before submission.