# Deployment guide

This application is a Next.js standalone service with Firebase Authentication,
Turso/libSQL, Drizzle migrations, and signed Cloudinary uploads. A deployment
is not complete until the target environment has passed staging workflow tests.

## Required configuration

Set the variables in `.env.example` through the deployment secret manager. The
following are mandatory for a real environment:

- Firebase client and Admin credentials, with Email/Password enabled.
- `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` for the intended database.
- `NEXT_PUBLIC_APP_URL` using the final HTTPS origin; invitation links are
  generated from this value.
- `CONFIG_ENV=staging` or `CONFIG_ENV=production` so readiness validates the
  intended provider boundary; CI should use `CONFIG_ENV=ci`.
- `APP_ENCRYPTION_SECRET` and `INTERNAL_JOB_SECRET`, each independently random
  and at least 32 characters.
- Cloudinary credentials for signed private document uploads.

Email/SMS/payment adapters must be selected and configured before enabling the
corresponding module. The application does not silently pretend that a provider
delivered a message or payment.

## Release sequence

1. Build and run the quality job from `.github/workflows/ci.yml`.
2. Apply migrations to a disposable or staging database and inspect the target
   with `npm run db:inspect`.
3. Deploy the immutable image or Next.js standalone artifact.
4. Run `GET /api/health/live` and `GET /api/health/ready` from the load balancer.
5. Exercise Firebase login, invitation acceptance, tenant switching, student
   enrollment, attendance correction, exam approval/publication, payment,
   refund, upload, encrypted integration configuration, bounded student import,
   and export flows with two isolated test organizations.
6. Enable production traffic only after the staging evidence is attached to the
   release record.

For Docker, build with `docker build -t school-erp:<commit> .` and run with the
secret manager injecting environment variables. The container listens on port
3000 and runs as the non-root `node` user. Run migrations as a separate release
job with the same database credentials; do not run schema changes from every
web replica on startup.

Deploy a separate worker or scheduler that calls the internal jobs endpoint
with `INTERNAL_JOB_SECRET`. It must poll conservatively, expose job failure
metrics, and alert on `dead_letter` rows. The current built-in handler covers
large student CSV imports; provider delivery and synchronization handlers must
be enabled only after their real adapters are configured.
The repository includes a minimal polling process for a worker service:
`npm run jobs:worker` with `JOB_WORKER_URL`, `INTERNAL_JOB_SECRET`, and an
optional `JOB_WORKER_INTERVAL_MS`.

Run `npm run check:config` and `npm run check:secrets` in the release job.
Configuration checks validate required core values without printing their
contents; the source scan intentionally excludes local `.env` files.
`/api/health/ready` also fails closed when core configuration is missing, and
production readiness additionally requires Firebase and Cloudinary values.

## Vercel

This repository deploys to Vercel as a standard Next.js app. Use the Vercel
project environment variables for the same secrets described above, and keep
the job worker and schema migrations outside the web deployment.

For production deployments, set `NEXT_PUBLIC_APP_URL` to the canonical HTTPS
domain you want in invitation links. Preview deployments can omit it; when
`VERCEL_ENV=preview`, invitation links and readiness checks fall back to the
Vercel preview host via `VERCEL_URL`.

Use Vercel for the web app and API routes only. Continue running migrations as
a separate release step and run `npm run jobs:worker` as a separate service or
scheduler.

## Rollback

Application rollback is safe only when the previous image understands the
already-applied schema. Review each migration for backward compatibility before
reverting an image. Do not use destructive SQL or `git reset` as a rollback.
Restore the database only through a verified provider backup procedure and
record the restore point, operator, and validation results.
