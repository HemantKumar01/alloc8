## Installation And Usage

Inside the client folder -

```bash
npm install
```

and run

```bash
npm run dev
```

## Static allocation results

The frontend bundles the repository-root `alloc8.students.csv` directly with Vite.
Update that CSV and rebuild/redeploy the client to publish new allocation data.
The CSV must be included in the checkout used to build the client.

Microsoft sign-in identifies the student's roll number. After sign-in, students go
directly to `/success`; old booking, registration and SMP links redirect there too.
All visitors can open the frontend without a URL passcode. No Alloc8 backend, database, or
`VITE_SERVER_URL` is needed for this flow. Microsoft authentication still requires
the Azure client/tenant configuration and internet access.

Results use the CSV's name, room and occupancy. Roommates are other students with
the same room ID; blank occupancy is derived from the number of occupants in the
CSV. A room assignment is displayed even if the `allocated` flag is blank.
Missing students or room assignments show an unavailable message without a booking
redirect. PDF downloads use the same displayed data.

The CSV is bundled into public frontend assets, so its contents are downloadable
by visitors. Client-side sign-in does not make those assets private.

Run allocation checks with `node --test src/lib/studentAllocations.test.mjs`.
