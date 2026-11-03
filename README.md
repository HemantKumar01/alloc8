# room-allocation

## Client : React + Tailwind

Register an application at Microsoft Azure Portal and put the configuration at client/src/authConfig.js
To run a development server at http://localhost:5173/:

```sh
cd client/
npm install
npm run dev
```

Open the frontend with `?pass=DkMkC` (for example, `http://localhost:5173/?pass=DkMkC`). Every route requires this case-sensitive URL parameter; internal navigation preserves it. This frontend gate does not replace backend authentication.

Deploy with:

```sh
cd client/
netlify deploy --prod
```

## Backend : Express

Create a `server/.env` file containing the following:
```sh
DATABASE_URL="mongodb+srv://<username>:<password>@<connection_url>/<database_name>"
AUDIENCE="<application_id>"
```

To run a development server at http://localhost:8800/:

```sh
cd server/
npm install
npm run start
```

Deploy with:

```sh
cd server/
pm2 start index.js
```

## DB : Prisma

After changes to the schema:
```sh
npx prisma generate
```


## NGINX Config for deploying server
```
limit_req_zone $binary_remote_addr zone=ip:10m rate=5r/s;

server {
    http2 on;
    server_name api.alloc8.in;
    location / {
            limit_req zone=ip burst=12 delay=8;
            proxy_pass http://localhost:8500;
    }
}
```

## .env for deploying client
```
VITE_SERVER_URL="https://api.alloc8.in"
```

## TBD
- Send room booking updates with server-sent events - A pub-sub/observer system with a mutex should work. Ensure that the server is applying gzip compression on the SSE stream. Look into lock-free and wait-free algorithms as well.
- Use HTTP caching on the server. Provide Cache-Control, ETag, and Last-Modified response headers for all endpoints.
- Add the option to withdraw your allocation.
- Improve error handling in client as well as server.
- Improve logging in server - make sure to add timestamps for 2026.
- Rewrite the server in golang using gin and go-swagger.
- Migrate to swr, tanstack router with automatic code splitting and typescript on the client.
- Add documentation and tests for each API route.
- Add Logout button
- Check if anubis should be used.
- Look into other architectures for allocation. Here is an example based on the JoSAA allocation process - everyone enters their preference list for allocation and after everyone is done, the process starts. Things like roommates wanting to be together and people belonging to 3 separate rooms also need to be considered. A distributed ledger should be used.
