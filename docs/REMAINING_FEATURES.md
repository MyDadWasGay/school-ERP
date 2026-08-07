# Remaining School ERP features

Last reviewed: 2026-08-07

This backlog is based on the implementation plan and the current code review.
The application already has authenticated routing, server-side RBAC and tenant
scope enforcement, audited CRUD workspaces for all planned modules, and
dedicated core workflows for students, admissions, attendance, exams, finance,
documents, analytics, user access, HR/payroll, communication, library,
transport, hostel/canteen, inventory/procurement, health, safety, and
facilities, activities, alumni, and CMS/forms. The items below
are the remaining features still needed to move each domain to full
functionality and to complete rollout gates.

## Execution update — 2026-08-07

The following backlog items have since been implemented and should be removed
from active P0 planning: foundation update/archive guards; admission follow-up,
source/campaign, assessment, and seat-matrix workflows; guardian and enrollment
transfer management; medical profiles and certificate issue/verification; exam
planning with schedule clash prevention and approval gating; fee
refund/reversal accounting; leave request overlap/approval rules; discipline
incident controls; invitation/session hardening; durable rate limiting; health
probes; CI/Docker deployment; and deployment/operations runbooks.

The remaining items below are still intentionally open, especially provider
delivery, broad domain workflows, reports/imports, portal depth, accessibility,
load, security, and staging verification. Durable job storage/retry/dead-letter
handling and guarded local backup/restore tooling are implemented; deploying a
worker and configuring provider backups remain rollout work.

The 2026-08-07 execution also implemented: employee register and immutable
payroll snapshots; campus/role-targeted in-app messages and delivery logs;
library reservations and digital resources; transport vehicles, manifests and
vehicle-document expiry alerts; hostel room/bed/allotment/check-out; canteen
menus and student transactions; procurement requisition/purchase-order state
transitions with atomic goods receipts; asset register, assignment/return,
maintenance, and depreciation lifecycle; and sensitive health profiles/clinic
visits; visitor/gate-pass, incident, evacuation, facility booking, maintenance,
and complaint workflows; clubs and student achievements; privacy-aware alumni
profiles, events, mentorship, and jobs; and CMS pages/media/forms/submissions.
Those acceptance slices are no longer P0 scaffolds, although their deeper
extensions remain listed below.

## Priority guide

- **P0 - domain completion:** needed before calling the relevant module fully
  operational.
- **P1 - platform completion:** needed for production operations, automation,
  reporting breadth, or complete test coverage.
- **P2 - rollout hardening:** environment, provider, security, performance, and
  operational work required before production launch.

## P0 - complete the domain modules

### Foundation and access

- Add dedicated update/archive flows for organizations and campuses.
- Add dependency-aware archive/delete rules for academic years, classes,
  sections, and subjects.
- Add dedicated role, permission, and access-scope management screens instead
  of relying on the generic settings workspace.
- Add class-section scope editing and delegated-access management to the
  broader settings workflow, including dependency warnings.

### Admissions

- Build follow-up tasks and lead pipeline transitions.
- Store and manage source/campaign data and lost-reason outcomes.
- Add admission test and interview scheduling, attendance, scoring, and
  outcome tracking.
- Add document upload, verification, rejection reasons, and applicant
  completeness indicators.
- Build a live seat matrix by campus, academic year, class, and section.
- Add admission and conversion reports with audited exports.

### Student information system

- Add guardian CRUD, multiple guardian linking/unlinking, custody notes, and
  primary-guardian changes.
- Add enrollment transfer workflows that close the previous enrollment and
  preserve a complete class/section history.
- Add roll-number reassignment, house assignment, and student photo upload.
- Add medical profile and sensitive health-summary screens with stricter
  permissions.
- Add certificate templates, certificate issuing, immutable certificate
  numbers, downloadable certificates, and QR verification.
- Add dedicated attendance, fee, result, and document history views within the
  student profile rather than only linking to module workspaces.

### Academic management

- Implement curriculum course, unit, chapter, outcome, and syllabus mapping.
- Add lesson-plan CRUD, approval, teaching resources, and resource uploads.
- Add teacher allocation, workload summaries, timetable periods, clash
  detection, and substitution workflows.
- Add assignments/homework, submissions, late-status calculation, feedback,
  grades, and completion analytics.

### Attendance and discipline

- Add staff attendance, leave types, leave requests, balances, and approvals.
- Add discipline incidents, merits/demerits, and restricted wellbeing records.
- Add bulk and period-wise marking UI for the remaining attendance modes.
- Add low-attendance alert generation, attendance reports, and parent absence
  notification records.

### Examination and assessment

- Add exam type, scheme, grade-rule, planning, schedule, room, and invigilator
  management.
- Add bulk marks import, moderation, approval, report cards, and export.
- Add question bank, online-test setup, attempts, auto/manual evaluation, and
  attempt history.

### Fees, finance, and accounts

- Add fee heads, fee structures, installments, assignments, concessions, and
  late-fee rules.
- Add receipts, refunds/reversals linked to original payments, defaulters, and
  financial reports.
- Add chart of accounts, expenses, bank accounts, reconciliation, donations,
  and immutable ledger review screens.

### HR and payroll (remaining extensions)

- Add employee documents, qualifications, experience, department/designation,
  reporting manager, and employee-document expiry alerts.
- Add recruitment, onboarding, performance, and training workflows.
- Add salary structures/components and country-specific deduction/tax inputs to
  the existing payroll-run snapshot workflow.

### Communication and engagement (remaining extensions)

- Add message templates, personalization variables, scheduling, opt-in/out,
  and circular acknowledgements to the existing audience publication flow.
- Add notices, events, registrations, PTM slot creation/booking, and external
  provider delivery adapters.

