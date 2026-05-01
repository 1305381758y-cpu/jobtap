# Module C Design

## Scope

Module C provides JobTap's backend foundation: mobile APIs, employer job intake, authenticated admin APIs, job review and publishing, job management, and analytics ingestion with statistics grouped by country and job.

## Architecture

The backend is a NestJS application with TypeORM entities that target PostgreSQL in production. Local automated tests run against SQLite in memory through the same TypeORM repositories so service and controller behavior can be verified without a local PostgreSQL server.

The MVP exposes JSON APIs only. The admin console is represented by authenticated admin endpoints that a web console can consume; a dedicated admin frontend can be added after the API contracts stabilize.

## Main Units

- `JobsModule` owns job validation, employer intake, admin creation, review transitions, mobile visibility, filtering, and detail lookup.
- `AuthModule` owns admin login, password hashing, JWT issuance, and request guards.
- `AnalyticsModule` owns event ingestion and aggregate statistics for active users, detail views, contact clicks, and click rate.
- TypeORM entities define the PostgreSQL schema for `jobs`, `admin_users`, and `analytics_events`.

## Data Rules

Jobs use the MVP statuses `draft`, `pending`, `approved`, `rejected`, and `removed`. Employer submissions always enter `pending`; admin-created jobs can be `approved` or `draft`. Mobile APIs only return `approved` jobs and enforce country filtering.

Analytics statistics are grouped by `countryCode + jobId`. Detail views and contact clicks are deduplicated by `countryCode + jobId + deviceId`; active users are deduplicated by `countryCode + deviceId`.

## Security

Admin APIs require a bearer JWT. The first local admin is bootstrapped from `ADMIN_EMAIL` and `ADMIN_PASSWORD` if no admin user exists. Production deployments must override those values and use HTTPS at the platform layer.

## Testing

End-to-end tests verify employer intake, admin login, approval, mobile visibility, analytics deduplication, and statistics output. Tests use the real NestJS HTTP stack and TypeORM repositories.
