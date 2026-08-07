# Remaining School ERP features

Last reviewed: 2026-08-07

This backlog is based on the implementation plan and the current code review.
The application already has authenticated routing, server-side RBAC and tenant
scope enforcement, audited CRUD workspaces for all planned modules, and
dedicated core workflows for students, admissions, attendance, exams, finance,
documents, analytics, user access, HR/payroll, communication, library,
transport, hostel/canteen, inventory/procurement, health, safety, and
facilities, activities, alumni, and CMS/forms. The items below are the deeper
extensions, automation, and external rollout evidence still needed beyond the
implemented first-build boundary.

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
delivery, deeper domain workflows, scheduled reports, non-student imports,
portal subpages, accessibility, load, security, and staging verification.
Durable job storage/retry/dead-letter handling, guarded local backup/restore,
report exports, student-import progress/errors, signed webhook intake, and
public CMS routes are implemented; deploying a worker and configuring provider
backups remain rollout work.

The 2026-08-07 execution also implemented: employee register and immutable
payroll snapshots; campus/role-targeted in-app messages and delivery logs;
library reservations and digital resources; transport vehicles, manifests and
vehicle-document expiry alerts; hostel room/bed/allotment/check-out; canteen
menus and student transactions; procurement requisition/purchase-order state
transitions with atomic goods receipts; asset register, assignment/return,
maintenance, and depreciation lifecycle; and sensitive health profiles/clinic
visits; visitor/gate-pass, incident, evacuation, facility booking, maintenance,
and complaint workflows; clubs, memberships, sports teams/fixtures, and
student achievements; privacy-aware alumni profiles, events, registrations,
donations, mentorship, and jobs; CMS pages/media/forms/submissions with public
routes; dedicated reports and exports; student import progress/error handling;
scoped portal snapshots; and API-key/webhook boundaries. Those acceptance
slices are no longer P0 scaffolds, although their deeper extensions remain
listed below.

## Priority guide

- **P0 - domain completion:** needed before calling the relevant module fully
  operational.
- **P1 - platform completion:** needed for production operations, automation,
  reporting breadth, or complete test coverage.
- **P2 - rollout hardening:** environment, provider, security, performance, and
  operational work required before production launch.

## P0 - complete the domain modules

### Foundation and access

- Complete dependency-aware archive/delete review for academic years, classes,
  sections, and subjects.
- Expand dedicated role, permission, access-scope, and delegated-access screens
  with dependency warnings beyond the current audited settings workflows.

### Admissions

- Add document upload, verification, rejection reasons, and applicant
  completeness indicators.
- Add richer admission conversion drill-downs and source-linked alerts to the
  existing pipeline and report service.

### Student information system

- Add roll-number reassignment, house assignment, and student photo upload.
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
- Add bulk and period-wise marking UI for the remaining attendance modes.
- Add low-attendance alert generation, attendance reports, and parent absence
  notification records.

### Examination and assessment

- Add bulk marks import, moderation, approval, report cards, and export.
- Add question bank, online-test setup, attempts, auto/manual evaluation, and
  attempt history.

### Fees, finance, and accounts

- Add fee heads, fee structures, installments, assignments, concessions, and
  late-fee rules.
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
- Add vendor UI, supplier reconciliation, stock counts, and richer receipt/
  issue/transfer/return reporting to the existing inventory and procurement
  workflows.

### Health, safety, and facilities (remaining extensions)

- Add medications, screenings, parent alerts, and sensitive health reports to
  the existing profile/clinic-visit workflow.
- Add visitor exports, attendance/host verification, and richer incident and
  evacuation participant records.
- Add facility calendars, SLA tracking, vendor links, cost reconciliation, and
  source-linked status timelines.

### Activities, sports, alumni, and community

- Add houses, points, fixture scores, and registrations linked to student
  timelines.
- Add directory moderation workflows to the existing alumni records.

### Website, forms, and CMS

- Add news/gallery/media variants and deeper Cloudinary metadata validation to
  the existing CMS page/media workflow.
- Add consent/survey field types and moderation/reporting to the existing public
  JSON form/submission workflow.

## P1 - platform and reporting completion

### Reports, alerts, and MIS

- Add scheduled reports and report history.
- Add source-linked alerts for low attendance, overdue fees, missing marks,
  expiring documents, vehicle/employee expiry, low stock, capacity limits, and
  incomplete workflows.
- Add analytics drill-down pages for admissions, attendance, finance,
  academics, and operations beyond the current bounded report workspace.

### Integrations and automation

- Add webhook retry status, manual exception handling, and scheduled-job
  interfaces on top of the current durable job and integration log boundary.
- Add API-key rotation policy and consumer authentication helpers for selected
  external APIs.
- Replace mock payment, notification, hardware-attendance, GPS, LMS, and
  calendar providers with selected production providers and run end-to-end
  webhook tests.

### Import and export

- Complete PDF export and background large-export jobs alongside the current
  audited CSV/XLSX/HTML report exports.
- Add validated imports for employees, fees, marks, inventory, and other agreed
  high-volume datasets; student import progress/errors are implemented.

### Portals

- Add dedicated teacher pages for timetable, lesson plans, homework,
  substitutions, leave, and payslips.
- Add parent child-switching, child profile, fees/receipts, transport, leave,
  PTM, notices, documents, and support views.
- Add student timetable, assignments, resources, exams, certificates,
  activities, and support views.
- Extend the current scoped snapshots with the dedicated subpages above and
  verify all linked-child/own-record/teacher-assignment boundaries with
  authenticated integration tests. Loading, empty, error, and offline states
  are implemented for the current dashboards.

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
- Extend the implemented structured logging, health probes, and incident
  runbooks with metrics, tracing, error tracking, alert routing, and provider
  backup restore drills.
- Run browser/device compatibility, accessibility, penetration, performance,
  disaster-recovery, and data-migration checks before production cutover.
- Obtain operational sign-off for payment reconciliation, notification
  delivery, payroll privacy, health-data access, and retention policies.

## Recommended execution order

1. Finish the remaining domain extensions: academic depth, student profile
   history, finance accounting, and operational reporting.
2. Add scheduled reports/alerts, non-student imports, PDF/background exports,
   and portal subpages.
3. Complete selected provider adapters, webhook retry/exception workflows, and
   consumer API authentication.
4. Expand authenticated integration and Playwright coverage beyond the current
   local smoke and tenant-isolation tests.
5. Execute staging, security, observability, accessibility, load, backup, and
   provider rollout gates.
