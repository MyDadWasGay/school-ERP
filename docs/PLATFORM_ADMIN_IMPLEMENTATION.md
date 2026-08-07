# Platform administration implementation

The platform administrator is deliberately stored outside the tenant `users`
table. This keeps a platform identity from acquiring a school organization by
accident and leaves existing tenant queries organization-scoped.

## Setup

After applying migrations, configure these values in the server environment:

```dotenv
PLATFORM_ADMIN_EMAIL=""
PLATFORM_ADMIN_PASSWORD=""
PLATFORM_ADMIN_NAME="Platform Administrator"
```

Run:

```powershell
npm run db:seed:platform-admin
```

The command creates the Firebase email/password identity and the matching
`platform_admins` row. The password is used only during Firebase creation and
is not stored in the ERP database. It is idempotent when the platform admin
row already exists.

## Current surface

- `/platform` is protected by a server-side platform identity check.
- The normal login endpoint redirects platform admins to `/platform` and school
  users to `/dashboard`.
- Platform school provisioning creates the organization, first campus, active
  academic year, tenant access defaults, and the initial school administrator.
- The school administrator receives a Firebase password-setup link that is
  returned for one-time handoff by the platform operator.
- School lifecycle actions currently support activate, suspend, and archive.
- Organization lifecycle transitions are centralized and constrained to:
  `provisioning -> active`, `active -> suspended|archived`,
  `suspended -> active|archived`, `archived -> active|deletion_scheduled`,
  and `deletion_scheduled -> archived`.
- The platform overview reports active, suspended, and archived school counts,
  plus active user, teacher, student, parent, and staff counts.
- Platform mutations are written to `platform_audit_logs` in the same
  transaction as the organization status change; tenant audit logs remain
  organization-scoped.
- Migration `0004_organization_lifecycle` adds SQLite guards for valid
  organization statuses and valid old-to-new transitions. The service also
  uses an optimistic status predicate so concurrent platform actions cannot
  overwrite one another silently.
- Migration `0005_tenant_role_ids` repairs missing role rows per organization;
  new provisioning and first-school bootstrap paths generate unique role IDs
  instead of reusing global IDs such as `role-teacher`.

## Deliberate boundaries

The existing `super_admin` role remains a tenant-level compatibility role for
the original school setup flow. It cannot use the new platform actions. A
future migration can rename that legacy school role once existing tenant data
has been reconciled.

Global integrations, feature flags, subscription management, support context
switching, deletion scheduling/execution, and a platform audit viewer are still
backlog items. The lifecycle state machine intentionally exposes no deletion
button until retention, impact review, confirmation, worker execution, and
retry handling exist.

## Execution addendum — 2026-08-07

Invitations now store only SHA-256 token hashes, expire after 48 hours, are
single-use, and activate the local user only after the Firebase password and
verification operations succeed. Tenant and platform session logs are checked
on every guarded request, and user access changes revoke active tenant sessions.
Invitation validation, invitation acceptance, and session exchange are backed
by durable rate-limit buckets from migration `0010_rate_limit_buckets`.

The activation URL is returned for a controlled one-time handoff until a
transactional email provider is configured. That provider and privileged-user
MFA remain explicit production rollout gates; the application does not claim
that a message was delivered when no provider is configured.
