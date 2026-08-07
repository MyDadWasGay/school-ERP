# Operations runbook

## First response

Check `/api/health/live` for process availability and `/api/health/ready` for
database readiness. Capture the `X-Request-ID`, timestamp, route, tenant (if
known), and sanitized error event from structured logs. Never paste tokens,
Firebase credentials, Cloudinary signatures, or student medical/discipline
details into an incident channel.
Readiness returns 503 without listing missing configuration names; inspect the
deployment secret manager and the sanitized `missingCount` log field instead.

## Authentication incidents

- A suspended or role-changed user must be signed out by revoking active session
  rows from the user-access workflow; role and status changes already revoke
  tenant sessions.
- Platform sessions are separate from tenant sessions. Review and revoke the
  platform session record when a platform administrator device is lost.
- Invitation tokens are hashed, expire after 48 hours, are single-use, and are
  not recoverable from the database. Issue a new invitation if the token is
  lost or left in processing after a provider failure.
- Repeated invite/session exchange responses with HTTP 429 indicate the
  durable rate-limit bucket is working; investigate the client/IP pattern before
  raising limits.

## Data and migration incidents

1. Stop the release job; keep read traffic running only if the database health
   probe is green and the issue is isolated.
2. Record the migration tag and database target from `npm run db:inspect`.
3. Do not edit the migration journal manually in a live database. Escalate a
   failed migration with the provider logs and the exact SQL tag.
4. For suspected tenant leakage, disable the affected route/permission, retain
   audit records, and run the cross-tenant integration tests against a copy.

## Financial correction

Never edit a posted payment or receipt directly. Use the refund action, which
updates the invoice balance, creates a refund record, reverses the ledger, and
retains the original payment and audit event. Reconcile the payment, refund,
and two ledger entries by reference ID before closing the incident.

## Backups and recovery

Configure Turso point-in-time/backup policy outside the application and perform
a restore drill before production. The drill must verify migrations, row counts,
tenant isolation, Firebase login, document references, and a sample financial
reconciliation. Record RPO, RTO, restore timestamp, and operator sign-off.
For local/offline SQLite evidence, use the guarded commands in
`docs/BACKUP_RESTORE.md`; the restore command requires an explicit confirmation
and preserves the previous target. Never treat a copied local file as proof of
provider backup retention.

## Background jobs

The `/integrations/jobs` page shows tenant-scoped job status, attempts, retry
time, and dead-letter errors without exposing payloads. A worker invokes
`POST /api/internal/jobs/run` with `x-internal-job-secret`; send a small `limit`
such as 1-10 per poll. The worker lease expires after 15 minutes, retry delay
is bounded at 15 minutes, and exhausted jobs remain in `dead_letter` for
operator review. Keep the worker outside the public browser surface and rotate
`INTERNAL_JOB_SECRET` through the deployment secret manager.

## Release evidence

Attach the CI run, migration output, health probe output, staging workflow
results, accessibility/device results, backup-drill result, and provider
configuration checks to every production release. A local build alone is not a
production approval.
