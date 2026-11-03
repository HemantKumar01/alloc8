## Installation And Usage

```bash
npm install
```

Create `.env` file with mongodb db url (`<connectionString>/<dbName>` if you're using mongodb local install)
then run

to run redis
```bash
#install
docker run -d --name redis-stack -p 6379:6379 -p 8001:8001 redis/redis-stack:latest
# connect
docker exec -it redis-stack redis-cli
```

```bash
npx prisma generate
```

Whenever you update your Prisma schema, you will need to run

```bash
npx prisma db push
```

Run `npx prisma db seed` only when intentionally initializing room inventory.
It is not needed for logging or timestamp schema updates.

then

```bash
npm start
```

## Booking time

Every new booking saves `students.bookingTimestampIST`, for example
`2026-11-03 15:35:09.000 IST`, using the server clock in `Asia/Kolkata`.
The room update and student allocation commit together in one MongoDB
transaction. Existing bookings retain a null or missing timestamp because
their original booking time is unknown. The `allocated-details` response
includes `bookingTimestampIST`.

Form event tracking and request audit logging have been removed. Deploy the
frontend and backend together to stop browser telemetry requests. Regenerate
the Prisma client with `npx prisma generate`, then restart the backend.
No database migration or reseeding is needed for this removal; existing log
records are left untouched.

Run the backend and shared checks with:

```bash
node --experimental-test-module-mocks --test controller/nonfresherController.test.js lib/bookingTimestamp.test.js ../shared/roomSelection.test.mjs
```
