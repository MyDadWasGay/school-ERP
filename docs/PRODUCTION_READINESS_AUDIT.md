# Production-readiness audit and execution record

Reviewed: 2026-08-07

This is the first codebase-grounded audit for `docs/BIG PLAN.MD`. It records
what is present in the checkout, the first implementation slice completed from
the plan, and the gates that still block a production decision. It does not
convert a passing local build into a production-readiness claim.

## Architecture found

- Next.js App Router with React and TypeScript; the installed build reports
  Next.js 14.2.35. The package manager is npm.
- Server-rendered pages, server actions, and route handlers are separated into
  `app/` and feature modules under `features/`.
- Drizzle ORM with `@libsql/client` targets Turso/libSQL or local SQLite.
  Database migrations are under `drizzle/` and are applied by `db/migrate.ts`.
- Firebase Authentication is the identity provider. The server creates a
  five-day HTTP-only session cookie from a verified Firebase ID token.
- School users are stored in the tenant-scoped `users` table and must have one
  `organizationId`. Platform administrators are stored separately in
  `platform_admins`, with a separate `platform_audit_logs` stream.
- Tenant authorization is enforced through `requireUser`, `requirePermission`,
  feature services, and scoped joins. Platform pages use `requirePlatformAdmin`.
- Cloudinary signing and metadata registration are present for private
  document uploads. Payment and notification provider interfaces exist, but
  real provider rollout is not verified by this audit.
- Vitest covers unit/feature rules. Playwright currently contains three
  unauthenticated smoke checks. No CI workflow or container definition was
  found in the audited repository file tree.

## Identity and tenant decision

The existing platform-admin implementation uses a separate identity table. That
is the safer incremental choice for this schema because tenant tables keep their
required `organizationId`, and a platform identity cannot accidentally enter a
school query through a fake organization. Existing school role keys remain
lowercase compatibility keys (`management`, `office_staff`, `teacher`,
`student`, `parent`, and others); `management` currently serves as the initial
school administrator role and `office_staff` as the staff category. A future
role-key migration requires a data reconciliation plan.

## First implementation slice completed

The organization lifecycle was the first production-blocking boundary selected
from the plan. Before this slice, the platform service accepted any schema-
allowed status change and the UI could reactivate an archived organization.

Completed:

- Added a typed organization status state machine in
  `config/organization-status.ts`.
- Added server-side transition validation, same-state idempotency, an
  optimistic old-status predicate, and atomic platform audit logging.
- Updated platform actions to expose only valid lifecycle actions. Archiving
  requires an explicit confirmation; deletion is not presented until the
  retention/deletion workflow exists.
- Added archived, parent, and staff metrics to the platform overview.
- Added migration `drizzle/0004_organization_lifecycle.sql`, which rejects
  unknown organization statuses and invalid SQLite status transitions.
- Added focused lifecycle tests and validated the migration against a
  disposable local SQLite database.
- Removed globally reused role IDs from new bootstrap/provisioning paths and
  added migration `0005_tenant_role_ids` to backfill missing role rows per
  organization.

The password-recovery form also now uses one generic response for eligible,
unknown, and provider-failure cases, with a regression test. Provider-backed
rate limiting and abuse monitoring remain separate rollout work.

## Verification evidence

Passed in this checkout:

- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd test` — 18 files, 36 tests passed.
- `npm.cmd run build` — production build completed and included `/platform`.
- `npm.cmd run test:e2e` — 3 smoke tests passed. The command required a
  180-second bound because it builds the application before starting the test
  server.
- `npm.cmd exec drizzle-kit check`
- Disposable SQLite migration test — valid transitions succeeded; invalid
  insert and invalid `active -> deletion_scheduled` transition were rejected.
- Disposable SQLite role backfill — migration `0005_tenant_role_ids` creates
  organization-specific role rows without reusing another tenant's role IDs.

An earlier 120-second `npm.cmd run check` attempt timed out while Next.js was
finalizing the build. The final consolidated `npm.cmd run check` passed in
145.8 seconds with a 240-second bound; CI should retain a comparable build
timeout.

## Initial production blockers (historical baseline)

The following list records the findings at the start of execution. The
2026-08-07 execution addendum below supersedes the items that are now marked
implemented.

These are not claimed as complete by this slice:

- Authentication still needs durable rate limiting, brute-force controls,
  privileged-user MFA readiness, invitation/reset token lifecycle controls,
  and a verified multi-device session-management/revocation design.
- The database schema declares no foreign-key relationships in the audited
  schema/migrations. Cross-tenant relationship constraints need a deliberate
  migration plan rather than a broad unsafe rewrite.
- Platform deletion scheduling/execution, retention checks, impact review,
  worker retry behavior, module entitlements, integrations, and platform audit
  viewing remain incomplete.
- Many non-core domains remain audited generic workspaces rather than dedicated
  domain workflows. They must not be represented as production-complete.
- Real Firebase, Turso, Cloudinary, email/SMS/payment providers, staging data,
  observability, backup/restore, accessibility, load, penetration, and device
  validation were not performed here.
- No CI/CD workflow or container deployment artifact was found in the current
  checkout.

## Next execution order

1. Add a deliberate relationship/foreign-key and tenant-isolation migration
   plan, starting with the highest-risk identity and student relationships.
2. Harden session, invitation, recovery, rate-limit, and privileged-auth
   controls against a real Firebase-backed staging environment.
3. Complete platform organization detail, retention, entitlements, integration
   status, and audit-viewer workflows.
4. Replace the highest-value generic domain workspaces with dedicated services
   and integration tests before expanding portal scope.
5. Add CI/CD, observability, backup/restore drills, and deployment sign-off.

## Execution addendum — 2026-08-07

The following supersedes the earlier first-slice verification notes above:

- Completed implementation slices now include organization lifecycle, tenant
  integrity triggers, session logs/revocation, invitation tokens, admissions
  follow-ups/assessments/seat matrix, student guardian/transfer/medical/
  certificate workflows, exam planning and approval gating, fee refunds and
  ledger reversals, leave requests, discipline records, durable rate limiting,
  health probes, structured logs, security headers, CI, Docker deployment, and
  deployment/operations runbooks.
- Latest local verification passed: typecheck, lint, `npm.cmd test` (21 files,
  59 tests), `npm.cmd exec drizzle-kit check`, and disposable migration through
  `0028_community_cms_guards` (29 migrations, 210 tables). Dedicated local
  slices now cover HR/payroll, communication, library resources/reservations,
  transport vehicle compliance, hostel/canteen, procurement receipts, asset
  lifecycle, safety/facilities, community/CMS, and sensitive health records.
  The current production build completed with 105 generated pages (the earlier
  pre-domain build had 57 pages),
  backup/restore smoke testing, source secret/config checks, and Playwright
  smoke tests (3) against the standalone production server.
  The build and smoke command each required a 240-second bound on Windows.
- `/api/health/live` returned 200. `/api/health/ready` returned 200 against a
  freshly migrated disposable SQLite database with explicit CI-safe secrets;
  the configured remote target returned
  503 in this sandbox and was not modified.
- Remaining production gates are real Firebase/Turso/Cloudinary/provider
  staging, transactional email delivery, privileged-user MFA, hosted CI
  execution, provider backup/retention, accessibility, browser/device, load,
  penetration, and disaster-recovery evidence. Dedicated gaps remain for
  broader reports/imports, portal depth, sports/membership extensions,
  supplier/reconciliation extensions, and asset accounting/reporting breadth.
- The latest pass also adds encrypted integration configuration, a platform
  audit viewer, durable tenant-scoped job retries/dead letters, and guarded
  local backup/restore tooling. Student CSV imports are bounded to 1,000 rows;
  batches over 250 rows are encrypted and queued for the separately deployed
  worker, while smaller batches retain row-level synchronous results.

## Final execution addendum — 2026-08-07

The final implementation pass closed the remaining first-build slices that had
been called out as reports/imports, portal depth, sports/community extensions,
and integration boundaries:

- Added migration `0029_import_progress`, `0030_integration_boundary_guards`,
  and `0031_community_extensions`.
- Added scoped report services and audited CSV/XLSX/HTML exports for the major
  operational datasets; student imports now retain progress and downloadable
  row-level errors across queued work.
- Added teacher/student/parent portal snapshots with linked/assigned data
  boundaries and loading, error, empty, and offline states.
- Added hashed API-key issuance/revocation, signed and deduplicated webhook
  intake, encrypted payload storage, and integration logs.
- Added club memberships, sports teams/fixtures, alumni registrations and
  donations, and public CMS pages/forms with validated optional admissions
  enquiry creation.

Final local verification passed:

- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd test` — 23 files, 64 tests passed.
- `npx.cmd drizzle-kit check`
- `npm.cmd run build` — 111 generated pages.
- `npm.cmd run test:e2e` — 3 Playwright smoke tests passed; the Windows run
  completed in 276.7 seconds including the production build.
- `npm.cmd run check:config` and `npm.cmd run check:secrets`.
- Disposable SQLite migration, inspection, backup, and restore — 32 migrations
  and 211 tables before and after restore; the configured Turso target was not
  modified.

This is implementation-complete for staging handoff, not a production
certification. The remaining decision gates require real Firebase/Turso/
Cloudinary/provider staging, authenticated multi-tenant workflow evidence,
privileged-user MFA, hosted CI execution, provider backup/retention policy,
observability and alert routing, accessibility/browser/device checks,
load/concurrency testing, penetration testing, disaster-recovery evidence, and
operational sign-off for payment, notification, payroll, health-data, and
retention controls.
