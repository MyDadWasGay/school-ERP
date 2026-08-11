# School ERP — Feature Completion Audit

Baseline snapshot: 2026-08-08 | Updated: 2026-08-09 | Codebase: D:\My own projects\SCHOOL ERP V2 | Stack: Next.js 14.2.35 App Router, React 18, TypeScript 5.8 strict, Firebase Authentication/Admin, Drizzle ORM 0.44, SQLite/libSQL/Turso, Zod, Server Actions and REST-style route handlers

## 1. Executive Summary

- Total modules audited: 21
- Baseline completion breakdown: 4.8% Complete (1), 90.5% Partial (19), 4.8% Stub / Placeholder (1), 0% Missing (0), 0% Broken (0). The historical module scores are retained below; the current remediation state is recorded in the update section.
- The audit is code-grounded. It used the configured route registry, physical App Router pages, feature services/actions/schemas, Drizzle schema exports, auth guards, static incompleteness searches, the repository documentation, and the local verification commands listed below.
- Baseline verification observed: 23 Vitest files and 64 tests passed; TypeScript typecheck passed; ESLint passed; the production build passed and generated 111 routes. The smoke E2E run was not a valid product result because the test worker could not bind 127.0.0.1:3000 in this environment; see F-023.
- Baseline Top 5 Critical issues:
  1. [F-001 — Academic core routes use the generic record workspace](#f-001--academic-core-routes-use-the-generic-record-workspace)
  2. [F-002 — Fee configuration and accounting routes use the generic record workspace](#f-002--fee-configuration-and-accounting-routes-use-the-generic-record-workspace)
  3. [F-003 — Payroll deductions are hard-coded to zero](#f-003--payroll-deductions-are-hard-coded-to-zero)
  4. [F-004 — Production payment, notification, hardware, GPS, LMS, and calendar adapters are not implemented](#f-004--production-payment-notification-hardware-gps-lms-and-calendar-adapters-are-not-implemented)
  5. [F-005 — Hostel allocation does not enforce bed uniqueness atomically](#f-005--hostel-allocation-does-not-enforce-bed-uniqueness-atomically)

### Current verified remediation status - 2026-08-09

The original module findings below are the 2026-08-08 audit snapshot. The following implementation and verification results supersede the affected snapshot notes without hiding the remaining gaps:

- Fastify now exposes the shared identity, campus, portal, student-history, leave, notification, payment, Razorpay, refund and document contracts with authentication, tenant/campus scope, OpenAPI schemas, typed client calls and API tests.
- Razorpay is implemented as the selected payment gateway. Tenant credentials are encrypted; Checkout order creation, server-side Checkout signature verification, captured-payment parity checks, raw-body webhook HMAC validation, event deduplication, receipt/ledger posting and provider-backed refunds are present.
- Online refunds reserve value and reverse the ERP invoice/ledger only after Razorpay reports processed status. Staff cannot bypass the gateway by submitting an internal collection with method online.
- Student attendance, invoice, result and document tabs use scoped Fastify data. Browser fee collection, Checkout, refunds, upload signatures and document metadata use the versioned Firebase Bearer client.
- Academic curriculum, lesson-plan, allocation, timetable, substitution, assignment and resource pages now use scoped academic tables and typed validation rather than `moduleRecords`. Fee configuration, chart-of-accounts, expenses, ledger, receipts, refunds, defaulters and organization donations now use finance tables and idempotent money boundaries. Payroll accepts bounded tenant-configured allowances/fixed deductions/rates and snapshots the calculation; statutory tax policy remains an explicit external policy gate.
- Staff attendance and low-attendance reporting, exam question-bank/report-card workflows, the clash-protected exam-schedules cutover, employee CSV import with row errors/idempotency, application document upload verification, binary PDF report export, analytics drill-down routes, and inventory/procurement supplier masters are implemented. Remaining lower-risk configured routes use a typed catalog route registry and tenant-scoped catalog tables; those JSON detail tables still need dedicated schemas before high-volume or transactional rules are added.
- Local release gate on the updated tree: configuration validation passed, secret scan passed, both TypeScript boundaries passed, ESLint passed, 37 Vitest files and 123 tests passed, the production build generated 137 routes, and migrations 0035-0037 applied successfully to a disposable local SQLite database.
- Flutter development is intentionally deferred. No Flutter source, device test or staging mobile evidence is claimed here.

Still open: statutory payroll policy adapters, dedicated high-invariant schemas for the remaining catalog routes, outbound notification/hardware/GPS/LMS/calendar provider selection and credentials, queued/background export delivery, Render deployment, authenticated browser/staging evidence, load/accessibility/backup drills and legacy-path deprecation. Razorpay Live credentials, dashboard webhook registration and settlement evidence are also deployment gates, not local-test results. Flutter remains intentionally deferred.

### Discovery evidence

The repository is accessible and contains a single Next.js application rather than a separate frontend/backend monorepo. The directory layout at three levels is organized as follows:

- App Router pages and route handlers: app/(auth), app/(dashboard), app/(platform), and app/api.
- Feature modules: features/admissions, attendance, auth, community, documents, exams, foundation, health, hostel, hr, import-export, integrations, inventory, library, platform, portals, procurement, reports, safety, students, transport, users, and shared.
- Data layer: db/schema, drizzle migrations, db/client.ts, and db scripts.
- Shared cross-cutting code: lib/auth, lib/rbac, lib/audit, lib/cloudinary, lib/integrations, lib/jobs, lib/exports, lib/security, and lib/config.
- Test layout: tests/unit, tests/integration, tests/e2e, and feature-local tests.

The API contract is split between Next Server Actions for most domain mutations and Next route handlers for authentication, bootstrap, uploads, imports, exports, public CMS, webhooks, health, transport manifests, invitations, and internal jobs. Drizzle typed queries target SQLite/libSQL/Turso. Firebase is the identity provider; Cloudinary is the upload provider.

| Discovered module                      | Frontend evidence                                                                                                                               | Backend evidence                                                                        | Data evidence                                                                                       |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Platform administration and foundation | /platform, /platform/audit-logs, /organizations, /campuses, /settings/academic-years, /settings/classes, /settings/sections, /settings/subjects | features/platform and features/foundation services/actions; /api/setup/bootstrap        | organizations, campuses, academicYears, terms, classes, sections, subjects, roles, permissions      |
| Authentication, users and RBAC         | /login, /register, /setup, /forgot-password, /invite/accept, /users, /users/[id]                                                                | /api/auth/_, /api/users/_, lib/auth/guards.ts, features/users                           | users, platformAdmins, roles, permissions, scopes, delegatedAccess, sessions, invitations           |
| Admissions                             | /admissions/enquiries, /applications, /approvals, /seat-matrix                                                                                  | features/admissions services/actions                                                    | admissionsEnquiries, applications, follow-ups, assessments, admissions catalog tables               |
| Student information and documents      | /students, /students/new, /students/[id]/*, /students/import                                                                                    | features/students, features/documents, /api/uploads/signature, certificate verification | students, guardians, enrollments, documentFiles, medical profiles, certificates                     |
| Academics                              | /academics/curriculum plus configured timetable, lesson-plan, allocation, substitution, assignment and resource routes                          | No features/academics directory; shared fallback                                        | dedicated lessonPlans/assignments plus catalog academic tables                                      |
| Attendance and care                    | /attendance/students, /leave, /corrections, /discipline plus configured staff/report/wellbeing routes                                           | features/attendance services/actions                                                    | student attendance, sessions, corrections, leave, discipline; staff/wellbeing catalog tables        |
| Exams and grading                      | /exams/planning, /marks, /results plus configured report-card/question-bank/online-test routes                                                  | features/exams services/actions                                                         | exams, schedules, marks, publications, gradeRules, reportCards, questionBankItems                   |
| Fees and finance                       | /fees/invoices, /fees/payments plus configured fee/account routes                                                                               | features/finance services/actions                                                       | fee heads/structures/installments/invoices/payments/receipts/refunds/ledger/accounts/expenses/banks |
| Staff, HR and payroll                  | /hr/employees, /payroll/runs, /payroll/payslips plus configured HR extension routes                                                             | features/hr services/actions                                                            | employees, payrollRuns, payrollPayslips and catalog people tables                                   |
| Communication                          | /communication/messages, /notifications, /logs plus configured templates/notices/events/PTM routes                                              | features/communication services/actions                                                 | messages, notificationEvents, notices                                                               |
| Library                                | /library/catalogue, /copies, /issue-return, /reservations, /digital-resources                                                                   | features/library services/actions                                                       | libraryItems, libraryCopies, libraryIssueTransactions and catalog reservation/fine/resource tables  |
| Transport                              | /transport/routes, /stops, /vehicles, /allocations and manifest API                                                                             | features/transport services/actions, /api/transport/manifest                            | routes, stops, vehicles, allocations and catalog driver/trip/incident tables                        |
| Hostel and canteen                     | /hostel/rooms, /beds, /allotments; /canteen/menu, /transactions                                                                                 | features/hostel and features/canteen services/actions                                   | hostel rooms/beds/allotments, canteen menu/transactions, catalog buildings/meal plans               |
| Inventory, procurement and assets      | /inventory/items, /stock-movements; /procurement/requisitions, /purchase-orders, /goods-receipts; /assets/*                                     | features/inventory, procurement and assets services/actions                             | inventoryItems, stockMovements, suppliers, catalog purchasing/assets/maintenance/depreciation       |
| Health, safety and facilities          | /health/profiles, /clinic-visits; /safety/_; /facilities/_                                                                                      | features/health, safety and facilities services/actions                                 | healthProfiles/clinicVisits and catalog visitor, gate-pass, incident, evacuation, facility tables   |
| Activities, alumni and CMS             | /activities/_, /alumni/_, /cms/pages, /media, /forms, /submissions; public CMS APIs                                                             | features/community services/actions, public CMS APIs                                    | activities/alumni/CMS/forms/media tables                                                            |
| Reports and dashboards                 | /analytics, /reports, report export API                                                                                                         | features/reports services/components, /api/exports                                      | reports, alerts plus source-domain tables                                                           |
| Integrations and automation            | /integrations, /integrations/jobs, /integrations/webhooks, /settings/api-keys                                                                   | features/integrations, webhook API, internal job runner                                 | integrationConfigs, apiKeys, webhookEvents, integrationLogs, jobRuns                                |
| Import/export                          | /students/import, import error API, report export API                                                                                           | features/import-export, features/reports, /api/imports and /api/exports                 | importJobs, jobRuns, document/error and report data                                                 |
| Role portals                           | /teacher, /parent, /student                                                                                                                     | features/portals service/component                                                      | authorized joins over attendance, fees, assignments, marks, notices, transport and library          |
| Audit and operational controls         | /audit-logs, /platform/audit-logs, health endpoints                                                                                             | features/audit, lib/audit, health and job routes                                        | auditLogs, platformAuditLogs, session logs, rate-limit buckets and jobRuns                          |

## 2. Module-by-Module Findings

### 2.1 Platform Administration and Foundation

**Discovery map:** Frontend: /platform, /platform/audit-logs, /organizations, /campuses, /settings/academic-years, /settings/classes, /settings/sections, /settings/subjects. Backend: features/platform/services/platform.service.ts, features/platform/actions/platform.actions.ts, features/foundation/services/bootstrap.service.ts, features/foundation/services/academic-setup.service.ts. Data: organizations, campuses, academicYears, classes, sections, subjects, roles and permissions.

**Overall status:** 🟡 **Partial**

| Feature                                              | Status          | Severity | Evidence (file:line)                                                                                                               | Notes                                                                                                                                                                                                           |
| ---------------------------------------------------- | --------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Platform school overview, provisioning and lifecycle | ✅ **Complete** | Low      | features/platform/services/platform.service.ts:48-191; app/(platform)/platform/page.tsx:11-23                                      | The service counts schools/users, provisions a tenant in a transaction, creates the first campus/year/access defaults, issues an invitation, and uses an optimistic status predicate with a platform audit row. |
| First-school bootstrap                               | ✅ **Complete** | Low      | app/api/setup/bootstrap/route.ts:6-20; features/foundation/services/bootstrap.service.ts:11-23                                     | The public setup path validates a Firebase identity and transactionally creates the first organization, campus, academic year, roles and super administrator.                                                   |
| Academic setup and foundation CRUD                   | 🟡 **Partial**  | Medium   | features/foundation/services/academic-setup.service.ts:41-204; config/modules.ts:10; app/(dashboard)/[...modulePath]/page.tsx:5-16 | Dedicated academic setup services exist, but several configured foundation/access routes still resolve through the generic workspace and do not expose domain-specific behavior.                                |

**Details:**

1. The platform-admin slice is implemented in code, but school-detail management, deletion scheduling and entitlements are not represented by a dedicated service in the discovered platform files. Unverified — requires manual confirmation against the intended platform operating model.
2. The generic settings/access routes are covered by F-022 below because their page is a generic record editor rather than typed configuration behavior.

### 2.2 Authentication, Users and RBAC

**Discovery map:** Frontend: /login, /register, /setup, /forgot-password, /verify-email, /invite/accept, /users and /users/[id]. Backend: app/api/auth/session, app/api/auth/logout, app/api/auth/campus, app/api/users/invite, app/api/users/invite/accept, lib/auth/guards.ts, features/users. Data: users, platformAdmins, roles, permissions, userCampusScopes, userClassSectionScopes, delegatedAccess, sessionLogs, platformSessionLogs, invitationTokens and loginAudits.

**Overall status:** ✅ **Complete**

| Feature                                                     | Status          | Severity | Evidence (file:line)                                                                                                                                       | Notes                                                                                                                                                                               |
| ----------------------------------------------------------- | --------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Firebase login/session exchange and email verification gate | ✅ **Complete** | Low      | app/api/auth/session/route.ts:12-101; features/auth/components/auth-form.tsx:12-15                                                                         | The route rate-limits, verifies the Firebase token/email, resolves the local user or platform admin, creates a session record and sets a secure cookie; the client surfaces errors. |
| Logout, session revocation and dashboard gate               | ✅ **Complete** | Low      | app/api/auth/logout/route.ts:9-48; lib/auth/guards.ts:99-128; app/(dashboard)/layout.tsx:5-8                                                               | The dashboard requires an active local session and logout marks the corresponding session inactive.                                                                                 |
| Tenant, campus, class and delegated permission enforcement  | ✅ **Complete** | Low      | lib/auth/guards.ts:23-128; lib/rbac/permissions.ts:5-10; config/permissions.ts:1-75                                                                        | Effective permissions are loaded from tenant role rows/defaults and delegations; the role name is not itself a global bypass.                                                       |
| User invitation, activation and access administration       | ✅ **Complete** | Low      | features/users/services/provision.service.ts:13-57; features/users/services/invitation.service.ts:29-76; features/users/services/access.service.ts:191-313 | Provisioning, hashed invitation tokens, bounded role/scope edits and delegation revocation are implemented with error returns and audit writes.                                     |

**Details:**

1. No incompleteness finding was raised for the implemented authentication and RBAC boundary. Provider credentials, Firebase project configuration and production session-cookie behavior remain deployment evidence, not claims made from source alone.

### 2.3 Admissions and Enrollment

**Discovery map:** Frontend: /admissions/enquiries, /admissions/applications, /admissions/approvals, /admissions/seat-matrix; configured but generic: /admissions/tests and /admissions/reports. Backend: features/admissions/services/admissions.service.ts and approval.service.ts, features/admissions/actions. Data: admissionsEnquiries, applications, admissionFollowUps, admissionAssessments and admissions catalog tables.

**Overall status:** 🟡 **Partial**

| Feature                                                                     | Status                    | Severity | Evidence (file:line)                                                                                                      | Notes                                                                                                                                                                    |
| --------------------------------------------------------------------------- | ------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Enquiries, applications, follow-ups and assessments                         | ✅ **Complete**           | Medium   | features/admissions/services/admissions.service.ts:87-184, 291-385; features/admissions/schemas/admissions.schema.ts:3-87 | Typed schemas and service methods cover create/update/review/follow-up/assessment operations with tenant and campus checks.                                              |
| Approval into student, enrollment, guardian, admission and timeline records | ✅ **Complete**           | Low      | features/admissions/services/approval.service.ts:29-171                                                                   | Approval is transactional and validates application state, target academic context and capacity before creating connected records.                                       |
| Admission document verification/completeness workflow                       | 🟡 **Partial**            | High     | config/modules.ts:11; db/schema/catalog-academics.ts:3-5; docs/REMAINING_FEATURES.md:68-73                                | A document table and generic upload boundary exist, but the discovered admissions feature has no dedicated document verification/rejection/completeness service or page. |
| Admissions test/report routes                                               | 🟠 **Stub / Placeholder** | High     | config/modules.ts:11; app/(dashboard)/[...modulePath]/page.tsx:5-16; features/shared/actions/module.actions.ts:36-70      | The configured routes render generic name/note/status records in moduleRecords rather than assessments or admissions reports.                                            |

**Details:**

1. The happy-path admission conversion is real and connected to SIS. The missing pieces are the applicant-document lifecycle, completeness decisions and dedicated test/report surfaces.
2. F-022 describes the generic route mechanism used by /admissions/tests and /admissions/reports; the route is reachable, so this is not a dead-link finding.

#### F-024 — Admission document verification and completeness are not connected

Severity: High. config/modules.ts:11 and db/schema/catalog-academics.ts:3-5 expose admission-document concepts, while the discovered features/admissions services/actions cover enquiry, application, assessment and approval but do not provide a document verification, rejection-reason or completeness workflow. docs/REMAINING_FEATURES.md:68-73 lists these items as open.

### 2.4 Student Information System and Documents

**Discovery map:** Frontend: /students, /students/new, /students/[id]/profile, /guardians, /documents, /enrollment, /timeline, /attendance, /fees, /results, /certificates, and /students/import. Backend: features/students, features/documents, /api/uploads/signature, /api/certificates/verify. Data: students, guardians, studentGuardianLinks, enrollments, documentFiles, studentMedicalProfiles, studentTimelineEvents, certificateTemplates and studentCertificates.

**Overall status:** 🟡 **Partial**

| Feature                                                                               | Status          | Severity | Evidence (file:line)                                                                                                                                        | Notes                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------- | --------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Student create/update, guardian links, enrollment transfer, timeline and certificates | ✅ **Complete** | Medium   | features/students/services/students.service.ts:92-230, 305-652; features/students/actions/student.actions.ts:27-139                                         | Typed actions and transaction boundaries connect the student master record to enrollment, guardians, timeline, medical and certificate records.                                                                                  |
| Scoped student read access                                                            | ✅ **Complete** | Low      | features/students/services/students.service.ts:59-118, 233-268                                                                                              | Parent/student/teacher permitted-student resolution is applied to list/profile reads.                                                                                                                                            |
| Document upload signature and metadata verification                                   | 🟡 **Partial**  | High     | app/api/uploads/signature/route.ts:13-36; features/documents/actions/document.actions.ts:19-73; features/documents/services/document-scope.service.ts:15-42 | The server validates Cloudinary ownership, entity scope, format/size and sensitive health permission, but the student detail page exposes a Documents tab without a rendered document-management workflow.                       |
| Student attendance, fee and result history tabs                                       | 🟡 **Partial**  | High     | app/(dashboard)/students/[id]/[[...studentTab]]/page.tsx:17, 94-96                                                                                          | The page lists these tabs but renders links to broad module workspaces rather than a student-filtered history query.                                                                                                             |
| Student update authorization                                                          | 🟡 **Partial**  | High     | features/students/services/students.service.ts:271-302; features/students/actions/student.actions.ts:32-52                                                  | updateStudentRecord checks organization/campus and students:update but does not reuse resolvePermittedStudentIds, unlike profile reads; a low-privilege principal granted that permission could update another in-scope student. |

**Details:**

1. F-006 is a server-side authorization consistency defect, not merely a hidden-button issue. The update path must enforce the same permitted-student/ownership boundary used by getStudentProfile.
2. F-007 is a common-path completeness defect: the URL exists and the tab label exists, but no student-specific attendance, fee or result dataset is queried by the page.
3. Health-record document creation separately asks for health:view_sensitive, but the ordinary health profile page does not; that independent read exposure is F-013.

#### F-025 — Student document tab has no dedicated upload/list workflow

Severity: High. app/(dashboard)/students/[id]/[[...studentTab]]/page.tsx:17, 64-88 includes a documents tab in the student detail navigation but does not render document files or upload controls; the available backend boundary is limited to features/documents/actions/document.actions.ts:19-73 and app/api/uploads/signature/route.ts:13-36.

#### F-006 — Student update authorization is broader than student read authorization

Severity: High. The update service uses organization/campus and students:update checks at features/students/services/students.service.ts:271-302, while permitted-student resolution is used at features/students/services/students.service.ts:59-118 and 233-268. This creates an authorization mismatch for parent, student, teacher or delegated users who receive students:update.

#### F-007 — Student history tabs are links, not student-specific history

Severity: High. app/(dashboard)/students/[id]/[[...studentTab]]/page.tsx:17, 94-96 renders the attendance, fees and results tabs as LinkedWorkspace links to /attendance/students, /fees/invoices and /exams/results; the current page does not query or display the selected student's history.

### 2.5 Academics and Scheduling

**Discovery map:** Frontend: /academics/curriculum is a physical page; /academics/lesson-plans, /teacher-allocation, /timetable, /substitutions, /assignments and /resources are configured routes. Backend: no features/academics directory was discovered; the physical curriculum page imports ModuleWorkspace. Data: db/schema/academics.ts and db/schema/catalog-academics.ts.

**Overall status:** 🟠 **Stub / Placeholder**

| Feature                                                                               | Status                    | Severity | Evidence (file:line)                                                                                                 | Notes                                                                                                                                                         |
| ------------------------------------------------------------------------------------- | ------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Curriculum route                                                                      | 🟠 **Stub / Placeholder** | Critical | app/(dashboard)/academics/curriculum/page.tsx:1-5; features/shared/components/module-workspace.tsx:41-69             | The route calls the generic ModuleWorkspace and lists moduleRecords; no curriculum service/action is called.                                                  |
| Lesson plans, teacher allocation, timetable, substitutions, assignments and resources | 🟠 **Stub / Placeholder** | Critical | config/modules.ts:17; app/(dashboard)/[...modulePath]/page.tsx:5-16; features/shared/actions/module.actions.ts:36-70 | These routes are configured and reachable, but their create/update/archive actions only persist generic name/note/status values.                              |
| Academic schema records                                                               | 🔴 **Missing**            | High     | db/schema/academics.ts:3-4; db/schema/catalog-academics.ts:7-20                                                      | Typed lesson-plan/assignment and catalog timetable/allocation/substitution tables exist, but no corresponding academic feature service/action/page was found. |

**Details:**

1. This is the clearest route-to-implementation mismatch in the project. The UI route exists, but the data path is a generic extension record, not a curriculum, timetable, clash, assignment or resource workflow.
2. F-001 is Critical because the configured academic routes present as available to users while omitting the scheduling and teaching business rules expected from those routes.

#### F-001 — Academic core routes use the generic record workspace

Severity: Critical. config/modules.ts:17 registers the academic routes; app/(dashboard)/academics/curriculum/page.tsx:1-5 and app/(dashboard)/[...modulePath]/page.tsx:5-16 route them into ModuleWorkspace; features/shared/services/module-records.service.ts:8-32 reads moduleRecords and features/shared/actions/module.actions.ts:36-70 writes only generic fields. No academic domain service is invoked.

### 2.6 Attendance and Student Care

**Discovery map:** Frontend: /attendance/students, /attendance/leave, /attendance/corrections, /attendance/discipline; configured: /attendance/staff, /wellbeing and /reports. Backend: features/attendance/services/attendance.service.ts, leave.service.ts, discipline.service.ts, attendance-workspace.service.ts. Data: studentAttendanceSessions, studentAttendanceRecords, attendanceCorrectionRequests, leaveRequests, disciplineIncidents and catalog staff/wellbeing tables.

**Overall status:** 🟡 **Partial**

| Feature                                                               | Status                    | Severity | Evidence (file:line)                                                                                                 | Notes                                                                                                                                                           |
| --------------------------------------------------------------------- | ------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Student daily/period attendance marking                               | ✅ **Complete**           | Medium   | features/attendance/services/attendance.service.ts:18-155; features/attendance/schemas/attendance.schema.ts:2-11     | The service validates student/enrollment/academic-year scope, teacher class scope, duplicate records and correction cutoff, and writes an absence notification. |
| Correction review, leave and discipline workflows                     | ✅ **Complete**           | Medium   | features/attendance/services/attendance.service.ts:158-198; features/attendance/actions/attendance.actions.ts:14-120 | Server actions enforce mark/request/approve permissions and return actionable errors.                                                                           |
| Staff attendance, period-wise modes, wellbeing and attendance reports | 🟠 **Stub / Placeholder** | High     | config/modules.ts:18; db/schema/catalog-academics.ts:21-24; app/(dashboard)/[...modulePath]/page.tsx:5-16            | The planned paths/tables exist, but no dedicated staff-attendance or wellbeing service/page was found; the configured routes use generic records.               |
| Low-attendance alerts and parent absence reporting                    | 🔴 **Missing**            | High     | docs/REMAINING_FEATURES.md:90-95, 181-185; config/modules.ts:18                                                      | Current attendance code emits an in-app absence event per mark but does not calculate low-attendance thresholds or expose a dedicated report/alert workflow.    |

**Details:**

1. The student marking path is transactionally implemented and has unit/integration coverage, but that does not establish staff, period-wise, low-attendance or report completion.
2. F-008 covers the missing attendance extensions and is required for the staff/report routes to stop being generic.

#### F-008 — Staff, wellbeing, low-attendance and report routes are not implemented

Severity: High. config/modules.ts:18 registers these routes, db/schema/catalog-academics.ts:21-24 defines staffAttendanceRecords, leaveTypes, leaveBalances and wellbeingRecords, but no feature service/action consumes those tables. docs/REMAINING_FEATURES.md:90-95 explicitly lists the workflows as open.

### 2.7 Exams and Grading

**Discovery map:** Frontend: /exams/planning, /exams/marks, /exams/results; configured: /exams/schedules, /report-cards, /question-bank and /online-tests. Backend: features/exams/services/exams.service.ts, exam-workspace.service.ts and actions. Data: examTypes, examSchemes, exams, examSchedules, marksEntries, resultPublications, gradeRules, reportCards and questionBankItems.

**Overall status:** 🟡 **Partial**

| Feature                                                            | Status                    | Severity | Evidence (file:line)                                                                                  | Notes                                                                                                           |
| ------------------------------------------------------------------ | ------------------------- | -------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Exam planning, scheduling, status gates and marks entry            | ✅ **Complete**           | Medium   | features/exams/services/exams.service.ts:28-235; features/exams/components/marks-entry-form.tsx:24-42 | The service validates schedule windows, class overlap, enrollment, subject/teacher assignment and marks bounds. |
| Result publication and published-result visibility                 | ✅ **Complete**           | Medium   | features/exams/services/exams.service.ts:238-267; app/(dashboard)/exams/results/page.tsx:8-14         | Publication requires the expected workflow state and marks coverage.                                            |
| Report cards, bulk/moderated marks, question bank and online tests | 🟠 **Stub / Placeholder** | High     | config/modules.ts:19; db/schema/exams.ts:11-12; app/(dashboard)/[...modulePath]/page.tsx:5-16         | Configured pages and schema tables exist, but no dedicated service/action was found for these workflows.        |

**Details:**

1. F-009 must be tested as a negative acceptance test against the current generic baseline and as a full workflow after remediation.
2. Grade rules and reportCards are present in the schema, but schema existence alone is not counted as an implemented grading/report-card feature.

#### F-009 — Exam deep-feature routes are not connected to domain services

Severity: High. config/modules.ts:19 registers report-card/question-bank/online-test paths; db/schema/exams.ts:11-12 defines reportCards and questionBankItems; the route fallback at app/(dashboard)/[...modulePath]/page.tsx:5-16 and generic actions at features/shared/actions/module.actions.ts:36-70 handle the pages instead of exam-specific logic.

### 2.8 Fees and Finance

**Discovery map:** Frontend: /fees/invoices and /fees/payments; configured: /fees/configuration, /receipts, /refunds, /defaulters, /accounts/chart-of-accounts, /ledger, /expenses, /reconciliation, /reports and /donations. Backend: features/finance services/actions. Data: feeHeads, feeStructures, feeInstallments, feeInvoices, feeInvoiceItems, feePayments, feeReceipts, feeRefunds, ledgerEntries, chartOfAccounts, expenses and bankAccounts.

**Overall status:** 🟡 **Partial**

| Feature                                                                           | Status                    | Severity | Evidence (file:line)                                                                                                                                                 | Notes                                                                                                                                                       |
| --------------------------------------------------------------------------------- | ------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Manual invoice creation, payment collection, receipt and ledger posting           | ✅ **Complete**           | Medium   | features/finance/services/finance-workspace.service.ts:82-123; features/finance/services/payment.service.ts:11-94; features/finance/actions/payment.actions.ts:10-23 | Money is represented in minor units, payment idempotency is stored, invoice balance is guarded and ledger/receipt writes are transactional.                 |
| Refunds                                                                           | ✅ **Complete**           | Medium   | features/finance/services/refund.service.ts:10-81                                                                                                                    | Refund amount and remaining refundable balance are checked, invoice state is updated optimistically and ledger reversal rows are inserted.                  |
| Fee heads, structures, installments, concessions/late fees and accounting screens | 🟠 **Stub / Placeholder** | Critical | config/modules.ts:20; db/schema/finance.ts:4-15; app/(dashboard)/[...modulePath]/page.tsx:5-16                                                                       | The schema is substantially broader than the feature services; the configured routes use generic records instead of fee-structure or accounting operations. |
| Online payment gateway                                                            | 🟠 **Stub / Placeholder** | Critical | lib/integrations/payment-provider.ts:1-3; features/finance/components/payment-form.tsx:30-47                                                                         | The payment action posts a manually selected method to the local finance service; no concrete provider adapter or gateway call is implemented.              |

**Details:**

1. The current finance implementation is a safe manual collection/ledger slice, not a complete fee-management product. F-002 is Critical because fee structures and accounting routes are exposed but not operational.
2. F-004 covers the absence of a payment provider adapter; local manual collection must not be interpreted as a production online payment integration.

#### F-002 — Fee configuration and accounting routes use the generic record workspace

Severity: Critical. config/modules.ts:20 lists fee configuration, defaulters, chart-of-accounts, ledger, expenses, reconciliation and donations; db/schema/finance.ts:4-15 defines the underlying tables; app/(dashboard)/[...modulePath]/page.tsx:5-16 routes configured-but-undedicated paths to the generic workspace, whose actions at features/shared/actions/module.actions.ts:36-70 write only moduleRecords.

### 2.9 Staff, HR and Payroll

**Discovery map:** Frontend: /hr/employees, /payroll/runs and /payroll/payslips; configured: /hr/recruitment, /documents, /performance, /training and /payroll/structures. Backend: features/hr/services/hr.service.ts and actions. Data: employees, payrollRuns, payrollPayslips and catalog people tables.

**Overall status:** 🟡 **Partial**

| Feature                                                                             | Status                    | Severity | Evidence (file:line)                                                                                    | Notes                                                                                                                    |
| ----------------------------------------------------------------------------------- | ------------------------- | -------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Employee records                                                                    | ✅ **Complete**           | Low      | features/hr/services/hr.service.ts:27-74; app/(dashboard)/hr/employees/page.tsx:8-18                    | Employee creation validates unique employee numbers and can link an ERP user.                                            |
| Payroll run snapshot and payslips                                                   | 🟡 **Partial**            | Critical | features/hr/services/hr.service.ts:107-204; features/hr/actions/hr.actions.ts:34-44                     | A transactional snapshot is generated, but deductions are always zero and no tax/leave/statutory calculation is present. |
| Recruitment, employee documents, performance, training, salary structures and leave | 🟠 **Stub / Placeholder** | High     | config/modules.ts:21; app/(dashboard)/[...modulePath]/page.tsx:5-16; docs/REMAINING_FEATURES.md:110-117 | These routes are configured but no dedicated domain service was found.                                                   |

**Details:**

1. Payroll persistence and immutability are implemented, but the amount calculation is not complete enough for payroll use.
2. A green typecheck or unit suite cannot validate payroll correctness while the algorithm intentionally sets deductions to zero.

#### F-003 — Payroll deductions are hard-coded to zero

Severity: Critical. features/hr/services/hr.service.ts:149-164 calculates grossMinor from salaryMinor, sets const deductionsMinor = 0, and derives netMinor as grossMinor minus zero. No deduction, tax, leave, allowance or statutory input is read in this path.

### 2.10 Communication

**Discovery map:** Frontend: /communication/messages, /communication/notifications and /communication/logs; configured: /communication/templates, /notices, /events and /ptm. Backend: features/communication/services/communication.service.ts and actions. Data: messages, notificationEvents and notices.

**Overall status:** 🟡 **Partial**

| Feature                                                               | Status                    | Severity | Evidence (file:line)                                                                                                           | Notes                                                                                                                                    |
| --------------------------------------------------------------------- | ------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| In-app message drafting, publishing, recipient fan-out and read state | ✅ **Complete**           | Medium   | features/communication/services/communication.service.ts:15-132; features/communication/actions/communication.actions.ts:10-43 | The implementation creates messages, writes scoped in-app notification events in a transaction and supports read state/delivery listing. |
| Email, SMS, push, WhatsApp or other outbound delivery                 | 🟠 **Stub / Placeholder** | High     | features/communication/services/communication.service.ts:43-84; lib/integrations/notification-provider.ts:1-3                  | Publishing hard-codes channel in_app; the notification provider file contains only an interface.                                         |
| Templates, notices, events and PTM workflows                          | 🟠 **Stub / Placeholder** | High     | config/modules.ts:24; db/schema/operations.ts:4; app/(dashboard)/[...modulePath]/page.tsx:5-16                                 | The routes/schema exist, but the discovered communication feature has no dedicated service for these configured pages.                   |

**Details:**

1. The current delivery log records local in-app event creation, not successful delivery by an external provider.
2. F-010 is the communication-specific acceptance gap; F-004 is the cross-cutting adapter gap.

#### F-010 — Communication is limited to in-app events

Severity: High. features/communication/services/communication.service.ts:43-84 inserts notificationEvents with channel "in_app" and status "sent"; lib/integrations/notification-provider.ts:1-3 defines only NotificationProvider methods, with no implementation or call site.

### 2.11 Library

**Discovery map:** Frontend: /library/catalogue, /copies, /issue-return, /reservations and /digital-resources; configured: /library/fines and /reports. Backend: features/library/services/library.service.ts and actions. Data: libraryItems, libraryCopies, libraryIssueTransactions and catalog reservation/fine/resource tables.

**Overall status:** 🟡 **Partial**

| Feature                                                    | Status                    | Severity | Evidence (file:line)                                                                                    | Notes                                                                                                                                                                        |
| ---------------------------------------------------------- | ------------------------- | -------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Catalogue, copies, issue, return, renewal and reservations | ✅ **Complete**           | Medium   | features/library/services/library.service.ts:33-313; features/library/actions/library.actions.ts:18-105 | The service validates borrower scope, copy availability, borrower limit and circulation state.                                                                               |
| Digital resources                                          | ✅ **Complete**           | Low      | features/library/services/library.service.ts:315-337                                                    | The feature has typed create/list operations.                                                                                                                                |
| Fines, shelf/metadata management and library reports       | 🟠 **Stub / Placeholder** | Medium   | config/modules.ts:25; db/schema/catalog-operations.ts:6; app/(dashboard)/[...modulePath]/page.tsx:5-16  | Fines and the configured report path have schema/config entries but no dedicated workflow in the discovered feature.                                                         |
| Borrower identity persistence                              | 🟡 **Partial**            | Medium   | db/schema/library.ts:8-19; features/library/services/library.service.ts:135-172                         | borrowerUserId is mandatory while a student issue writes the student ID into borrowerUserId as well as borrowerId; the model is ambiguous for downstream user/student joins. |

**Details:**

1. F-016 should be resolved by defining whether borrowerUserId is a user identity, making it nullable for student borrowers, or enforcing a typed relationship invariant.

#### F-016 — Library borrower identity is ambiguous

Severity: Medium. db/schema/library.ts:8-19 makes borrowerUserId notNull while also defining borrowerType and borrowerId; features/library/services/library.service.ts:135-172 writes input.borrowerId to borrowerUserId for both student and user borrower types.

### 2.12 Transport

**Discovery map:** Frontend: /transport/routes, /stops, /vehicles and /allocations; API: /api/transport/manifest; configured: /transport/drivers, /trips, /incidents and /reports. Backend: features/transport/services/transport.service.ts and actions. Data: transportRoutes, transportStops, vehicles, vehicleDocuments, routeAllocations and catalog driver/trip/boarding/incident tables.

**Overall status:** 🟡 **Partial**

| Feature                                                     | Status                    | Severity | Evidence (file:line)                                                                                                                          | Notes                                                                                                                                                                   |
| ----------------------------------------------------------- | ------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Routes, stops, vehicles, documents, allocation and manifest | ✅ **Complete**           | Medium   | features/transport/services/transport.service.ts:17-192; app/api/transport/manifest/route.ts:10-18                                            | The core slice validates vehicle capacity, route/stop scope, allocation status and exports a scoped manifest.                                                           |
| Drivers, trips, boarding, incidents, GPS and reports        | 🟠 **Stub / Placeholder** | High     | config/modules.ts:26; db/schema/catalog-operations.ts:10-14; lib/integrations/providers.ts:2-5; app/(dashboard)/[...modulePath]/page.tsx:5-16 | Configured pages and provider contracts exist, but no dedicated driver/trip/GPS workflow was found.                                                                     |
| Route capacity and allocation uniqueness under concurrency  | 🟡 **Partial**            | High     | features/transport/services/transport.service.ts:137-158; db/schema/transport.ts:4                                                            | Duplicate-student and capacity checks occur before the insert, and the schema has no unique active-allocation constraint; concurrent requests can both pass the checks. |

**Details:**

1. The service has good ordinary-path checks, but the capacity invariant is not protected by a transaction/conditional update or database uniqueness mechanism.
2. Campus behavior for organization-wide administrators must be tested explicitly because assertCampusScope permits organization-level permissions to operate across campus scope at features/transport/services/transport.service.ts:11-14.

#### F-011 — Transport capacity is check-then-insert

Severity: High. features/transport/services/transport.service.ts:146-158 counts active allocations and checks for an existing student before inserting; db/schema/transport.ts:4 has only non-unique indexes. Two concurrent allocations can exceed route.capacity or create duplicate active assignments.

### 2.13 Hostel and Canteen

**Discovery map:** Frontend: /hostel/rooms, /beds, /allotments and /canteen/menu, /transactions; configured: hostel buildings/visitors/outpasses/attendance/reports and canteen meal-plans/reports. Backend: features/hostel and features/canteen services/actions. Data: hostelRooms, hostelBeds, hostelAllotments, menu/transaction tables and catalog hostel/canteen tables.

**Overall status:** 🟡 **Partial**

| Feature                                                                       | Status                    | Severity | Evidence (file:line)                                                                                          | Notes                                                                                                                  |
| ----------------------------------------------------------------------------- | ------------------------- | -------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Hostel room/bed creation, allotment and checkout                              | 🟡 **Partial**            | Critical | features/hostel/services/hostel.service.ts:123-199; db/schema/hostel.ts:17-30                                 | The happy path exists, but bed occupancy and room capacity are checked outside an atomic insert invariant.             |
| Canteen menu and transaction register                                         | ✅ **Complete**           | Medium   | features/canteen/services/canteen.service.ts:16-60; features/canteen/actions/canteen.actions.ts:10-21         | Typed menu/transaction operations and tenant scope exist; meal plans and reports are not part of this dedicated slice. |
| Hostel buildings/visitors/outpasses/attendance/reports and meal plans/reports | 🟠 **Stub / Placeholder** | High     | config/modules.ts:25-28; db/schema/catalog-operations.ts:15-23; app/(dashboard)/[...modulePath]/page.tsx:5-16 | The routes/tables are present but no dedicated services/actions were found for the configured extensions.              |

**Details:**

1. The bedId is nullable in the schema and has only a non-unique index, so neither serial nor concurrent allocation is protected from reusing an active bed.
2. F-005 is a data-integrity blocker for residence operations.

#### F-005 — Hostel allocation does not enforce bed uniqueness atomically

Severity: Critical. features/hostel/services/hostel.service.ts:139-156 checks only the student’s existing allotment and room activeCount before inserting; db/schema/hostel.ts:21-30 defines bedId and a non-unique index but no active-bed uniqueness constraint. Two users can allocate the same bed, and the same bed can be reused after a stale count.

### 2.14 Inventory, Procurement and Assets

**Discovery map:** Frontend: /inventory/items, /stock-movements; /procurement/requisitions, /purchase-orders, /goods-receipts; /assets/register, /assignments, /maintenance, /depreciation. Backend: features/inventory, features/procurement and features/assets services/actions. Data: inventoryItems, stockMovements, suppliers and catalog categories/locations/purchasing/assets/maintenance/depreciation tables.

**Overall status:** 🟡 **Partial**

| Feature                                                    | Status                    | Severity | Evidence (file:line)                                                                                                                                 | Notes                                                                                                                                                                               |
| ---------------------------------------------------------- | ------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inventory item and stock movement controls                 | ✅ **Complete**           | Medium   | features/inventory/services/inventory.service.ts:11-117                                                                                              | Stock movement is transactional and rejects outbound quantities that would make stock negative; low-stock alerts are emitted.                                                       |
| Requisitions, purchase orders and goods receipts           | ✅ **Complete**           | Medium   | features/procurement/services/procurement.service.ts:31-177                                                                                          | Workflow transitions are validated and receipt posting updates inventory/stock movement in a transaction.                                                                           |
| Asset register, assignment, maintenance and depreciation   | ✅ **Complete**           | Medium   | features/assets/services/asset.service.ts:62-185                                                                                                     | The dedicated service covers asset lifecycle and optimistic assignment/depreciation updates.                                                                                        |
| Supplier, stock-location, vendor master and richer reports | 🟠 **Stub / Placeholder** | Medium   | db/schema/inventory.ts:4; db/schema/catalog-operations.ts:24-29; features/procurement/services/procurement.service.ts:78-99; config/modules.ts:25-28 | Suppliers/locations/vendors are represented in schema/config, but purchase orders store supplierName in detailsJson and the corresponding master/report routes use generic records. |

**Details:**

1. The operational core is connected, but the supplier identity is not normalized into the existing suppliers table. This can prevent reliable vendor history, reconciliation and referential reporting.

#### F-017 — Procurement supplier master is disconnected from purchase orders

Severity: Medium. db/schema/inventory.ts:4 defines suppliers, while features/procurement/services/procurement.service.ts:78-99 stores supplierName inside detailsJson and does not resolve a supplier record. The configured /procurement/vendors route is generic under config/modules.ts:31.

### 2.15 Health, Safety and Facilities

**Discovery map:** Frontend: /health/profiles, /clinic-visits; /safety/visitors, /gate-passes, /incidents, /evacuation; /facilities/bookings, /maintenance, /complaints. Backend: features/health, features/safety and features/facilities services/actions. Data: healthProfiles, clinicVisits and catalog visitor, gate-pass, security incident, evacuation and facility tables.

**Overall status:** 🟡 **Partial**

| Feature                                                                | Status                    | Severity | Evidence (file:line)                                                                                          | Notes                                                                                                                                                                                                      |
| ---------------------------------------------------------------------- | ------------------------- | -------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Health profiles and clinic visits                                      | 🟡 **Partial**            | High     | features/health/services/health.service.ts:27-110; app/(dashboard)/health/profiles/page.tsx:5-11              | The data service is tenant/campus scoped, but the page displays allergies/conditions after only requiring health:read even though health:view_sensitive is a distinct permission.                          |
| Visitor, gate-pass, incident and evacuation workflows                  | ✅ **Complete**           | Medium   | features/safety/services/safety.service.ts:22-83; features/safety/actions/safety.actions.ts:12-17             | Dedicated list/create/transition operations exist with schemas and scope checks.                                                                                                                           |
| Facility bookings, maintenance and complaints                          | 🟡 **Partial**            | High     | features/facilities/services/facilities.service.ts:19-42                                                      | Booking time windows are validated and maintenance/complaint transitions exist, but booking overlap is checked only against currently approved rows before an insert and is not rechecked during approval. |
| Medication, screening, richer safety and facility SLA/report workflows | 🟠 **Stub / Placeholder** | Medium   | config/modules.ts:33-36; db/schema/catalog-operations.ts:49-58; app/(dashboard)/[...modulePath]/page.tsx:5-16 | Configured extensions and catalog tables do not have dedicated services/pages in the discovered code.                                                                                                      |

**Details:**

1. F-013 is a sensitive-data authorization issue because a separate sensitive permission exists and is used by document uploads, but not by the health profile read page.
2. F-012 is a concurrency/data-integrity issue: two requested bookings can overlap, and two approvals can be made without a fresh conflict check.

#### F-013 — Health profile reads do not require health:view_sensitive

Severity: High. config/permissions.ts:11-18 generates health:view_sensitive, and features/documents/actions/document.actions.ts:31-33 explicitly requires it for health records. However, app/(dashboard)/health/profiles/page.tsx:5-11 requires only health:read and renders allergies/conditions returned by features/health/services/health.service.ts:36-51.

#### F-012 — Facility booking overlap is not protected at approval time

Severity: High. features/facilities/services/facilities.service.ts:21-26 checks only approved rows when creating a requested booking, while transitionFacilityBooking at line 32 changes requested to approved without repeating the overlap check or using a serialized/conditional invariant.

### 2.16 Activities, Alumni and CMS

**Discovery map:** Frontend: /activities/achievements, /clubs, /clubs/memberships, /sports; /alumni/profiles, /events, /mentorship, /jobs, /donations; /cms/pages, /media, /forms, /submissions. Configured but generic: activities houses/competitions, CMS news/galleries/settings. Backend: features/community/services/community.service.ts, actions and public CMS route handlers. Data: activities, alumni profiles/events/mentorship/jobs/donations, cmsPages, cmsMedia, forms and formSubmissions.

**Overall status:** 🟡 **Partial**

| Feature                                                    | Status                    | Severity | Evidence (file:line)                                                                                                                     | Notes                                                                                                                                                                      |
| ---------------------------------------------------------- | ------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clubs, achievements, sports, alumni and CMS page/form core | ✅ **Complete**           | Medium   | features/community/services/community.service.ts:29-80, 92-112; features/community/actions/community.actions.ts:13-26                    | Dedicated typed services/actions exist for the implemented core slices, including CMS publication transitions and public form/page access.                                 |
| CMS form validation and public submission protections      | ✅ **Complete**           | Low      | features/community/services/community.service.ts:76-112; app/api/public/cms/forms/[id]/route.ts:10-35                                    | JSON field definitions are bounded, public submissions are rate-limited and the public endpoint applies a honeypot/validation boundary.                                    |
| Houses, competitions, news, galleries and CMS settings     | 🟠 **Stub / Placeholder** | Medium   | config/modules.ts:38-41; app/(dashboard)/[...modulePath]/page.tsx:5-16; db/schema/foundation.ts:33-35; db/schema/catalog-people.ts:18-19 | Configured paths without dedicated pages/services are handled by the generic workspace.                                                                                    |
| CMS media provenance                                       | 🟡 **Partial**            | Medium   | features/community/schemas/community.schema.ts:61-66; features/community/services/community.service.ts:72-74                             | Media accepts any syntactically valid URL and stores it; unlike document actions, it does not verify that the URL/public ID is a Cloudinary asset belonging to the tenant. |

**Details:**

1. The public CMS core is real, but CMS media and several community subroutes are not equivalent to a complete publishing/media-management module.
2. F-018 is an integrity/security acceptance test rather than proof that stored media is currently exploitable; rendering and CSP behavior require manual confirmation.

#### F-018 — CMS media URL is not verified by the upload policy

Severity: Medium. features/community/schemas/community.schema.ts:61-66 validates secureUrl only as a URL, and features/community/services/community.service.ts:72-74 stores secureUrl/publicId without calling verifyCloudinaryAsset or checking the tenant upload prefix.

### 2.17 Reports, Analytics and Dashboards

**Discovery map:** Frontend: /analytics and /reports; configured: analytics drill-downs, /reports/scheduled, /alerts and /data-quality. Backend: features/reports/services/dashboard.service.ts, report.service.ts, /api/exports. Data: reports, alerts and source-domain tables.

**Overall status:** 🟡 **Partial**

| Feature                                                      | Status                    | Severity | Evidence (file:line)                                                                                        | Notes                                                                                                                                         |
| ------------------------------------------------------------ | ------------------------- | -------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Scoped dashboard metrics and six-month trends                | ✅ **Complete**           | Medium   | features/reports/services/dashboard.service.ts:16-117; app/(dashboard)/analytics/page.tsx:8-18              | The dashboard queries tenant/campus-scoped attendance, finance, student, transport, hostel and alert data.                                    |
| Operational report catalog and CSV/XLSX/HTML exports         | ✅ **Complete**           | Medium   | features/reports/services/report.service.ts:29-260; app/api/exports/route.ts:10-54; lib/exports/csv.ts:1-14 | Eleven bounded report types are connected to source tables and exports are permission-gated and audited.                                      |
| Scheduled reports, alerts, data-quality and drill-down pages | 🟠 **Stub / Placeholder** | Medium   | config/modules.ts:43; db/schema/catalog-platform.ts:18-20; app/(dashboard)/[...modulePath]/page.tsx:5-16    | The routes/schema are present, but no dedicated scheduled-report/alert/data-quality service was found.                                        |
| PDF export                                                   | 🔴 **Missing**            | Medium   | app/api/exports/route.ts:27-42; lib/exports/pdf.ts:10-13                                                    | The branch named for print output returns text/html, uses an .html extension and calls renderPdfReadyHtml; it does not generate a PDF binary. |

**Details:**

1. The report catalog is useful current functionality, but its source coverage is not evidence that every configured report/alert route is complete.
2. HTML print output is correctly labeled as HTML in the current page; it is still a missing PDF capability if PDF is part of the intended ERP scope.

#### F-019 — Scheduled insights and PDF output are not implemented

Severity: Medium. config/modules.ts:43 and db/schema/catalog-platform.ts:18-20 expose scheduledReports/alerts/data-quality concepts, while app/(dashboard)/[...modulePath]/page.tsx:5-16 handles the configured routes generically. app/api/exports/route.ts:27-42 and lib/exports/pdf.ts:10-13 return HTML for the print branch, not a PDF file.

### 2.18 Integrations and Automation

**Discovery map:** Frontend: /integrations, /integrations/jobs, /integrations/webhooks, /settings/api-keys; configured provider routes: /integrations/payment, /notifications, /hardware and /logs. Backend: features/integrations, /api/integrations/webhooks/[provider], /api/internal/jobs/run, lib/integrations. Data: integrationConfigs, apiKeys, webhookEvents, integrationLogs and jobRuns.

**Overall status:** 🟡 **Partial**

| Feature                                                         | Status                    | Severity | Evidence (file:line)                                                                                                                                   | Notes                                                                                                                                                                 |
| --------------------------------------------------------------- | ------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Encrypted tenant configuration and API-key issue/revoke         | ✅ **Complete**           | Medium   | features/integrations/services/integration.service.ts:13-95; features/integrations/actions/integration.actions.ts:8-78                                 | Provider configuration is encrypted, API key secrets are hashed and returned once, and mutation actions are permission-gated/audited.                                 |
| Signed, rate-limited, deduplicated webhook intake               | 🟡 **Partial**            | High     | app/api/integrations/webhooks/[provider]/route.ts:8-23; features/integrations/services/integration.service.ts:97-146; db/schema/catalog-platform.ts:19 | HMAC validation, payload encryption and a duplicate lookup exist, but the code checks then inserts and the generic webhook table has no unique event-code constraint. |
| Durable job queue and internal worker endpoint                  | ✅ **Complete**           | Medium   | lib/jobs/job-store.ts:22-153; app/api/internal/jobs/run/route.ts:9-35                                                                                  | Idempotency, lease/claim predicates, backoff and a timing-safe internal secret are implemented. Worker deployment is not verified.                                    |
| Payment, notification, hardware, GPS, LMS and calendar adapters | 🟠 **Stub / Placeholder** | Critical | lib/integrations/payment-provider.ts:1-3; lib/integrations/notification-provider.ts:1-3; lib/integrations/providers.ts:2-5                             | The discovered files define interfaces only; no concrete provider implementation or call site was found.                                                              |

**Details:**

1. F-004 is a production capability gap. A boundary/interface is not a working payment, SMS, notification, GPS, hardware, LMS or calendar integration.
2. F-015 is a separate idempotency/data-integrity concern in webhook intake.

#### F-004 — Production payment, notification, hardware, GPS, LMS and calendar adapters are not implemented

Severity: Critical. lib/integrations/payment-provider.ts:1-3, lib/integrations/notification-provider.ts:1-3 and lib/integrations/providers.ts:2-5 contain only TypeScript interfaces. The current payment/communication code does not call an external adapter.

#### F-015 — Webhook duplicate protection is check-then-insert

Severity: High. features/integrations/services/integration.service.ts:121-146 queries for an existing provider:event code and then inserts a new webhookEvents row; db/schema/catalog-shared.ts:13-23 and db/schema/catalog-platform.ts:19 provide indexes but no unique constraint on organization/provider event code. Concurrent duplicate deliveries can race.

### 2.19 Import and Export

**Discovery map:** Frontend: /students/import and import error download. Backend: features/import-export, /api/imports/students and /api/imports/students/[id]/errors, report export API. Data: importJobs, jobRuns and source-domain tables.

**Overall status:** 🟡 **Partial**

| Feature                                                        | Status          | Severity | Evidence (file:line)                                                                                                                                                    | Notes                                                                                                                                        |
| -------------------------------------------------------------- | --------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Bounded student CSV import with row errors and queued progress | ✅ **Complete** | Medium   | features/import-export/services/student-import.service.ts:18-171; features/import-export/services/student-import-parser.ts:5-39; app/api/imports/students/route.ts:8-19 | Row validation, duplicate detection, a 1,000-row cap, idempotent queueing and downloadable error rows are connected.                         |
| Student import UI file contract                                | 🟡 **Partial**  | Medium   | features/import-export/components/student-import-form.tsx:7-13; features/import-export/services/student-import-parser.ts:13-18                                          | The parser supports workbooks, but the user-facing form accepts and posts only CSV text.                                                     |
| Non-student imports and background export jobs/PDF             | 🔴 **Missing**  | Medium   | docs/REMAINING_FEATURES.md:198-203; app/api/exports/route.ts:27-42                                                                                                      | No employee/fee/marks/inventory import workflow was found, and exports are synchronous CSV/XLSX/HTML rather than queued PDF/background jobs. |

**Details:**

1. Current student import is a valid implemented slice; it should not be generalized to all ERP data imports.
2. F-020 is an explicit scope gap, not a claim that the student CSV workflow is broken.

#### F-020 — Import/export coverage stops at student CSV and synchronous report files

Severity: Medium. docs/REMAINING_FEATURES.md:198-203 lists non-student imports, PDF and background exports as open; app/api/imports/students/route.ts:8-19 accepts only the student CSV workflow, and app/api/exports/route.ts:27-42 returns synchronous CSV/XLSX/HTML responses.

### 2.20 Role Portals

**Discovery map:** Frontend: /teacher, /parent and /student. Backend: app/(dashboard)/teacher/page.tsx, parent/page.tsx, student/page.tsx, features/portals/services/portal.service.ts and features/portals/components/portal-dashboard.tsx. Data: scoped joins across students, attendance, fees, assignments, marks, notifications, routes, library loans and lesson plans.

**Overall status:** 🟡 **Partial**

| Feature                                                                                     | Status                    | Severity | Evidence (file:line)                                                                                                                                                | Notes                                                                                                                                              |
| ------------------------------------------------------------------------------------------- | ------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Teacher, parent and student dashboard snapshot                                              | ✅ **Complete**           | Medium   | app/(dashboard)/teacher/page.tsx:1-2; app/(dashboard)/parent/page.tsx:1-2; app/(dashboard)/student/page.tsx:1-2; features/portals/services/portal.service.ts:19-117 | Each page calls a server-side scoped snapshot and the service uses permitted student IDs for linked data.                                          |
| Portal role boundary                                                                        | 🟡 **Partial**            | High     | app/(dashboard)/teacher/page.tsx:1-2; app/(dashboard)/parent/page.tsx:1-2; app/(dashboard)/student/page.tsx:1-2; features/portals/services/portal.service.ts:19-22  | Each page checks only portals:read and passes a hard-coded portal string; it does not assert that the logged-in role matches the requested portal. |
| Portal subpages for timetable, homework, fees/receipts, PTM, notices, documents and support | 🟠 **Stub / Placeholder** | Medium   | features/portals/components/portal-dashboard.tsx:11-18; docs/REMAINING_FEATURES.md:207-211                                                                          | Dashboard cards link to broader configured routes; dedicated portal subpage workflows are not present.                                             |

**Details:**

1. F-014 requires direct URL tests for every role, not only navigation tests. Server authorization must reject a parent opening /teacher and a teacher opening /parent unless that cross-view behavior is explicitly intended.

#### F-014 — Portal pages do not enforce the requested role

Severity: High. app/(dashboard)/teacher/page.tsx:1-2, parent/page.tsx:1-2 and student/page.tsx:1-2 all call requirePermission("portals:read") without checking user.role. features/portals/services/portal.service.ts:19-22 accepts the portal argument from the page and does not validate it against the current role.

### 2.21 Audit and Operational Controls

**Discovery map:** Frontend: /audit-logs and /platform/audit-logs; backend: features/audit/services/audit.service.ts, lib/audit/audit-log.ts, health route handlers and the internal job endpoint. Data: auditLogs, platformAuditLogs, session logs, rateLimitBuckets and jobRuns.

**Overall status:** 🟡 **Partial**

| Feature                                                                               | Status          | Severity | Evidence (file:line)                                                                                                                       | Notes                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------- | --------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tenant and platform audit log records/views                                           | ✅ **Complete** | Low      | features/audit/services/audit.service.ts:7-19; app/(dashboard)/audit-logs/page.tsx:8-20; app/(platform)/platform/audit-logs/page.tsx:26-29 | Audit list services and platform audit rows are implemented and scoped; mutation services write audit records in the inspected modules.                                                     |
| Health probes and worker safety boundary                                              | ✅ **Complete** | Low      | app/api/health/live/route.ts:3-5; app/api/health/ready/route.ts:14-26; app/api/internal/jobs/run/route.ts:9-35                             | Liveness/readiness and timing-safe internal job authentication exist.                                                                                                                       |
| Production observability, alert routing, retention and authenticated browser coverage | 🟡 **Partial**  | Medium   | docs/REMAINING_FEATURES.md:237-249; tests/e2e/smoke.spec.ts:1-15                                                                           | The repository has audit/health primitives and only three unauthenticated smoke tests; production metrics/tracing/error routing and broad authenticated browser coverage are not evidenced. |

**Details:**

1. Audit records are not equivalent to an operational observability platform. Deployment dashboards, alerts, tracing, retention and incident drills remain Unverified — requires manual confirmation.
2. F-023 records the local E2E environment failure separately from product functionality.

## 3. Cross-Cutting Issues

### F-022 — Generic route fallback masks implementation gaps

Severity: High where the configured route represents a core business workflow; Medium for lower-risk settings/catalog pages. config/modules.ts:10-44 registers many routes, app/(dashboard)/[...modulePath]/page.tsx:5-16 accepts any exact configured route, features/shared/components/module-workspace.tsx:41-69 loads generic moduleRecords, and features/shared/actions/module.actions.ts:36-165 writes generic name/note/status records. This mechanism explains the Stub / Placeholder rows across academics, finance, attendance, exams, people/HR, communication, transport, hostel, operations, safety, community and insights.

### F-021 — Encoding artifacts are visible in user-facing strings

Severity: Low. features/portals/services/portal.service.ts:75, features/audit/services/audit.service.ts:15 and features/community/services/community.service.ts:60 contain mojibake sequences in displayed currency/separator/text strings. Confirm the source encoding and rendered browser output before release.

### F-023 — Smoke E2E result is environment-blocked

Severity: Medium. tests/run-e2e.mjs:18-20 and 30-35 hard-code the standalone server to 127.0.0.1:3000, while tests/e2e/smoke.spec.ts:1-15 expects that server. The observed run failed to bind that address with EACCES; the first navigation assertion also could not find its heading, so no product conclusion can be drawn from the failed run.

### Schema ahead of service coverage

Severity: Medium. db/schema/catalog-academics.ts:3-30 and db/schema/catalog-operations.ts:5-58 contain many typed table names, while the static usage search found no domain service/action for several of them. Schema presence was therefore not counted as feature implementation. The affected examples include staffAttendanceRecords, onlineTests, libraryFines, drivers, mealPlans, stockLocations, scheduledReports and healthScreenings.

### Authorization is not uniform across all data paths

Severity: High in the specific findings above. The project has strong central guards in lib/auth/guards.ts:23-128, but individual services differ: student reads use permitted IDs while student updates do not (F-006); health documents require health:view_sensitive while health profile reads do not (F-013); portal pages accept a caller-selected portal without role matching (F-014). These paths need a shared authorization test matrix.

### External delivery is represented as boundaries, not production capability

Severity: Critical. Provider interfaces and encrypted configuration/webhook infrastructure are present, but no concrete adapters were found (F-004). Local in-app messages and manual fee collection must not be reported as external delivery/payment success.

### Concurrency safeguards are inconsistent

Severity: High. Attendance and finance have transactional/optimistic safeguards, but transport allocation, hostel bed allocation, facility booking approval and webhook deduplication rely on read-then-write sequences without a matching database invariant (F-005, F-011, F-012, F-015).

### Test coverage is concentrated in contracts and tenant integrity

Severity: Medium. The local suite has 23 files and 64 tests, including a strong tenant-integrity test, but no authenticated multi-step Playwright workflow for admission approval, payment, marks publication, document upload, portal views or provider/webhook failures. docs/REMAINING_FEATURES.md:218-228 explicitly lists these coverage gaps.

## 4. Technical Debt Appendix

1. F-019/F-020: Scheduled reports, data-quality/alert workflows, PDF generation, background exports and non-student imports are not implemented; evidence is in config/modules.ts:43, db/schema/catalog-platform.ts:18-20, app/api/exports/route.ts:27-42 and docs/REMAINING_FEATURES.md:198-203.
2. The current report “Print HTML” path is intentionally HTML, but any PRD or release checklist that says PDF must treat this as open; evidence is in app/api/exports/route.ts:27-42 and lib/exports/pdf.ts:10-13.
3. F-021: The repository contains several UI strings with visible mojibake sequences such as Â·, â€”, â‚¹ and â†’. Evidence includes features/portals/services/portal.service.ts:75, features/audit/services/audit.service.ts:15 and features/community/services/community.service.ts:60. This is Low severity unless it affects a contractual document/export.
4. Many catalog tables use JSON detailsJson rather than typed columns. db/schema/catalog-shared.ts:5-23 documents that these are lower-risk first-build entities; they should be migrated to dedicated schemas before financial, scheduling, safety or high-volume invariants depend on them.
5. The checked-in test suite does not include provider adapter tests, webhook retry tests, authenticated browser workflows, accessibility checks, load/concurrency tests or migration rollback tests; evidence is in tests/e2e/smoke.spec.ts:1-15 and docs/REMAINING_FEATURES.md:218-228. Passing the current 64 tests is scoped evidence, not production-readiness evidence.
6. F-023: Production configuration is not verifiable from source; the deployment must supply Firebase, remote database, Cloudinary, session/encryption, internal job and provider secrets and must run the documented staging/backup/restore gates. Evidence for the required rollout gates is in docs/IMPLEMENTATION_STATUS.md:134-149. Unverified — requires manual confirmation.

## 5. Prioritized Fix Recommendation Order

1. **Protect data integrity first:** make hostel bed allocation, transport capacity/student uniqueness, facility approval overlap and webhook event identity atomic with transactions, conditional updates and database constraints. This prevents silent corruption.
2. **Correct money and payroll behavior:** implement fee-head/structure/installment/accounting services and real payroll deductions before enabling broad finance/HR navigation. Keep minor-unit, idempotent payment/refund controls.
3. **Complete the exposed core domain routes:** replace the generic workspace in academics, attendance extensions, exam deep features, communication channels, admissions documents and operations extensions with typed domain services and validation.
4. **Close authorization gaps:** reuse permitted-student checks on updates, require health:view_sensitive for health profile reads, and enforce role-to-portal mapping server-side.
5. **Implement and verify production adapters:** select and test payment, notification, hardware, GPS, LMS and calendar providers; add webhook retry/manual-exception handling and deploy the worker.
6. **Expand release evidence:** add authenticated Playwright journeys, API/contract tests, provider/webhook failure tests, concurrency/load tests, accessibility checks, migration/backup drills and staging verification. Resolve the port-3000 E2E environment issue before treating browser smoke results as meaningful.

## 6. Development Remediation Addendum — 2026-08-09

The following findings were remediated after the audit snapshot. These are code/test results, not production deployment evidence:

- F-005: existing partial unique indexes and capacity/scope triggers were retained; services now translate concurrent bed/student/capacity violations into stable conflicts.
- F-006: student writes now reuse the same linked/assigned-student scope resolver as reads.
- F-011: migration `0032_allocation_booking_concurrency.sql` adds active-student uniqueness and atomic route-capacity triggers.
- F-012: the same migration rejects overlapping approved facility bookings at the database write boundary, including concurrent approvals.
- F-013: the health profile page now requires `health:view_sensitive` before reading allergies and conditions.
- F-014: direct portal URLs and the shared portal service enforce an explicit role-to-portal policy, with supervisory access documented and tested.
- F-015: the pre-existing webhook unique index remains authoritative and concurrent insert conflicts are now resolved as duplicate deliveries instead of server errors.
- F-016: migration `0033_library_borrower_identity.sql` makes `borrowerUserId` nullable for student borrowers and enforces typed student/user identity invariants.
- F-018: CMS media registration now requires a tenant-prefixed Cloudinary public ID, provider metadata verification and file policy validation.
- F-021: the reported mojibake sequences are no longer present in the live TypeScript/TSX source.
- Shared API progress: Fastify now exposes permitted-student profile, bounded attendance and invoice history, published-only result entries, and recipient-only notifications with permission checks, OpenAPI schemas and typed-client coverage. This adds mobile/web API parity infrastructure but does not by itself complete the existing student history web tabs or provide Flutter device evidence.
- Leave identity: parent leave submission now requires an explicitly selected linked child, student accounts remain locked to their linked record, staff cannot submit against a student ID, and both web and Fastify paths reuse the same scoped service. Notification read state is also exposed through a recipient-owned audited Fastify mutation.
- Shared finance/documents API: authorized staff payment recording now requires a caller-supplied idempotency key and reuses invoice/student scope, optimistic balance updates, receipts and ledger posting. Cloudinary signatures and metadata persistence now reuse entity scope, sensitive-health permission, tenant-prefix, provider-verification and upload-policy checks; student document reads are bounded and scoped.
- Web API authentication: browser SSR requests now forward the API-owned secure session cookie and readable CSRF cookie to Fastify. Cookie mutations require strict origin validation plus a matching CSRF header, while Flutter and other external clients continue using Firebase Bearer tokens. Fastify resolves tenant, campus, role and permissions from the database.
- F-007/F-025: the student detail attendance, fee, published-result and document tabs now render student-scoped Fastify data rather than broad workspace links or an upload-only card. The browser document workflow obtains its signature and saves verified metadata through the same Fastify contract.
- Fee web cutover: the staff collection form calls the idempotent Fastify payment endpoint with a Firebase ID token and validated requested campus. Payable student invoices open Razorpay Checkout through versioned order/verification endpoints. Staff refunds use a versioned idempotent endpoint; online refunds are sent to Razorpay and remain reserved/pending until provider `processed` status before invoice and ledger reversal.
- F-004 payment portion: Razorpay is now the concrete payment adapter. Tenant credentials are encrypted, production rejects test keys, order/payment/refund responses are schema-validated, Checkout and raw webhook HMACs are verified, event IDs are atomically deduplicated, captured payment parity is checked before posting, and `payment.captured`, `order.paid`, `payment.failed`, `refund.processed` and `refund.failed` are reconciled. This is implementation evidence, not Live-account, settlement or staging evidence; the non-payment provider portions of F-004 remain open.
- F-001/F-002/F-003/F-008/F-009/F-020: academic core, fee/accounting configuration, bounded payroll deductions, staff/low-attendance reporting, exam question-bank/report-card workflows, employee CSV import and binary PDF export now have typed services, scoped pages, audited mutations and local tests/build evidence. These are local implementation results, not statutory, provider or production evidence.
- F-022: configured lower-risk routes now resolve through a route-to-catalog table registry with tenant/campus filters and catalog-specific audit entity types. Remaining financial, scheduling, health and high-volume behavior must graduate from JSON catalog details to dedicated schemas before production scale.
- Staff attendance integrity: migration `0036_staff_attendance_integrity.sql` adds an active employee/date unique index and the service rejects duplicate attendance before insert.
- Inventory/procurement completion: tenant/campus-scoped supplier CRUD and audited inventory/procurement vendor pages are now backed by the `suppliers` master; purchase-order validation accepts a scoped supplier ID or an explicitly entered legacy name.
- Accounting completion: migration `0037_donations.sql` adds a scoped donation register with validated minor-unit amounts, purpose/reference capture and audited recording at `/accounts/donations`.
- Reporting completion: `/analytics/{admissions,attendance,finance,academics,operations}` now uses scoped report data rather than the generic module-record editor; PDF export has a binary signature test.
- Current local remediation verification: configuration validation and secret scanning passed; both TypeScript boundaries and ESLint passed; 37 Vitest files with 123 tests passed; the production build generated 137 routes; migrations through `0037` applied to a disposable local SQLite database; and the earlier unauthenticated Playwright smoke tests passed. Authenticated Razorpay Live/staging, provider settlement, device, load and backup evidence remains unverified.

The payment portion of F-004 is implemented for Razorpay, while Live-account/staging settlement evidence and the notification, hardware, GPS, LMS and calendar adapter portions remain open. Statutory payroll policy, queued/background export delivery, dedicated schemas for remaining catalog routes and production/staging evidence remain open. Flutter development is intentionally deferred.
