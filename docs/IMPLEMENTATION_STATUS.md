# School ERP implementation status

Last reviewed: 2026-08-07

This document records the result of the codebase-first review against
`SCHOOL_ERP_LLM_CONTEXT.md`, `SCHOOL_ERP_PRD.md`, `SCHOOL_ERP_TDD.md`, and
`SCHOOL_ERP_IMPLEMENTATION_PLAN.md`.

## Delivery definition

The governing documents define the first build as a complete, navigable,
authenticated, role-aware foundation: every module is routed and functional,
provider boundaries are explicit, and the core workflows use the real domain
schema and server-side controls.

The project now meets that first-build boundary. A functional audited CRUD
workspace is available for every planned module route. The high-risk workflows
listed below use dedicated domain services rather than the generic workspace.
Provider-dependent production rollout still requires real credentials,
staging data, and operational sign-off.

The current execution also added dedicated exam planning/status gating, leave
and discipline workflows, fee refund/reversal accounting, invitation/session
hardening, durable throttling, health probes, CI, Docker deployment, and
operator/deployment runbooks.

It also added encrypted tenant integration configuration, a platform audit
viewer, a bounded student CSV import endpoint with durable progress and error
downloads, a dedicated report catalog/export surface, scoped portal data
snapshots, API-key and webhook boundaries, and durable background job
history/retry handling. Large batches now use an encrypted queue and require a
separately deployed worker; scheduled/provider work still requires rollout
configuration.

## Review findings resolved

- Replaced static-looking catch-all screens with tenant-scoped, paginated,
  searchable create/edit/archive workspaces.
- Added all 167 planned route definitions and reject unknown catch-all routes.
- Completed server-side campus switching and role-aware teacher, parent,
  student, alumni, and management navigation.
- Closed tenant/campus/class scope gaps in students, admissions, attendance,
  marks, payments, uploads, and user administration.
- Added the missing `/students/new` route so it cannot be interpreted as a
  student identifier.
- Added role-shaped UI controls so read-only portal users do not see create or
  upload actions they cannot perform.
- Replaced dashboard sample trends with scoped aggregate database queries.
- Added bounded report services for admissions, attendance, finance, exams,
  payroll, inventory, library, transport, hostel, and communication delivery,
  with audited CSV/XLSX/HTML exports.
- Added durable student-import progress, queued-job continuity, row-level error
  downloads, and tenant-scoped import history.
- Added scoped teacher/student/parent portal snapshots plus loading, error, and
  empty/offline states.
- Added hashed API-key management and signed, deduplicated webhook intake with
  encrypted payload storage and integration logs.
- Added sports teams/fixtures, club memberships, alumni registrations and
  donations, and public CMS page/form routes with validated enquiry creation.
- Completed user access administration: Firebase activation, role, campus
  scope, class/section scope, bounded delegated permissions, revocation, and
  login history.
- Hardened Cloudinary document registration by checking entity scope, exact
  tenant/entity folders, and authoritative asset metadata before persistence.
- Hardened payment idempotency and balance updates, attendance correction
  cutoffs, admission seat capacity, marks scope, and result publication.

## Implementation matrix

