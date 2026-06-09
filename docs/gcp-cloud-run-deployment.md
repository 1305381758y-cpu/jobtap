# JobTap GCP Cloud Run Deployment

This guide describes the intended production deployment on Google Cloud Platform
using Cloud Run, Cloud SQL for PostgreSQL, Artifact Registry, Secret Manager, and
Cloud Run Jobs for migrations.

Do not paste secrets into this file. Store production secrets in Secret Manager.

## Current GCP Project

- Project ID: `strange-cosmos-493111-n4`
- Intended API domain: `api.jobtap.work`
- Recommended region: `asia-southeast1`

As of the latest production audit, the project has the required Cloud Run, Cloud
Build, Artifact Registry, Secret Manager, Cloud SQL Admin, and IAM Credentials
APIs enabled. The production path also has a Cloud SQL PostgreSQL instance,
Secret Manager entries, a migration Cloud Run Job, and the `jobtap-api` Cloud Run
service in place.

## Required GCP Resources

### APIs

Enable these APIs before deployment:

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  sqladmin.googleapis.com \
  iamcredentials.googleapis.com \
  --project=strange-cosmos-493111-n4
```

### Artifact Registry

Create one Docker repository for JobTap images:

```bash
gcloud artifacts repositories create jobtap \
  --repository-format=docker \
  --location=asia-southeast1 \
  --description="JobTap container images" \
  --project=strange-cosmos-493111-n4
```

### Cloud SQL PostgreSQL

Create one PostgreSQL instance and database:

```bash
gcloud sql instances create jobtap-postgres \
  --database-version=POSTGRES_16 \
  --edition=ENTERPRISE \
  --region=asia-southeast1 \
  --tier=db-f1-micro \
  --storage-size=10GB \
  --storage-auto-increase \
  --backup-start-time=18:00 \
  --project=strange-cosmos-493111-n4

gcloud sql databases create jobtap \
  --instance=jobtap-postgres \
  --project=strange-cosmos-493111-n4

gcloud sql users create jobtap \
  --instance=jobtap-postgres \
  --password="<generated-db-password>" \
  --project=strange-cosmos-493111-n4
```

Record the instance connection name:

```bash
gcloud sql instances describe jobtap-postgres \
  --project=strange-cosmos-493111-n4 \
  --format='value(connectionName)'
```

Expected shape:

```text
strange-cosmos-493111-n4:asia-southeast1:jobtap-postgres
```

### Secret Manager

Required production configuration:

- `DATABASE_URL`
- `JWT_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_FRONTEND_ORIGINS`
- `TYPEORM_SYNCHRONIZE=false`

Recommended secret names:

```text
jobtap-database-url
jobtap-jwt-secret
jobtap-admin-email
jobtap-admin-password
jobtap-admin-frontend-origins
```

For Cloud Run + Cloud SQL Unix socket, use a DATABASE_URL shaped like this:

```text
postgresql://jobtap:<url-encoded-password>@/jobtap?host=/cloudsql/<INSTANCE_CONNECTION_NAME>
```

Example, with placeholders only:

```text
postgresql://jobtap:<password>@/jobtap?host=/cloudsql/strange-cosmos-493111-n4:asia-southeast1:jobtap-postgres
```

If the password contains special characters, URL-encode it before writing the
secret.

Create secrets:

```bash
printf '%s' '<database-url>' | gcloud secrets create jobtap-database-url \
  --data-file=- --project=strange-cosmos-493111-n4

openssl rand -hex 64 | gcloud secrets create jobtap-jwt-secret \
  --data-file=- --project=strange-cosmos-493111-n4

printf '%s' '<admin-email>' | gcloud secrets create jobtap-admin-email \
  --data-file=- --project=strange-cosmos-493111-n4

printf '%s' '<admin-password>' | gcloud secrets create jobtap-admin-password \
  --data-file=- --project=strange-cosmos-493111-n4

printf '%s' 'https://api.jobtap.work' | gcloud secrets create jobtap-admin-frontend-origins \
  --data-file=- --project=strange-cosmos-493111-n4
```

If the admin console is hosted on a separate domain, use that origin instead, for
example `https://admin.jobtap.work`. For multiple origins, comma-separate them.

## Build And Push Image

```bash
IMAGE="asia-southeast1-docker.pkg.dev/strange-cosmos-493111-n4/jobtap/jobtap-api:$(git rev-parse --short HEAD)"

gcloud builds submit \
  --tag="$IMAGE" \
  --project=strange-cosmos-493111-n4
```

This uses Cloud Build and does not depend on local Docker or Colima working.

## Run Database Migrations

Run migrations before shifting traffic to the new service. Use a Cloud Run Job so
schema changes are explicit and auditable.

