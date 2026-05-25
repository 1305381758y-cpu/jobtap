# JobTap Module C Deployment

## Environment

Required when `NODE_ENV=production`:

- `DATABASE_URL`
- `JWT_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

Recommended:

- `ADMIN_FRONTEND_ORIGINS`
- `ANALYTICS_RATE_LIMIT_PER_MINUTE`
- `TYPEORM_SYNCHRONIZE=false`

## Migrate

```bash
npm ci
npm run build
npm run migration:run
```

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

`frontend/vercel.json` rewrites non-API paths to `index.html`, so `/submit` and refreshed admin routes load the SPA.

## Admin Bootstrap

On first startup with an empty `admin_users` table, the backend creates the owner account from:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

## Rollback

1. Stop the web service.
2. Restore the previous container image or commit.
3. Run `npm run migration:revert` only if the failed release introduced a migration that must be reversed.
4. Start the previous service version.

## Health Check

```text
GET /health
```
