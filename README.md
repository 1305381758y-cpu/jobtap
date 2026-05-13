# JobTap Module C

NestJS backend for JobTap MVP Module C: mobile APIs, employer job intake, authenticated admin APIs, job review and publishing, and analytics aggregation.

## Stack

- NestJS 11
- TypeScript
- TypeORM
- PostgreSQL in production
- SQL.js in tests
- JWT admin authentication

## Setup

```bash
npm install
npm --prefix frontend install
cp .env.example .env
docker compose up -d postgres
npm run migration:run
npm run build
npm run admin:build
npm start
```

For local production-like runs, create a PostgreSQL database and set `DATABASE_URL` or the `POSTGRES_*` variables. `TYPEORM_SYNCHRONIZE=false` is the default expectation for production; enable it only for disposable local databases.

## Database

Local PostgreSQL is defined in `docker-compose.yml`. The initial production schema is in `src/database/migrations/20260430000000-InitialModuleCSchema.ts`.

```bash
docker compose up -d postgres
npm run migration:show
npm run migration:run
```

Migration generation uses the TypeORM data source at `src/database/data-source.ts`.

## Verification

```bash
npm test
npm run build
npm run admin:build
```

`npm run migration:show` and `npm run migration:run` require a running PostgreSQL instance. In this workspace they will fail with `ECONNREFUSED` until Docker or a local PostgreSQL service is available.

## API Surface

- `GET /api/mobile/bootstrap`
- `GET /api/mobile/jobs?countryCode=US&page=1`
- `GET /api/mobile/jobs/:id?countryCode=US`
- `POST /api/mobile/analytics/events`
- `POST /api/employer/jobs`
- `POST /api/admin/login`
- `GET /api/admin/jobs`
- `POST /api/admin/jobs`
- `GET /api/admin/jobs/:id`
- `PATCH /api/admin/jobs/:id`
- `POST /api/admin/jobs/:id/approve`
- `POST /api/admin/jobs/:id/reject`
- `POST /api/admin/jobs/:id/remove`
- `GET /api/admin/statistics`
- `GET /api/admin/users`
- `POST /api/admin/users`
- `PATCH /api/admin/users/:id`

Admin endpoints require `Authorization: Bearer <accessToken>` from `POST /api/admin/login`.

### Analytics Events

`POST /api/mobile/analytics/events` requires `eventSchemaVersion: 1`. The endpoint rejects suspicious device IDs and applies a basic per-device in-memory rate limit controlled by `ANALYTICS_RATE_LIMIT_PER_MINUTE`.

Admin statistics are aggregated in SQL with `COUNT DISTINCT` by `countryCode`, `jobId`, and `deviceId` instead of loading raw events into application memory.

### Admin Roles

Admin JWTs carry `owner` or `operator`. Both roles can use normal review and read workflows. Owner-only actions are:

- `POST /api/admin/users`
- `PATCH /api/admin/users/:id`
- `POST /api/admin/jobs/:id/remove`

## Admin Console

The React/Vite admin console lives in `frontend/`.

```bash
npm run start:dev
npm run admin:dev
```

Open `http://localhost:5173`. Vite proxies `/api` requests to the NestJS server at `http://localhost:3000`.
