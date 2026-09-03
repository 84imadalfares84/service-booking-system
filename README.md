# Service Booking API

REST API for a **Service Booking System**. Built with NestJS, TypeScript, Prisma, and PostgreSQL.

This project is a backend technical task: users register and log in, browse bookable services, create and cancel their own bookings, and admins manage services plus booking statuses.

## What it does

| Actor | Can do |
| --- | --- |
| Guest | Register, login |
| User | List/view services, create a booking, list own bookings, cancel own bookings |
| Admin | Everything a user can do, plus create/update/delete services, list all bookings, change booking status |

Users cannot see or cancel another person's bookings. Invalid booking status changes are rejected.

### Booking status flow

```
PENDING  → CONFIRMED → COMPLETED
   │            │
   └────────────┴──→ CANCELLED
```

- `PENDING` may become `CONFIRMED` or `CANCELLED`
- `CONFIRMED` may become `COMPLETED` or `CANCELLED`
- `CANCELLED` and `COMPLETED` are terminal

## API

Interactive docs: `http://localhost:43147/docs`

| Method | Path | Access |
| --- | --- | --- |
| `POST` | `/auth/register` | Public |
| `POST` | `/auth/login` | Public |
| `GET` | `/services` | Authenticated |
| `GET` | `/services/:id` | Authenticated |
| `POST` | `/services` | Admin |
| `PATCH` | `/services/:id` | Admin |
| `DELETE` | `/services/:id` | Admin |
| `POST` | `/bookings` | Authenticated user |
| `GET` | `/bookings/me` | Own bookings |
| `PATCH` | `/bookings/:id/cancel` | Own bookings |
| `GET` | `/admin/bookings` | Admin, supports `page`, `limit`, `status` |
| `PATCH` | `/admin/bookings/:id/status` | Admin |
| `GET` | `/health` | Public |

All authenticated routes expect:

```
Authorization: Bearer <accessToken>
```

## Run locally

Requires Node.js 20+ and PostgreSQL 16.

```bash
cp .env.example .env
docker compose up -d
npm install
npx prisma migrate deploy
npx prisma db seed
npm run start:dev
```

If you already have PostgreSQL, skip Docker and set `DATABASE_URL` in `.env`.

The API listens on **http://127.0.0.1:43147**.

### Seeded admin

- Email: `admin@booking.local`
- Password: `Admin12345!`

Sample services (`Haircut`, `Home Cleaning`, `Consultation`) are created by the seed as well.

### Example

```bash
# Register
curl -s http://127.0.0.1:43147/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Sara Ahmad","email":"sara@example.com","password":"Secret123"}'

# Login as admin
TOKEN=$(curl -s http://127.0.0.1:43147/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@booking.local","password":"Admin12345!"}' | jq -r .accessToken)

# List services
curl -s http://127.0.0.1:43147/services -H "Authorization: Bearer $TOKEN"
```

## Tests

```bash
npm test
npm run test:e2e
```

## Project layout

```
src/
  auth/         register, login, JWT strategy
  users/        user persistence
  services/     service catalog
  bookings/     user bookings + admin booking management
  common/       guards, filters, status-transition rules
  prisma/       Prisma client wrapper
prisma/         schema, migrations, seed
```

## Design notes

- Passwords are hashed with bcrypt. JWT payloads carry `sub`, `email`, and `role`.
- Register always creates a `USER`. Admins are seeded, not self-registered.
- Input is validated with `class-validator` (`whitelist` + `forbidNonWhitelisted`).
- A user can only read or cancel bookings they own. Other IDs return `404`.
- A service with existing bookings cannot be deleted; deactivate it with `PATCH` instead.
- Bookings can only be created for active services and a future `bookingDate`.
- PostgreSQL is the database (preferred by the task spec). MySQL would work with a Prisma provider change if required.