```bash
INSTANCE_CONNECTION_NAME="strange-cosmos-493111-n4:asia-southeast1:jobtap-postgres"
IMAGE="asia-southeast1-docker.pkg.dev/strange-cosmos-493111-n4/jobtap/jobtap-api:<tag>"

gcloud run jobs create jobtap-migrate \
  --image="$IMAGE" \
  --region=asia-southeast1 \
  --project=strange-cosmos-493111-n4 \
  --set-cloudsql-instances="$INSTANCE_CONNECTION_NAME" \
  --set-env-vars=NODE_ENV=production,TYPEORM_SYNCHRONIZE=false \
  --set-secrets=DATABASE_URL=jobtap-database-url:latest,JWT_SECRET=jobtap-jwt-secret:latest,ADMIN_EMAIL=jobtap-admin-email:latest,ADMIN_PASSWORD=jobtap-admin-password:latest,ADMIN_FRONTEND_ORIGINS=jobtap-admin-frontend-origins:latest \
  --command=npm \
  --args=run,migration:run:prod

gcloud run jobs execute jobtap-migrate \
  --region=asia-southeast1 \
  --project=strange-cosmos-493111-n4 \
  --wait
```

For subsequent releases, update the job image and execute it again:

```bash
gcloud run jobs update jobtap-migrate \
  --image="$IMAGE" \
  --region=asia-southeast1 \
  --project=strange-cosmos-493111-n4

gcloud run jobs execute jobtap-migrate \
  --region=asia-southeast1 \
  --project=strange-cosmos-493111-n4 \
  --wait
```

## Deploy Cloud Run Service

```bash
INSTANCE_CONNECTION_NAME="strange-cosmos-493111-n4:asia-southeast1:jobtap-postgres"
IMAGE="asia-southeast1-docker.pkg.dev/strange-cosmos-493111-n4/jobtap/jobtap-api:<tag>"

gcloud run deploy jobtap-api \
  --image="$IMAGE" \
  --region=asia-southeast1 \
  --project=strange-cosmos-493111-n4 \
  --platform=managed \
  --allow-unauthenticated \
  --add-cloudsql-instances="$INSTANCE_CONNECTION_NAME" \
  --set-env-vars=NODE_ENV=production,TYPEORM_SYNCHRONIZE=false,ANALYTICS_RATE_LIMIT_PER_MINUTE=60 \
  --set-secrets=DATABASE_URL=jobtap-database-url:latest,JWT_SECRET=jobtap-jwt-secret:latest,ADMIN_EMAIL=jobtap-admin-email:latest,ADMIN_PASSWORD=jobtap-admin-password:latest,ADMIN_FRONTEND_ORIGINS=jobtap-admin-frontend-origins:latest
```

Cloud Run injects the `PORT` environment variable. The NestJS app listens on
`process.env.PORT`, so no hard-coded container port is required.

## Verify Health

```bash
SERVICE_URL="$(gcloud run services describe jobtap-api \
  --region=asia-southeast1 \
  --project=strange-cosmos-493111-n4 \
  --format='value(status.url)')"

curl -fsS "$SERVICE_URL/health"
```

Expected result:

```json
{"status":"ok","service":"jobtap-module-c","database":"ok","timestamp":"..."}
```

`/health` returns `503` when the app is running but PostgreSQL is unavailable.

## Bind api.jobtap.work

Cloud Run custom domains require DNS ownership verification and DNS changes.
The Google account or service account creating the mapping must have
`jobtap.work` verified in Google Search Console / Webmaster Central first.

```bash
gcloud beta run domain-mappings create \
  --service=jobtap-api \
  --domain=api.jobtap.work \
  --region=asia-southeast1 \
  --project=strange-cosmos-493111-n4

gcloud beta run domain-mappings describe --domain=api.jobtap.work \
  --region=asia-southeast1 \
  --project=strange-cosmos-493111-n4
```

After creation, Google returns DNS records. Add those records in the DNS provider
for `jobtap.work`, then wait for certificate provisioning.

For the current `api.jobtap.work` mapping, the expected DNS record is:

```text
api CNAME ghs.googlehosted.com.
```

Remove conflicting `A` or `AAAA` records for `api.jobtap.work`. The domain is
not production-ready just because the CNAME exists; the Google-managed
certificate must finish provisioning and `/health` must return HTTP 200 over
HTTPS.

Final verification:

```bash
curl -fsS https://api.jobtap.work/health
```

## Production Checklist

Do not consider backend production-ready until all items pass:

- Cloud SQL Admin API is enabled.
- Cloud SQL PostgreSQL instance exists with automated backups enabled.
- Secret Manager contains all required production env values.
- `TYPEORM_SYNCHRONIZE=false` is set on the migration job and service.
- Cloud Build successfully builds the Docker image.
- Cloud Run Job `jobtap-migrate` completes successfully.
- Cloud Run service `jobtap-api` deploys with the Cloud SQL instance attached.
- Cloud Run default URL returns `200` from `/health`.
- `api.jobtap.work` is mapped to Cloud Run and returns `200` from `/health`.
- Admin login works with the configured `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
- Mobile endpoints can read approved jobs from the production database.