| Area | First-build status | Dedicated behavior |
| --- | --- | --- |
| Authentication | Implemented | Firebase email/password, verified email, secure server session cookie, active local-user/organization checks, login/session audit, logout revocation |
| RBAC and scope | Implemented | Server guards, persisted role permissions with defaults, delegated permissions, organization/campus/class/parent/student/teacher scopes |
| Foundation | Implemented core | Organization/campus creation, academic year/class/section/subject setup, one active year policy, scope validation; remaining settings use audited CRUD workspace |
| Users | Implemented | Invite and link Firebase identity, paginated search, role/status/campus/class scope administration, delegation, login history |
| Admissions | Implemented core | Enquiries, applications, verification/waitlist/rejection, guarded approval, capacity enforcement, atomic student/guardian/enrollment/timeline conversion |
| Students | Implemented core | Create/update master, optional guardian reuse/link, initial enrollment, capacity and duplicate checks, profile tabs, history, secure documents, scoped portal views |
| Attendance | Implemented core | Daily/period marking, teacher scope, absence event de-duplication, 24-hour correction workflow and approval/rejection |
| Exams | Implemented core | Scoped marks entry, range validation, schedule/class/subject checks, teacher assignment checks, publication and published-only portal results |
| Fees and accounts | Implemented core | Invoice creation, partial payment allocation, stable idempotency, optimistic balance protection, immutable receipt and ledger records |
| Reports and analytics | Implemented | Scoped report catalog/services for 11 operational datasets, bounded CSV/XLSX/HTML exports, Tremor KPIs and database trends, audit of export access |
| Documents | Implemented | Signed Cloudinary upload, exact tenant/entity path, entity authorization, server metadata verification, private document records |
| Academic | Functional scaffold | Planned pages expose filtered, paginated, validated, permission-shaped, tenant-scoped, audited create/edit/archive patterns; dedicated curriculum, timetable, assignment, and resource workflows remain open |
| HR and payroll | Implemented core | Employee register with unique IDs, linked portal users, salary inputs, payroll-period runs, immutable payslip snapshots, scoped payroll views and tenant triggers |
| Communication | Implemented core | Audited message drafts, campus/role audience publication, durable in-app notification events, read state and delivery logs with tenant guards |
| Library | Implemented core | Catalogue/copy circulation, issue/return/renewal, borrower limits, fine calculation, lost/damaged state, reservations and digital-resource records |
| Transport | Implemented core | Routes, stops, vehicles, capacity-safe student allocations, CSV manifests, vehicle documents and expiry alerts |
| Hostel and canteen | Implemented core | Room/bed setup, capacity-safe allotment/check-out, occupancy counts, menu items and student transaction posting with scope guards |
| Inventory and procurement | Implemented core | Movement-only inventory quantity updates, low-stock alerts, supplier-ready schema, requisition/PO transitions, atomic goods receipts, audit history and invalid-state database guards |
| Health | Implemented core | Sensitive student-linked profiles and clinic visits with strict permission, tenant and campus enforcement |
| Assets | Implemented core | Asset register, lifecycle status, scoped student/employee assignment and return, maintenance tickets, immutable period depreciation, book-value updates, audit records and tenant guards |
| Safety | Implemented core | Visitor register, gate-pass request/approval/use, security incidents, and evacuation roll-call lifecycle with tenant/status guards |
| Facilities | Implemented core | Facility booking overlap checks, maintenance tickets, and complaint workflows with approval/status transitions and tenant guards |
| Activities and community | Implemented core | Scoped clubs, memberships, sports teams/fixtures, alumni registrations/donations, and student achievements with coordinator and student-scope validation |
| Alumni | Implemented core | Privacy-aware profiles, alumni events, mentorship requests, and job-board drafts with tenant-scoped records |
| CMS and forms | Implemented core | Draft/published/archived pages, provider media metadata, validated JSON forms, public page/form routes, scoped submissions, honeypot/rate limits, and optional admissions-enquiry creation |
| Integrations | Implemented boundary | Encrypted tenant configuration, hashed/revocable API keys, signed and deduplicated webhook intake, encrypted payloads, integration logs, and durable job history; real provider adapters remain rollout work |
| Import and export | Implemented student workflow | Bounded student CSV import, queued progress, row-level error downloads, and audited CSV/XLSX/HTML report exports; other high-volume datasets remain open |
| Portals | Implemented scoped dashboards | Mobile-first teacher, student, and parent snapshots with linked/assigned data boundaries, metrics, responsive tables, loading/error/empty/offline states, and role-shaped actions |

## Database verification

- A disposable local SQLite database applied all 32 migrations and produced
  211 tables with 0 organizations and 0 users. The configured Turso target was
  not modified.
- A local SQLite backup and restore drill preserved the 32-migration and
  211-table counts.
- The disposable database was removed after verification.

## Quality gates

The final handoff must keep these commands green:

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
npm run check:config
npm run check:secrets
```

The route matrix is unit-tested for 167 unique planned entries. The current
suite has 23 files and 64 passing tests. Tests cover
RBAC, route permissions, audit records, student forms and schemas, admission
decisions, academic setup, attendance validation, marks, payment rules,
document upload policy, import parsing, export behavior, user access
validation, report schemas, portal boundaries, integration boundaries, and
cross-tenant guards for library, inventory, transport, HR, hostel,
communication, procurement, assets, health, safety, facilities, community,
and canteen records.

## Production rollout gates

These are deployment inputs, not missing architectural code:

- Configure and rotate environment-specific Firebase Admin/client, Turso,
  Cloudinary, session, and setup secrets.
- Apply migrations to staging first and run the full authenticated workflow
  suite with representative tenant data.
- Implement and configure selected email, SMS, WhatsApp, payment, hardware,
  GPS, LMS, and calendar providers; configure retry monitoring and webhooks.
- Configure Cloudinary authenticated delivery policy and backup/retention.
- Deploy the background worker, configure production observability/alert
  routing, and perform provider backup restore drills using
  `docs/BACKUP_RESTORE.md`.
- Run accessibility, browser/device, load, security, and data migration checks
  before a production cutover.
