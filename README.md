# School ERP

School ERP is a multi-tenant Next.js application for school operations. Firebase is the identity provider; Turso/libSQL is the server-side database; Drizzle owns the schema and migrations; Cloudinary handles signed uploads.

The audited first-build coverage, dedicated core workflows, and production rollout gates are tracked in [`docs/IMPLEMENTATION_STATUS.md`](docs/IMPLEMENTATION_STATUS.md).
The platform administrator slice and its setup procedure are tracked in [`docs/PLATFORM_ADMIN_IMPLEMENTATION.md`](docs/PLATFORM_ADMIN_IMPLEMENTATION.md).

## The important distinction

There are two different kinds of account:

- A Firebase identity is only an email/password login.
- A school profile is the database record that links that Firebase identity to an organization, campus, role, and permissions.

Both records are required. The **Create your school** flow creates them together and makes the first person a `super_admin`. Do not create a Firebase user manually and expect it to open the dashboard: an administrator must provision that user in the ERP database first.

## Prerequisites

- Node.js 20+ and npm
- A Firebase project with Email/Password sign-in enabled
- A Turso database and auth token for a real environment
- Cloudinary credentials for document uploads

Install dependencies:

```powershell
npm install
```

## Run the application

1. Copy the example file:

   ```powershell
   Copy-Item .env.example .env.local
   ```

2. Fill in the Firebase, Turso, Cloudinary, and secret values for the target environment.
3. Apply the schema before starting the app:

   ```powershell
   npm run db:migrate
   npm run dev
   ```

The application requires a configured database and Firebase identity provider. Missing configuration fails the relevant server operation instead of creating an in-memory account or silently discarding mutations.

## Web + Flutter / Fastify API

The web app remains Next.js as the frontend, and Flutter is a second client. The shared Fastify backend in `server/api` owns the versioned API contracts, authorization and business mutations; Flutter implementation and device validation remain the external client gate. The migration rules and endpoint inventory are documented in [`docs/FLUTTER_FASTIFY_API_MIGRATION_PLAN.md`](docs/FLUTTER_FASTIFY_API_MIGRATION_PLAN.md).

Run the API locally on port 3001:

```powershell
npm run api:dev
```

Run its checks:

```powershell
npm run api:typecheck
npm run api:test
```

The versioned Fastify API owns the web and Flutter boundary under `/api/v1`, including identity, domain workflows, imports/exports, uploads, CMS, invitations, jobs, and provider webhooks. OpenAPI JSON is available at `/documentation/json` and interactive documentation at `/documentation`. Browser login exchanges a Firebase ID token at `/api/v1/auth/session` for an API-owned secure session cookie plus CSRF cookie; browser mutations send `X-CSRF-Token`. Flutter and external clients use `Authorization: Bearer <Firebase ID token>` and may send a validated `X-Campus-Id`. Fastify resolves organization, role, permissions and campus scope from the database. Neither client may send those values as trusted identity. The Fastify process binds to `0.0.0.0` and uses Render’s `PORT` when deployed. The API and Next.js web deploy separately; `render.yaml` provisions the API and supervised job worker.

### Razorpay tenant setup

Razorpay credentials are configured per school from `/integrations`; they are encrypted with `APP_ENCRYPTION_SECRET` and are not stored in public environment variables. Configure this webhook URL in the matching Razorpay Test or Live dashboard:

```text
https://<web-host>/api/v1/integrations/webhooks/razorpay/<organization-id>
```

Subscribe to `payment.captured`, `payment.failed`, `order.paid`, `refund.processed`, and `refund.failed`. The browser receives only the public Key ID and provider Order ID. Checkout signatures and raw webhook signatures are verified server-side, captured payment details are fetched from Razorpay before ledger posting, and refunds do not reverse the ERP ledger until Razorpay reports `processed`. Reuse the same webhook secret entered on `/integrations`. Test keys are rejected when `CONFIG_ENV=production`.

## Database environment

Use a configured `.env.local` or deployment environment with these values:

```dotenv
TURSO_DATABASE_URL="libsql://your-database.turso.io"
TURSO_AUTH_TOKEN="your-turso-token"
```

