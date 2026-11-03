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

## Room allocation logs and booking time

The authenticated `POST /api/nonfresher/form-logs` endpoint stores Hostel and
Room step views, selections, navigation, validation failures, and booking
submissions in the MongoDB `formLogs` collection. The backend also logs allocation
checks, room lookups, and booking request outcomes. Records contain the verified
roll number, batch, gender, session ID, event, step, safe selection details, a UTC
`createdAt`, and a server-generated `timestampIST`. Client events include a
sequence number for ordering within a session; duplicate retries are idempotent.
`source` distinguishes browser events from backend outcomes. Tokens and roommate
codes are excluded. Auxiliary logging failures do not block the form; browser
logs retry once, so events can be lost during a prolonged outage or page close.

Every new booking saves `students.bookingTimestampIST`, for example
`2026-11-03 15:35:09.000 IST`, using the server clock in `Asia/Kolkata`.
The student allocation, timestamp, and authoritative `booking_succeeded` log
commit together in one MongoDB transaction. Existing bookings retain a null or
missing timestamp because their original booking time is unknown. The
`allocated-details` response includes `bookingTimestampIST`.

Apply the additive schema and indexes with `npx prisma db push`, regenerate the
client with `npx prisma generate`, then restart the backend. Do not reseed rooms.

Run the backend and shared checks with:

```bash
node --experimental-test-module-mocks --test controller/nonfresherController.test.js lib/formLogging.test.js ../shared/roomSelection.test.mjs
```