### Library (remaining extensions)

- Add shelves, richer catalogue metadata, holiday calendars, fine settlement,
  reservation fulfilment/cancellation, and circulation reports.
- Add circulation exports and report queries beyond the current availability
  and transaction views.

### Transport and fleet (remaining extensions)

- Add route-stop ordering, drivers/conductors, permits/fitness metadata, trip
  logs, QR boarding, incidents, and staff allocations to the existing route
  and student-allocation flow.
- Add richer expiry alert scheduling and transport reports.

### Hostel and canteen (remaining extensions)

- Add building/floor entities, visitors, outpasses, approval workflows,
  hostel attendance, and hostel reports to the existing room/bed/allotment
  workflow.
- Add meal plans, menu scheduling, canteen settlement/reporting, and occupancy
  analytics.

### Inventory, assets, and procurement (remaining extensions)

- Add units, locations, opening stock, supplier UI, and stock counts to the
  existing item/movement workflow.
- Make receipts, issues, transfers, returns, adjustments, consumption, and
  serial/batch/expiry tracking the only valid quantity-changing operations.
- Add vendor UI, supplier reconciliation, stock counts, and richer receipt/
  issue/transfer/return reporting to the existing inventory and procurement
  workflows.
- Add asset assignments, maintenance tickets, depreciation, and lifecycle
  accounting.

### Health, safety, and facilities (remaining extensions)

- Add medications, screenings, parent alerts, and sensitive health reports to
  the existing profile/clinic-visit workflow.
- Add visitor exports, attendance/host verification, and richer incident and
  evacuation participant records.
- Add facility calendars, SLA tracking, vendor links, cost reconciliation, and
  source-linked status timelines.

### Activities, sports, alumni, and community

- Add houses, points, club memberships, sports teams, fixtures, scores, and
  registrations linked to student timelines.
- Add alumni donations, richer event registrations, and directory moderation
  workflows to the existing alumni records.

### Website, forms, and CMS

- Add news/gallery/media variants, Cloudinary metadata validation, and public
  publishing routes to the existing CMS page/media workflow.
- Add form consent/survey fields, public form routes, and enquiry creation from
  an admissions form to the existing JSON form/submission workflow.

## P1 - platform and reporting completion

### Reports, alerts, and MIS

- Add dedicated report services and exports for admissions, attendance,
  finance/defaulters, exams, payroll, inventory, library, transport, hostel,
  and communication delivery.
- Add scheduled reports and report history.
- Add source-linked alerts for low attendance, overdue fees, missing marks,
  expiring documents, vehicle/employee expiry, low stock, capacity limits, and
  incomplete workflows.
- Add analytics drill-down pages for admissions, attendance, finance,
  academics, and operations rather than generic workspaces.

### Integrations and automation

- Add persistent integration configuration screens for every adapter.
- Add webhook event storage, signature validation, retry status, manual
  exception handling, and integration logs.
- Add scheduled-job interfaces and job history.
- Add API-key management with hashing, rotation, revocation, and audit logs.
- Replace mock payment, notification, hardware-attendance, GPS, LMS, and
  calendar providers with selected production providers and run end-to-end
  webhook tests.

### Import and export

- Complete Excel and PDF export services alongside the existing scoped export
  foundation.
- Add import/export job tables, progress/status, row-level errors, retry, and
  downloadable error reports.
- Add validated imports for students, employees, fees, marks, inventory, and
  other agreed high-volume datasets.

### Portals

- Add dedicated teacher pages for timetable, lesson plans, homework,
  substitutions, leave, and payslips.
- Add parent child-switching, child profile, fees/receipts, transport, leave,
  PTM, notices, documents, and support views.
- Add student timetable, assignments, resources, exams, certificates,
  activities, and support views.
- Add portal-specific loading, empty, error, and offline states and verify all
  linked-child/own-record/teacher-assignment boundaries with integration tests.

### Testing and quality

- Add integration tests for create student, mark attendance, collect payment,
  enter marks, publish result, admission approval, upload verification, and
  user scope changes against a disposable database.
- Expand Playwright coverage to login, dashboard, class/section creation,
  student creation, attendance, invoice/payment, marks/publication, and parent
  result workflows.
- Add accessibility, security, rate-limit, concurrency, load, and migration
  compatibility tests.
- Add tests for every provider adapter and webhook failure/retry path.

### Developer tooling

- Document controlled staging-data preparation without adding runtime sample
  records or fake accounts.
- Add focused feature README files and examples for creating a domain service,
  permission, report, and integration provider.

## P2 - production rollout gates

- Configure Firebase, Turso, Cloudinary, session, setup, and provider secrets
  per environment; rotate any previously exposed credentials.
- Apply migrations to staging and execute authenticated multi-tenant workflow
  tests with representative data.
- Configure Cloudinary private delivery, retention, backups, and restore
  procedures.
- Add structured logging, metrics, tracing, error tracking, alert routing,
  backup restore drills, and incident runbooks.
- Run browser/device compatibility, accessibility, penetration, performance,
  disaster-recovery, and data-migration checks before production cutover.
- Obtain operational sign-off for payment reconciliation, notification
  delivery, payroll privacy, health-data access, and retention policies.

## Recommended execution order

1. Finish foundation dependency-aware CRUD and student guardian/transfer/
   certificate workflows.
2. Implement academic, attendance-discipline, exam, and finance domain
   services because the portals and most reports depend on them.
3. Implement library, transport, hostel, inventory/procurement, health/safety,
   HR/payroll, and communication workflows.
4. Replace generic report/module screens with dedicated report queries, alerts,
   and exports.
5. Complete real integration adapters, import/export jobs, portals, and full
   integration/E2E testing.
6. Execute staging, security, observability, backup, and provider rollout
   gates.