Also configure the Firebase Admin variables (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`) and the public Firebase variables (`NEXT_PUBLIC_FIREBASE_*`). Add Cloudinary, the selected Resend/Twilio/Google Calendar/Moodle/Traccar provider credentials, `API_INTERNAL_BASE_URL`, and separate random values for `APP_ENCRYPTION_SECRET` and `INTERNAL_JOB_SECRET` before staging/production deployment. Never put Turso, Firebase Admin, Cloudinary API secret, provider credentials, or any server secret in a `NEXT_PUBLIC_*` variable.

The CLI scripts load `.env.local` exactly like Next.js. This is important on Windows: running `tsx db/migrate.ts` directly without the loader can otherwise miss the configured target and fail before applying migrations.

Run and verify the remote schema:

```powershell
npm run db:migrate
npm run db:inspect
```

`db:inspect` prints the configured target, table count, migration count, organization count, and user count. A newly migrated database should show the application schema and 0 organizations/users.

## Create the first school and Super administrator

After migrations, open `http://localhost:3000/setup` (the `/register` link points there too):

1. Enter the administrator’s name, email, and password.
2. Enter the school name and a lowercase slug such as `green-valley-school`.
3. Enter the first campus name and code.
4. Submit the form.
5. Verify the Firebase email, then sign in at `/login`.

The server verifies the Firebase token and, in one transaction, creates the organization, campus, academic year, all system roles/permissions, the `super_admin` user, and that user’s campus scope. The endpoint only works when the database has no organizations or users, so it cannot be used to create a second platform administrator accidentally.

If setup says “School setup is already complete”, use an existing administrator account to provision the person instead of registering again. If setup says Turso or Firebase is not configured, fix the server environment and restart `npm run dev`.

## Create a platform administrator

Platform administrators are separate from school users and do not receive an organization ID. In a configured environment, set `PLATFORM_ADMIN_EMAIL`, `PLATFORM_ADMIN_PASSWORD` (12+ characters), and `PLATFORM_ADMIN_NAME`, then run:

```powershell
npm run db:seed:platform-admin
```

Sign in through `/login`; the server redirects the platform account to `/platform`. From there, provision a school and copy the generated Firebase password-setup link to its first school administrator.

## Add staff, parents, and students

Staff should not use the public school setup form. An existing administrator opens `/users`, enters the person’s email/name/role/campus, and chooses **Create invite**. This creates the Firebase identity and matching ERP user together. Copy the generated password-setup link to the person (or connect your email provider to send it automatically); they set a password, verify their email, and sign in.

Server-side permission checks are authoritative; hiding a navigation item is not security. Parent/student/teacher portals are limited to linked or assigned records.

## Database commands

```powershell
npm run db:generate   # generate SQL after changing db/schema
npm run db:migrate    # apply SQL to the configured target
npm run db:inspect    # verify target, tables, migrations, and row counts
npm run db:backup -- --source .\school-erp.db --destination .\.backups\school-erp.db
npm run db:restore -- --source .\.backups\school-erp.db --target .\restore-drill\school-erp.db --confirm-restore
npm run db:studio     # Drizzle Studio (use only with the intended env)
```

If Turso’s dashboard still looks empty, first run `npm run db:inspect`. Confirm it says `Turso/libSQL remote`; then refresh the Turso database’s **Tables** view. If it says local SQLite, the command is using a missing/incorrect `TURSO_DATABASE_URL`.

## Verification

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
npm run check:config
npm run check:secrets
```

## Architecture rules

- Domain code lives under `features/<domain>/actions`, `components`, `schemas`, `services`, and `tests`.
- Shared UI is under `components/`; infrastructure is under `lib/`; Drizzle schema is under `db/schema/`.
- Database access and Firebase Admin are server-only. Client components call server actions/API routes and never receive secrets.
- Every tenant-owned query enforces `organizationId`; campus/class/ownership scopes are enforced server-side.
- Mutations validate with reusable Zod schemas and write audit records.
- Cloudinary uploads use signed, authenticated server flows.

## Production checklist

Before production, verify Firebase email verification and Admin credentials, Turso migrations/backups, Cloudinary signed delivery, secure random secrets, Razorpay Live credentials/webhook/capture/refund/settlement behavior, the remaining email/SMS and operational provider adapters, monitoring, and authenticated staging E2E tests.

## Troubleshooting

**I registered but cannot sign in.** A Firebase identity without an ERP `users` row is rejected by design. Use `/setup` for the first school, or ask an existing administrator to provision the account. Also verify the Firebase email first.

**Turso has no tables.** Run `npm run db:inspect`. If the target is local SQLite, fix `.env.local` and restart the command. Then run `npm run db:migrate` and inspect again.

**School setup is unavailable.** Confirm that migrations have been applied to the configured database and that Firebase Admin credentials are valid.

**The dashboard redirects to login.** Check Firebase Admin variables, the session cookie, verified email, and that `users.firebase_uid` exactly matches the Firebase UID.
