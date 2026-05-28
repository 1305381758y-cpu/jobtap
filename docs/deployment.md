# JobTap Module C Deployment

## Environment

Required when `NODE_ENV=production`:

- `DATABASE_URL`
- `JWT_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

Recommended:

- `ADMIN_FRONTEND_ORIGINS` — comma-separated list of allowed origins for the
  admin console. If omitted, cross-origin browser requests to admin APIs are
  denied; the backend-served admin console still works as a same-origin app.
  The public mobile and employer APIs remain intentionally CORS-open.
- `ANALYTICS_RATE_LIMIT_PER_MINUTE` — max analytics events a single device
  can submit per minute. Default is `60`.
- `TYPEORM_SYNCHRONIZE=false`

## Migrate

Local/source checkout:

```bash
npm ci
npm run build
npm run migration:run
```

Production Docker image:

```bash
npm run migration:run:prod
```

`render.yaml` runs the production migration command as a Render pre-deploy
command before the web service starts.

## Start

```bash
NODE_ENV=production npm start
```

Docker:

```bash
docker build -t jobtap-module-c .
docker run --env-file .env -p 3000:3000 jobtap-module-c
```

## Admin Console

The backend Docker image serves `frontend/dist` when present. For separate static hosting, build with:

```bash
VITE_API_BASE_URL=https://api.example.com npm --prefix frontend run build
```

Copy `frontend/.env.example` to the deployment platform's environment settings
and replace `VITE_API_BASE_URL` with the production API origin. Leave it empty
only when the backend serves `frontend/dist` from the same origin.

`frontend/vercel.json` rewrites non-API paths to `index.html`, so `/submit` and refreshed admin routes load the SPA.

## Admin Bootstrap

On first startup with an empty `admin_users` table, the backend creates the owner account from:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

## Rollback

1. Stop the web service.
2. Restore the previous container image or commit.
3. Run `npm run migration:revert` only if the failed release introduced a migration that must be reversed.
   In the production Docker image, use `npm run migration:revert:prod`.
4. Start the previous service version.

## Health Check

```text
GET /health
```

The endpoint returns `200` only when the service is running and the database responds to
`SELECT 1`; database failures return `503`.

## Admin Statistics

`GET /api/admin/statistics` aggregates analytics events by `countryCode` + `jobId`.

- `activeUsers` = country-level `COUNT(DISTINCT deviceId)` for the row's
  `countryCode`, including events without a `jobId`, such as `app_open` or
  `job_list_view`.
- `detailViews` = `COUNT(DISTINCT deviceId)` where `eventType = 'job_detail_view'`.
- `contactClicks` = `COUNT(DISTINCT deviceId)` where `eventType = 'contact_click'`
  and the same device has a `job_detail_view` for that `countryCode` + `jobId`.
- `contactClickRate` = `contactClicks / detailViews` (null when `detailViews` is 0).
