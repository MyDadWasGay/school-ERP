# School ERP — QA Test Plan

Generated: 2026-08-08 | Linked Audit: AUDIT.md

## 1. Test Strategy Overview

- Scope: the 21 modules discovered in AUDIT.md, including their implemented workflows, configured-but-generic routes, data-integrity boundaries, authorization boundaries, imports/exports, portals and operational controls.
- Out of scope: features not represented by a route, service, action, schema or documented intended scope in this repository. Do not mark an unconfigured ERP feature as a product failure without first confirming that it belongs in the release scope.
- Required environment: a disposable SQLite/libSQL test database with migrations applied; a Firebase test project; a Cloudinary test account for upload cases; provider sandbox credentials for payment/notification/GPS/hardware cases; a running Next.js server; and test users in separate organizations and campuses.
- Required test data:
  - Organization A with Campus A1 and Campus A2.
  - Organization B with Campus B1.
  - One active academic year, class, section, subject, teacher assignment and at least three students in Organization A.
  - One linked parent, one linked student, one teacher, one accountant, one librarian, one transport staff user, one hostel warden, one management user and one platform administrator.
  - At least one invoice with a positive balance, one completed payment, one library item with two copies, one transport route with capacity 1, one hostel room with one bed, one inventory item with stock 10, and one approved procurement requisition.
- Recommended tooling matched to the stack: Vitest for unit/schema tests; Testing Library for client forms; Playwright for authenticated browser journeys; Supertest or direct fetch for route contracts; Drizzle against a disposable database for integration/data-integrity tests; OWASP ZAP or equivalent for HTTP security checks; and k6 or Artillery for load/concurrency tests.
- Baseline commands: npm.cmd test, npm.cmd run typecheck, npm.cmd run lint, npm.cmd run build, and npm.cmd run test:e2e.
- Current remediation evidence (2026-08-09): configuration/secret checks, both TypeScript boundaries, ESLint, 31 Vitest files with 104 tests, the 111-route production build and all 3 unauthenticated Playwright smoke tests passed. Authenticated browser/provider/device/load/backup checks remain separate release gates.
- Execution rule for Stub / Placeholder and Missing findings: run the target behavior as an acceptance/regression test. On the current baseline, a generic moduleRecords page or absent workflow is a reproducible audit result; after remediation, the same test must verify typed domain records, business validation and audit data.
- For every API test, capture request method, URL, authenticated role, organization/campus, status code, response body shape, database rows before/after, and audit-log result. Never use production data.

## 2. Module Test Suites

### 2.1 Platform Administration and Foundation

**Test ID:** TC-PLAT-001  
**Title:** Provision a school and its first administrator  
**Priority:** Critical  
**Type:** E2E  
**Preconditions:** Use a disposable database with no Organization A; log in as an active platform administrator; configure Firebase Admin test credentials.  
**Test Steps:**

1. Open /platform.
2. Enter a unique school name, lowercase slug, first-campus name/code, timezone/currency, administrator name and administrator email.
3. Submit the provisioning form.
4. Query the database for the new organization, campus, active academic year, role/permission defaults, invited user, invitation-token hash and platform audit row.
   **Expected Result:** The response confirms creation and returns a one-time invitation link; all tenant records share the new organization; the password is not stored; the invitation token is not stored in plaintext; and one platform audit event records the provisioning.
   **Linked Audit Finding:** None — baseline coverage.

**Test ID:** TC-PLAT-002  
**Title:** Reject duplicate school slug and invalid lifecycle transition  
**Priority:** High  
**Type:** API  
**Preconditions:** Organization A already has slug green-valley; log in as platform administrator.  
**Test Steps:**

1. Submit a second school with slug green-valley.
2. Submit a status transition from archived directly to active, or another transition not allowed by the organization status policy.
3. Inspect both responses and count organizations/platform audit rows.
   **Expected Result:** Each request returns a validation/conflict error; no duplicate organization or invalid status row is created; no audit row is written for a rejected mutation.
   **Linked Audit Finding:** None — baseline coverage.

**Test ID:** TC-PLAT-003  
**Title:** Deny tenant users from platform administration  
**Priority:** Critical  
**Type:** Security  
**Preconditions:** Log in as Organization A management or super_admin, not as a platform administrator.  
**Test Steps:**

1. Navigate directly to /platform.
2. Call the platform school-status action with Organization A's ID.
3. Call the platform school-list or platform-audit page directly.
   **Expected Result:** Each operation is denied or redirected to the tenant dashboard; no cross-tenant overview, status mutation or platform audit data is returned.
   **Linked Audit Finding:** None — baseline coverage.

**Test ID:** TC-PLAT-004  
**Title:** Keep concurrent organization status transitions safe  
**Priority:** High  
**Type:** Regression  
**Preconditions:** Platform administrator and a second platform session both see the same active Organization A.  
**Test Steps:**

1. Submit the same valid active-to-suspended transition from both sessions at nearly the same time.
2. Read the organization status and platform audit log.
3. Repeat with one request attempting an invalid next transition.
   **Expected Result:** Exactly one valid update succeeds; the losing request receives a conflict; the final status is suspended; and exactly one corresponding audit event exists.
   **Linked Audit Finding:** None — existing optimistic lifecycle safeguard.

### 2.2 Authentication, Users and RBAC

**Test ID:** TC-AUTH-001  
**Title:** Sign in and create an active local session  
**Priority:** Critical  
**Type:** E2E  
**Preconditions:** Firebase test user is email-verified and mapped to an active Organization A user with dashboard permission.  
**Test Steps:**

1. Open /login and enter the Firebase test credentials.
2. Submit the form.
3. Visit /dashboard and inspect the session cookie, session log and login audit row through the test database.
   **Expected Result:** The browser is redirected to the dashboard; the cookie is HttpOnly/secure according to environment policy; an active session log and successful login audit exist; and the user sees only Organization A data.
   **Linked Audit Finding:** None — baseline coverage.

**Test ID:** TC-AUTH-002  
**Title:** Reject invalid, unverified and unprovisioned identities  
**Priority:** High  
**Type:** API  
**Preconditions:** Have one wrong-password attempt, one unverified Firebase account and one Firebase account with no active local ERP user.  
**Test Steps:**

1. Submit the wrong password through /login.
2. Submit an ID token for the unverified account to /api/auth/session.
3. Submit an ID token for the unprovisioned account to /api/auth/session.
   **Expected Result:** No ERP session cookie is created; the client receives a useful error; the server returns the documented 4xx response; and no active local session is left behind.
   **Linked Audit Finding:** None — baseline coverage.

**Test ID:** TC-AUTH-003  
**Title:** Enforce permission denial at the server action boundary  
**Priority:** Critical  
**Type:** Security  
**Preconditions:** Log in as a teacher, parent or student without fees:collect, users:update and integrations:manage.  
**Test Steps:**

1. Call fee collection, user-access update and integration-configuration actions directly, without using the hidden UI buttons.
2. Attempt the same requests with a forged role field in the request payload.
3. Inspect database and audit rows.
   **Expected Result:** Every action returns forbidden; changing a client payload role has no effect; no financial, access or integration row changes; and no success audit event is written.
   **Linked Audit Finding:** None — central RBAC baseline.

**Test ID:** TC-AUTH-004  
**Title:** Revoke a session and verify all protected pages close  
**Priority:** High  
**Type:** Regression  
**Preconditions:** Have one active browser session and its session-log ID in the disposable database.  
**Test Steps:**

1. Revoke or log out the session.
2. Reuse the old session cookie to request /dashboard, /students and /api/auth/campus.
3. Start a new login and inspect the old session status.
   **Expected Result:** The old cookie cannot access protected pages or campus switching; the old session is inactive/revoked; and only the new authenticated session can proceed.
   **Linked Audit Finding:** None — baseline session control.

### 2.3 Admissions and Enrollment

**Test ID:** TC-ADM-001  
**Title:** Convert an enquiry into an approved enrolled student  
**Priority:** Critical  
**Type:** E2E  
**Preconditions:** Log in as an admissions user with admissions:create/update/approve; Organization A has an active academic year, class, section and available capacity.  
**Test Steps:**

1. Create an enquiry with applicant name, email, source and next follow-up.
2. Create an application linked to that enquiry and the active academic context.
3. Schedule and record a passing assessment.
4. Approve the application with a unique admission number and roll number.
5. Query student, enrollment, guardian link, admission and timeline tables.
   **Expected Result:** The application progresses through valid states; approval creates one active student/enrollment/guardian relationship and timeline event in Organization A; and the approval is audited.
   **Linked Audit Finding:** None — implemented happy path.

**Test ID:** TC-ADM-002  
**Title:** Reject incomplete and over-capacity admission inputs  
**Priority:** High  
**Type:** Integration  
**Preconditions:** Use an application in a rejectable state and a full target class/section.  
**Test Steps:**

1. Submit a rejection without a rejection reason.
2. Submit an approval for the full target section.
3. Submit an approval using a campus, class or academic year outside the application context.
   **Expected Result:** Each request is rejected with a validation/conflict/tenant-scope error; no student or enrollment is created; and the application remains unchanged after each rejected attempt.
   **Linked Audit Finding:** None — baseline business validation.

**Test ID:** TC-ADM-003  
**Title:** Prevent a parent or student from reviewing an application  
**Priority:** Critical  
**Type:** Security  
**Preconditions:** Log in as a linked parent and as a linked student; create a pending Organization A application.  
**Test Steps:**

1. Call the application review/approval action as the parent.
2. Call it as the student with a forged applicationId and status.
3. Open /admissions/approvals directly.
   **Expected Result:** Both users receive forbidden or are denied by the page guard; application status and student data do not change.
   **Linked Audit Finding:** None — RBAC boundary.

**Test ID:** TC-ADM-004  
**Title:** Verify applicant documents and completeness before approval  
**Priority:** High  
**Type:** Regression  
**Preconditions:** Use an application with one required document missing and a Cloudinary test asset.  
**Test Steps:**

1. Open the admissions application and attach a valid document to the application.
2. Mark the document verified, then attempt to reject it with a reason.
3. Attempt approval while one required document remains unverified.
4. Open /admissions/tests and /admissions/reports.
   **Expected Result:** The intended workflow must persist document status, rejection reason and completeness; approval is blocked until requirements are met; and test/report pages must use typed admissions data rather than only generic name/note/status fields. On the current baseline, record the missing workflow as a failed acceptance test.
   **Linked Audit Finding:** [F-024](AUDIT.md#f-024--admission-document-verification-and-completeness-are-not-connected) and [F-022](AUDIT.md#f-022--generic-route-fallback-masks-implementation-gaps)

### 2.4 Student Information System and Documents

**Test ID:** TC-SIS-001  
**Title:** Create a student with enrollment and guardian records  
**Priority:** Critical  
**Type:** E2E  
**Preconditions:** Log in as office_staff or management with students:create; prepare Organization A academic options and a guardian email.  
**Test Steps:**

1. Open /students/new.
2. Enter a unique admission number, first/last name, campus, academic year, class, section and guardian details.
3. Submit the form.
4. Open the student profile, guardian tab, enrollment tab and timeline tab.
   **Expected Result:** The form reports success; exactly one student, enrollment and guardian link exist in the selected tenant/campus; the profile shows the same values; and a create/timeline audit is present.
   **Linked Audit Finding:** None — implemented happy path.

**Test ID:** TC-SIS-002  
**Title:** Reject duplicate and incomplete student records  
**Priority:** High  
**Type:** Integration  
**Preconditions:** Organization A already contains admission number ST-100.  
**Test Steps:**

1. Submit a second student with admission number ST-100.
2. Submit a student with missing first name, campus or invalid enrollment identifiers.
3. Inspect the response and database counts.
   **Expected Result:** Each request returns validation/conflict; no duplicate student or partial linked records are left behind; and the user receives field-level or actionable error text.
   **Linked Audit Finding:** None — baseline validation.

**Test ID:** TC-SIS-003  
**Title:** Prevent an in-scope parent or student from updating another student  
**Priority:** Critical  
**Type:** Security  
**Preconditions:** Create two students in Organization A; link the first to the test parent/student; grant only the permissions normally available to that role plus any delegated students:update permission being tested.  
**Test Steps:**

1. Call updateStudentRecord with the second student ID and a changed name/status.
2. Repeat with a different campus ID in the payload.
3. Read both student rows and audit logs.
   **Expected Result:** The update is denied unless the actor is explicitly authorized for the target student; neither row changes for an unauthorized request; and no success audit exists.
   **Linked Audit Finding:** [F-006](AUDIT.md#f-006--student-update-authorization-is-broader-than-student-read-authorization)

**Test ID:** TC-SIS-004  
**Title:** Render student-specific histories and document controls  
**Priority:** High  
**Type:** Regression  
**Preconditions:** The selected student has one attendance record, one invoice, one published result and one valid Cloudinary document; another student has different records.  
**Test Steps:**

1. Open /students/{selected-id}/attendance, /fees and /results.
2. Confirm every displayed row belongs to the selected student.
3. Open /students/{selected-id}/documents and upload/list the valid document.
4. Repeat with a parent linked only to the selected student.
   **Expected Result:** The page displays filtered attendance, fee, result and document data for only the selected student; unrelated rows are absent; document metadata is stored after verified upload; and parent access is limited to the linked student.
   **Linked Audit Finding:** [F-007](AUDIT.md#f-007--student-history-tabs-are-links-not-student-specific-history) and [F-025](AUDIT.md#f-025--student-document-tab-has-no-dedicated-uploadlist-workflow)

### 2.5 Academics and Scheduling

**Test ID:** TC-ACD-001  
**Title:** Create a typed curriculum, timetable and assignment workflow  
**Priority:** Critical  
**Type:** E2E  
**Preconditions:** Log in as a management user; Organization A has a class, section, teacher and subject.  
**Test Steps:**

1. Open the curriculum route and create a curriculum unit with subject/class context.
2. Create timetable periods for the same class and assign the teacher.
3. Create and publish an assignment with a due date.
4. Read the resulting curriculum, timetable, teacher-allocation and assignment records from the database and portal.
   **Expected Result:** Each operation persists domain-specific fields and relationships, the published assignment appears to the linked student/parent, and the teacher sees only assigned records. On the current baseline, record the generic workspace behavior as a failure.
   **Linked Audit Finding:** [F-001](AUDIT.md#f-001--academic-core-routes-use-the-generic-record-workspace)

**Test ID:** TC-ACD-002  
**Title:** Reject timetable clashes and invalid assignment dates  
**Priority:** High  
**Type:** Integration  
**Preconditions:** A timetable period already exists for the same class/room/teacher and an assignment schema is available.  
**Test Steps:**

1. Submit a second period overlapping the existing teacher/class window.
2. Submit an assignment whose due date is before its publish/start date.
3. Inspect the response and source tables.
   **Expected Result:** The clash/date validation is returned; no duplicate schedule or invalid assignment is stored; and an audit row is not created for a failed mutation.
   **Linked Audit Finding:** [F-001](AUDIT.md#f-001--academic-core-routes-use-the-generic-record-workspace)

**Test ID:** TC-ACD-003  
**Title:** Deny parent and student academic administration writes  
**Priority:** High  
**Type:** Security  
**Preconditions:** Log in as a parent and student with normal read-only academics access.  
**Test Steps:**

1. Call curriculum create, timetable update and assignment publish actions directly.
2. Attempt to change the class/teacher identifiers in the payload.
3. Open the corresponding routes directly.
   **Expected Result:** Writes are forbidden; payload changes cannot grant permission; read pages do not expose an administrative write control.
   **Linked Audit Finding:** [F-001](AUDIT.md#f-001--academic-core-routes-use-the-generic-record-workspace)

**Test ID:** TC-ACD-004  
**Title:** Replace generic academic pages with domain workflows  
**Priority:** Critical  
**Type:** Regression  
**Preconditions:** Use the current build and the post-fix build with the same Organization A data.  
**Test Steps:**

1. Open /academics/curriculum, /academics/timetable, /academics/assignments and /academics/resources.
2. Add a record through each page.
3. Inspect the request/action and database table written.
   **Expected Result:** Each route calls a typed academic service and writes the correct domain table; a generic moduleRecords row alone is not accepted as completion. Current baseline behavior is expected to fail this acceptance test.
   **Linked Audit Finding:** [F-001](AUDIT.md#f-001--academic-core-routes-use-the-generic-record-workspace) and [F-022](AUDIT.md#f-022--generic-route-fallback-masks-implementation-gaps)

### 2.6 Attendance and Student Care

**Test ID:** TC-ATT-001  
**Title:** Mark daily attendance and review a correction  
**Priority:** Critical  
**Type:** E2E  
**Preconditions:** Log in as a teacher assigned to the test class or as a permitted attendance staff user; an active academic year and enrolled student exist.  
**Test Steps:**

1. Open /attendance/students for the test date and period.
2. Mark one student present and another absent.
3. Open the correction workflow and submit a correction for the absent record.
4. Log in as a permitted correction approver and approve it.
   **Expected Result:** One session and one record per student/date/period exist; the correction state changes to approved; the attendance record updates; and the absent event is visible to the permitted notification recipient.
   **Linked Audit Finding:** None — implemented happy path.

**Test ID:** TC-ATT-002  
**Title:** Reject invalid attendance date/state and closed-year writes  
**Priority:** High  
**Type:** API  
**Preconditions:** Have one active and one closed academic year.  
**Test Steps:**

1. Submit an unknown attendance state.
2. Submit a future date if the schema rejects it.
3. Submit a valid-looking record for the closed academic year.
   **Expected Result:** Each request returns validation/conflict; no attendance record or session is written for the invalid cases.
   **Linked Audit Finding:** None — baseline validation.

**Test ID:** TC-ATT-003  
**Title:** Deny a teacher from marking outside assigned class scope  
**Priority:** Critical  
**Type:** Security  
**Preconditions:** Teacher T is scoped to Class 1/Section A; student S is enrolled in Class 2/Section B.  
**Test Steps:**

1. Submit attendance for S as Teacher T.
2. Submit a forged classId/sectionId in the request body.
3. Query S's attendance row.
   **Expected Result:** Both writes return forbidden or not found; the forged scope is ignored; and S has no new record.
   **Linked Audit Finding:** None — existing class-scope control.

**Test ID:** TC-ATT-004  
**Title:** Implement staff attendance, low-attendance alerts and reports  
**Priority:** High  
**Type:** Regression  
**Preconditions:** Seed attendance for a student below the agreed threshold and an employee for staff attendance.  
**Test Steps:**

1. Open /attendance/staff and record staff attendance.
2. Open /attendance/reports and generate the student percentage report.
3. Open /attendance/wellbeing and verify a low-attendance alert/parent notification.
   **Expected Result:** Typed staff records, percentage calculations, threshold alerts and report rows are created and scoped; current generic moduleRecords behavior is recorded as a failure until fixed.
   **Linked Audit Finding:** [F-008](AUDIT.md#f-008--staff-wellbeing-low-attendance-and-report-routes-are-not-implemented) and [F-022](AUDIT.md#f-022--generic-route-fallback-masks-implementation-gaps)

### 2.7 Exams and Grading

**Test ID:** TC-EXAM-001  
**Title:** Plan an exam, enter marks and publish results  
**Priority:** Critical  
**Type:** E2E  
**Preconditions:** Log in as management for planning/publication and as an assigned teacher for marks entry; students are enrolled in the exam class.  
**Test Steps:**

1. Create an exam and schedule its subject window.
2. Enter marks within each subject maximum as the assigned teacher.
3. Move the exam through the required workflow states.
4. Publish results and open the parent/student result view.
   **Expected Result:** The schedule and marks are stored once per student/subject; publication is available only after required marks/state gates; and parent/student sees only published results.
   **Linked Audit Finding:** None — implemented happy path.

**Test ID:** TC-EXAM-002  
**Title:** Reject marks above maximum and overlapping schedules  
**Priority:** High  
**Type:** Integration  
**Preconditions:** Existing exam has a 100-mark subject and an overlapping schedule window.  
**Test Steps:**

1. Submit marks 101 and a negative mark.
2. Submit a schedule overlapping the same class/subject window.
3. Inspect the result and database.
   **Expected Result:** Validation/conflict responses are returned; no invalid mark/schedule is stored; and existing valid data is unchanged.
   **Linked Audit Finding:** None — baseline validation.

**Test ID:** TC-EXAM-003  
**Title:** Enforce marks-entry and publication permissions  
**Priority:** Critical  
**Type:** Security  
**Preconditions:** Teacher T is not assigned to the target exam subject; parent P has read-only result access.  
**Test Steps:**

1. Attempt marks entry as T for the unassigned subject.
2. Attempt result publication as T and P.
3. Inspect result publication status.
   **Expected Result:** Unassigned marks entry and both publication attempts are denied; publication remains draft/approved as appropriate; no unauthorized audit success exists.
   **Linked Audit Finding:** None — existing permission/state controls.

**Test ID:** TC-EXAM-004  
**Title:** Complete report cards, question bank and online-test routes  
**Priority:** High  
**Type:** Regression  
**Preconditions:** Have published marks and a subject; use the current build and post-fix build.  
**Test Steps:**

1. Open /exams/report-cards and generate a report card for one student.
2. Open /exams/question-bank and create a bounded question.
3. Open /exams/online-tests and create an attempt/answer workflow.
4. Inspect the domain tables and audit events.
   **Expected Result:** Typed reportCards, questionBankItems and online-test data are created with exam/student/subject relationships; generic moduleRecords alone is insufficient.
   **Linked Audit Finding:** [F-009](AUDIT.md#f-009--exam-deep-feature-routes-are-not-connected-to-domain-services) and [F-022](AUDIT.md#f-022--generic-route-fallback-masks-implementation-gaps)

**Test ID:** TC-EXAM-005  
**Title:** Unit-test marks bounds and exam status transitions  
**Priority:** High  
**Type:** Unit  
**Preconditions:** Run Vitest with the repository source; no database or browser session is required.  
**Test Steps:**

1. Call `validateMarks` with zero, maximum, above-maximum and negative marks, with and without `maxMarks`.
2. Call `marksSchema.safeParse` with an integer and a non-integer mark to verify the schema-level integer constraint.
3. Call `canTransitionExamStatus` for every allowed transition and for skipped/backward transitions.
4. Run the focused test file and inspect each assertion.
   **Expected Result:** Boundary marks are accepted or rejected by the correct rule; the schema rejects non-integer marks; invalid status transitions return false; and the pure rules do not depend on a live provider or database.
   **Linked Audit Finding:** None — unit baseline for the implemented exam rules.

### 2.8 Fees and Finance

**Test ID:** TC-FIN-001  
**Title:** Create an invoice, collect a payment, issue a receipt and refund part of it  
**Priority:** Critical  
**Type:** E2E  
**Preconditions:** Log in as accountant; one active student and invoice context exist; use INR minor-unit values.  
**Test Steps:**

1. Create an invoice for 10,000 minor units with a future due date.
2. Collect a 4,000 minor-unit manual payment with idempotency key pay-001.
3. Confirm invoice balance, fee payment, receipt and two ledger entries.
4. Refund 1,000 minor units with a reason.
5. Re-read invoice/payment/refund/ledger rows.
   **Expected Result:** Invoice balance becomes 6,000 after payment and 7,000 after refund; receipt/payment/refund/ledger records are linked to the same tenant; and each mutation is audited.
   **Linked Audit Finding:** None — implemented manual-finance happy path.

**Test ID:** TC-FIN-002  
**Title:** Reject overpayment, negative amounts and duplicate idempotency keys  
**Priority:** Critical  
**Type:** Integration  
**Preconditions:** Invoice balance is 5,000 minor units and pay-001 has already been used.  
**Test Steps:**

1. Submit payment amount 5,001.
2. Submit amount 0, a negative amount and a fractional minor-unit value.
3. Submit the same valid payment with idempotency key pay-001 twice.
   **Expected Result:** Invalid amounts are rejected; the repeated idempotent request does not create a second payment/receipt/ledger set; and the final invoice balance is correct.
   **Linked Audit Finding:** None — baseline money/data-integrity coverage.

**Test ID:** TC-FIN-003  
**Title:** Deny parent and student fee collection/refund writes  
**Priority:** Critical  
**Type:** Security  
**Preconditions:** Link a parent and student to the invoice owner; log in separately as each.  
**Test Steps:**

1. Call `POST /api/v1/payments` and `POST /api/v1/payments/refunds` with Firebase Bearer authentication.
2. Attempt to replace the invoice/student ID with an unrelated Organization A student.
3. Inspect payment, refund and ledger counts.
   **Expected Result:** Both roles receive forbidden or scope denial; no financial row changes; no receipt is issued.
   **Linked Audit Finding:** None — baseline RBAC.

**Test ID:** TC-FIN-004  
**Title:** Replace generic fee/accounting routes and verify real provider behavior  
**Priority:** Critical  
**Type:** Regression  
**Preconditions:** Configure a payment-provider sandbox and create fee-head/structure/installment/account/expense data expected by the release.  
**Test Steps:**

1. Open /fees/configuration, /fees/defaulters, /accounts/chart-of-accounts, /accounts/ledger and /accounts/reconciliation.
2. Create a fee structure and assign an installment to a student.
3. Start an online payment and complete it in the sandbox.
4. Verify the provider reference, webhook/receipt, invoice balance and ledger.
   **Expected Result:** The pages use typed finance tables and the gateway adapter; provider success is not represented by a local manual-payment row alone. Current baseline generic routes/interface-only behavior is a failed acceptance result.
   **Linked Audit Finding:** [F-002](AUDIT.md#f-002--fee-configuration-and-accounting-routes-use-the-generic-record-workspace) and [F-004](AUDIT.md#f-004--production-payment-notification-hardware-gps-lms-and-calendar-adapters-are-not-implemented)

**Test ID:** TC-FIN-005  
**Title:** Unit-test minor-unit payment amount boundaries  
**Priority:** High  
**Type:** Unit  
**Preconditions:** Run Vitest against `features/finance/services/payment-rules.ts`; no database or authenticated session is required.  
**Test Steps:**

1. Call `isPaymentAmountValid` with a positive integer below the balance, exactly equal to the balance, zero, a negative number, a decimal and an amount above the balance.
2. Repeat with a zero outstanding balance.
3. Run the focused rule test and inspect the boolean results.
   **Expected Result:** Only positive integer amounts no greater than the outstanding balance are valid; no floating-point minor-unit amount or overpayment is accepted.
   **Linked Audit Finding:** None — unit baseline for the implemented finance invariant.

### 2.9 Staff, HR and Payroll

**Test ID:** TC-HR-001  
**Title:** Create an employee, process a payroll run and view a payslip  
**Priority:** High  
**Type:** E2E  
**Preconditions:** Log in as a payroll-authorized accountant/management user; one active employee has salary input.  
**Test Steps:**

1. Create an employee with a unique employee number and salary.
2. Create a payroll run for a new period.
3. Process the run.
4. Open /payroll/payslips and inspect the payroll snapshot.
   **Expected Result:** One payslip is created per active employee, the run becomes completed/immutable, gross/net totals are stored in minor units, and the payslip is scoped to Organization A.
   **Linked Audit Finding:** None — current snapshot happy path.

**Test ID:** TC-HR-002  
**Title:** Reject duplicate payroll periods and empty payroll runs  
**Priority:** High  
**Type:** Integration  
**Preconditions:** One completed payroll period exists; a second run has no active employees in its campus.  
**Test Steps:**

1. Create another run for the same campus and period.
2. Process the empty run.
3. Inspect run/payslip counts.
   **Expected Result:** Duplicate period creation and empty-run processing return conflict; no duplicate payslips or partial totals are created.
   **Linked Audit Finding:** None — baseline validation.

**Test ID:** TC-HR-003  
**Title:** Deny non-payroll roles from processing salary data  
**Priority:** High  
**Type:** Security  
**Preconditions:** Log in as teacher and parent; a payroll run exists.  
**Test Steps:**

1. Open /payroll/runs and /payroll/payslips.
2. Call processPayrollRunAction with the run ID.
3. Try to query another employee's payslip by changing URL/query values.
   **Expected Result:** The users cannot process the run or read unauthorized payroll data; no payslip changes occur.
   **Linked Audit Finding:** None — baseline RBAC.

**Test ID:** TC-HR-004  
**Title:** Calculate payroll deductions, taxes and net pay from configured inputs  
**Priority:** Critical  
**Type:** Regression  
**Preconditions:** Configure an employee with gross salary 100,000 minor units and documented deduction inputs totaling 12,500 minor units.  
**Test Steps:**

1. Process a new payroll period.
2. Read the payslip grossMinor, deductionsMinor and netMinor.
3. Compare the values with the approved payroll calculation fixture and the audit snapshot.
   **Expected Result:** deductionsMinor equals the configured/calculated 12,500 and netMinor equals 87,500; deductions are not silently zero; the calculation is reproducible and auditable.
   **Linked Audit Finding:** [F-003](AUDIT.md#f-003--payroll-deductions-are-hard-coded-to-zero)

**Test ID:** TC-HR-005  
**Title:** Replace generic HR extension pages with typed workflows  
**Priority:** High  
**Type:** Regression  
**Preconditions:** Use the current build and a post-fix build with an employee and the required HR permissions.  
**Test Steps:**

1. Open /hr/recruitment, /hr/documents, /hr/performance, /hr/training and /payroll/structures.
2. Create one record in each supported workflow using the fields expected for that domain.
3. Inspect the action request, source table, employee relationship, status transition and audit event.
   **Expected Result:** Each route uses a typed HR/payroll service and dedicated data fields; a generic moduleRecords name/note/status row alone is not accepted. Current baseline behavior is recorded as a failed acceptance result.
   **Linked Audit Finding:** [F-022](AUDIT.md#f-022--generic-route-fallback-masks-implementation-gaps)

### 2.10 Communication

**Test ID:** TC-COM-001  
**Title:** Publish a role-targeted in-app message and mark it read  
**Priority:** High  
**Type:** E2E  
**Preconditions:** Log in as a user with communication:create/update; Organization A has an active teacher and parent recipient.  
**Test Steps:**

1. Create a draft message addressed to the teacher role.
2. Publish it.
3. Log in as the teacher and open /communication/notifications.
4. Mark the notification read and inspect delivery rows.
   **Expected Result:** One published message creates one scoped in-app notification for each matching active recipient; readAt/status change for the teacher only; and delivery information is visible to authorized staff.
   **Linked Audit Finding:** None — implemented in-app happy path.

**Test ID:** TC-COM-002  
**Title:** Reject invalid audience and empty message content  
**Priority:** Medium  
**Type:** API  
**Preconditions:** Log in as a communication-authorized user.  
**Test Steps:**

1. Submit a role audience without audienceRole.
2. Submit an empty subject/body and an oversized body.
3. Inspect message/notification counts.
   **Expected Result:** Validation errors are returned; no draft or notification row is created from invalid input.
   **Linked Audit Finding:** None — baseline validation.

**Test ID:** TC-COM-003  
**Title:** Deny parent and student publishing privileges  
**Priority:** High  
**Type:** Security  
**Preconditions:** Log in as parent and student; create a draft with an admin account.  
**Test Steps:**

1. Call publishMessage as the parent.
2. Call publishMessage as the student.
3. Read the draft status and notification events.
   **Expected Result:** Both calls are forbidden; the draft remains draft; no recipient fan-out occurs.
   **Linked Audit Finding:** None — baseline RBAC.

**Test ID:** TC-COM-004  
**Title:** Deliver outbound messages and connect template/PTM routes  
**Priority:** High  
**Type:** Regression  
**Preconditions:** Configure a notification provider sandbox and test email/SMS/push recipients.  
**Test Steps:**

1. Open /communication/templates, /notices, /events and /ptm and create a typed communication record.
2. Publish a message through the selected provider adapter.
3. Simulate provider success, failure and retry.
4. Verify channel, provider reference, delivery status, retry state and audit rows.
   **Expected Result:** The external delivery adapter is invoked; failures are visible and retryable; typed template/notice/PTM data is stored; in-app status is not incorrectly reported as external delivery success.
   **Linked Audit Finding:** [F-010](AUDIT.md#f-010--communication-is-limited-to-in-app-events), [F-004](AUDIT.md#f-004--production-payment-notification-hardware-gps-lms-and-calendar-adapters-are-not-implemented) and [F-022](AUDIT.md#f-022--generic-route-fallback-masks-implementation-gaps)

### 2.11 Library

**Test ID:** TC-LIB-001  
**Title:** Catalogue a copy, issue it, renew it and return it  
**Priority:** High  
**Type:** E2E  
**Preconditions:** Log in as librarian; create a library item with two copies and a linked student borrower.  
**Test Steps:**

1. Add a copy with a unique accession number.
2. Issue it to the student.
3. Renew it once and then return it.
4. Open active issues/reservations and inspect item/copy counts.
   **Expected Result:** Available copy count decreases on issue and returns on return; the transaction has correct borrower type/id and dates; renewal respects limits; and audit events exist.
   **Linked Audit Finding:** None — implemented happy path.

**Test ID:** TC-LIB-002  
**Title:** Reject unavailable copies, duplicate accession numbers and borrower-limit violations  
**Priority:** High  
**Type:** Integration  
**Preconditions:** One copy is already issued; the borrower has reached the configured maximum active loans.  
**Test Steps:**

1. Issue the already issued copy.
2. Add another copy with the same accession number.
3. Issue a sixth item or the configured maximum-plus-one item to the borrower.
   **Expected Result:** Each operation returns conflict/validation; copy availability, accession uniqueness and active-loan counts remain unchanged.
   **Linked Audit Finding:** None — baseline circulation controls.

**Test ID:** TC-LIB-003  
**Title:** Deny students and parents from catalogue administration  
**Priority:** High  
**Type:** Security  
**Preconditions:** Log in as a student and parent with read-only library scope.  
**Test Steps:**

1. Call createLibraryItem and addLibraryCopy directly.
2. Attempt to archive or edit another borrower’s transaction.
3. Inspect library rows.
   **Expected Result:** Administrative writes are denied; borrower-specific reads remain limited to the linked scope; no unauthorized rows change.
   **Linked Audit Finding:** None — baseline RBAC.

**Test ID:** TC-LIB-004  
**Title:** Preserve typed borrower identity and calculate fines  
**Priority:** Medium  
**Type:** Regression  
**Preconditions:** Issue one copy to a student and one copy to a user; configure a due date and an overdue return/fine policy.  
**Test Steps:**

1. Inspect borrowerUserId, borrowerType and borrowerId for both transactions.
2. Return each item after the due date.
3. Open /library/fines and /library/reports.
   **Expected Result:** Student and user identities are unambiguous in storage; fine amount/status is calculated and recorded; reports use the correct borrower; current ambiguous borrowerUserId/generic route behavior is a failed acceptance result.
   **Linked Audit Finding:** [F-016](AUDIT.md#f-016--library-borrower-identity-is-ambiguous) and [F-022](AUDIT.md#f-022--generic-route-fallback-masks-implementation-gaps)

### 2.12 Transport

**Test ID:** TC-TRANS-001  
**Title:** Create a route, stop, vehicle allocation and manifest  
**Priority:** High  
**Type:** E2E  
**Preconditions:** Log in as transport staff; Organization A has an active student and a vehicle.  
**Test Steps:**

1. Create a vehicle with capacity 2.
2. Create a route with capacity 2 and a stop.
3. Allocate two students to the route/stop.
4. Open /api/transport/manifest with the route ID.
   **Expected Result:** The allocation rows are scoped to the route/campus; the manifest contains both students and stop data; vehicle/route capacities remain consistent; and the export is audited.
   **Linked Audit Finding:** None — implemented happy path.

**Test ID:** TC-TRANS-002  
**Title:** Reject duplicate, cross-campus and over-capacity allocations  
**Priority:** High  
**Type:** Integration  
**Preconditions:** Route R has capacity 1 and one active allocation; Campus B1 has a separate student/stop.  
**Test Steps:**

1. Allocate the existing student again.
2. Allocate a second student to full route R.
3. Attempt to combine a Campus A route with a Campus B stop/student as a non-global transport user.
   **Expected Result:** Duplicate/capacity/campus-scope errors are returned; no extra allocation is stored.
   **Linked Audit Finding:** [F-011](AUDIT.md#f-011--transport-capacity-is-check-then-insert)

**Test ID:** TC-TRANS-003  
**Title:** Deny parents and students from changing transport allocations  
**Priority:** High  
**Type:** Security  
**Preconditions:** Log in as parent and student; each has transport read access only.  
**Test Steps:**

1. Call allocateStudentToRoute as each user with a valid route/student/stop.
2. Call a vehicle or route create action.
3. Read allocations and audit logs.
   **Expected Result:** All writes are forbidden; no allocation/vehicle/route row changes.
   **Linked Audit Finding:** None — baseline RBAC.

**Test ID:** TC-TRANS-004  
**Title:** Prevent concurrent route-capacity overbooking  
**Priority:** High  
**Type:** Regression  
**Preconditions:** Route R has capacity 1 and no allocation; two independent transport sessions have valid distinct students.  
**Test Steps:**

1. Submit both allocation requests concurrently.
2. Wait for both responses.
3. Count active routeAllocations for R and inspect any duplicate student allocations.
   **Expected Result:** Only one request succeeds; the other receives conflict; active allocations never exceed capacity; and no duplicate active student assignment is present.
   **Linked Audit Finding:** [F-011](AUDIT.md#f-011--transport-capacity-is-check-then-insert)

**Test ID:** TC-TRANS-005  
**Title:** Replace transport extension pages and verify GPS boundary behavior  
**Priority:** High  
**Type:** Regression  
**Preconditions:** Use a transport-authorized user, a vehicle/route fixture and a configured GPS or hardware provider sandbox if the release includes one.  
**Test Steps:**

1. Open /transport/drivers, /transport/trips, /transport/incidents and /transport/reports.
2. Create a driver/trip/incident and generate a route report.
3. Open /integrations/hardware and submit a provider test event if GPS/hardware is in scope.
4. Inspect typed transport tables, provider delivery status and audit rows.
   **Expected Result:** Operational transport records are typed and scoped; GPS/hardware success is backed by a concrete adapter and provider reference rather than a generic record or local acknowledgement. Current baseline behavior is recorded as a failed acceptance result.
   **Linked Audit Finding:** [F-004](AUDIT.md#f-004--production-payment-notification-hardware-gps-lms-and-calendar-adapters-are-not-implemented) and [F-022](AUDIT.md#f-022--generic-route-fallback-masks-implementation-gaps)

### 2.13 Hostel and Canteen

**Test ID:** TC-RES-001  
**Title:** Allocate and check out a hostel bed and record a canteen transaction  
**Priority:** High  
**Type:** E2E  
**Preconditions:** Log in as hostel warden; create one room/bed and one active student; create a menu item.  
**Test Steps:**

1. Allocate the bed to the student.
2. Open the allotment list and verify room occupancy.
3. Check out the allotment.
4. Record a canteen transaction for the same student/menu item.
   **Expected Result:** The bed is active only during allotment, checkout sets the correct end/status fields, occupancy is updated, and the canteen transaction stores the menu price/quantity in Organization A.
   **Linked Audit Finding:** None — current core happy path.

**Test ID:** TC-RES-002  
**Title:** Reject duplicate room/bed, full capacity and invalid canteen values  
**Priority:** High  
**Type:** Integration  
**Preconditions:** One room/bed and one menu item exist; the room is full.  
**Test Steps:**

1. Create a duplicate room or bed code.
2. Allocate the same bed to a second student.
3. Submit a zero/negative canteen quantity or unknown menu ID.
   **Expected Result:** Every invalid operation returns conflict/validation/not-found; no duplicate active allotment or invalid transaction is stored.
   **Linked Audit Finding:** None — baseline validation.

**Test ID:** TC-RES-003  
**Title:** Deny non-warden hostel administration  
**Priority:** High  
**Type:** Security  
**Preconditions:** Log in as teacher, parent and student.  
**Test Steps:**

1. Call hostel room/bed/allotment create actions.
2. Call canteen menu creation.
3. Inspect room, bed, allotment and menu counts.
   **Expected Result:** Unauthorized roles cannot create or allocate; read access follows their configured permission; no mutation succeeds.
   **Linked Audit Finding:** None — baseline RBAC.

**Test ID:** TC-RES-004  
**Title:** Prevent concurrent reuse of one active hostel bed  
**Priority:** Critical  
**Type:** Regression  
**Preconditions:** One bed is free; two warden sessions have two different active students.  
**Test Steps:**

1. Submit two allotment requests for the same bed at the same time.
2. Count active allotments by bedId and room.
3. Check the responses and audit records.
   **Expected Result:** Exactly one allocation succeeds; the other returns conflict; active allotments for the bed never exceed one or room capacity; and the losing request creates no success audit.
   **Linked Audit Finding:** [F-005](AUDIT.md#f-005--hostel-allocation-does-not-enforce-bed-uniqueness-atomically)

**Test ID:** TC-RES-005  
**Title:** Replace hostel and canteen extension pages with typed workflows  
**Priority:** High  
**Type:** Regression  
**Preconditions:** Use a warden/canteen-authorized user with a building, visitor, outpass, attendance, meal-plan and report fixture.  
**Test Steps:**

1. Open /hostel/buildings, /hostel/visitors, /hostel/outpasses, /hostel/attendance, /hostel/reports, /canteen/meal-plans and /canteen/reports.
2. Create or transition one record in each supported workflow.
3. Inspect the dedicated source table, student/room/menu relationship, status/audit event and report output.
   **Expected Result:** Each supported route uses typed hostel/canteen data and business transitions; a generic moduleRecords name/note/status row alone is not accepted. Current baseline behavior is recorded as a failed acceptance result.
   **Linked Audit Finding:** [F-022](AUDIT.md#f-022--generic-route-fallback-masks-implementation-gaps)

### 2.14 Inventory, Procurement and Assets

**Test ID:** TC-OPS-001  
**Title:** Receive purchased goods, update stock and assign an asset  
**Priority:** High  
**Type:** E2E  
**Preconditions:** Log in as procurement/inventory user; an approved requisition and inventory item exist; an asset can be created.  
**Test Steps:**

1. Create a purchase order from the approved requisition.
2. Transition it to the receipt-ready state.
3. Post a goods receipt for quantity 5.
4. Verify inventory quantity/stock movement and create/assign an asset.
5. Open maintenance/depreciation views.
   **Expected Result:** The goods receipt and stock movement are linked to the purchase order; quantity increases exactly once; asset assignment and lifecycle rows are scoped/audited.
   **Linked Audit Finding:** None — implemented core happy path.

**Test ID:** TC-OPS-002  
**Title:** Reject negative stock and invalid procurement transitions  
**Priority:** High  
**Type:** Integration  
**Preconditions:** Inventory item has quantity 10; a requisition is draft.  
**Test Steps:**

1. Submit an outbound stock movement of 11.
2. Transition the draft requisition directly to a state not allowed by the workflow map.
3. Post a goods receipt for an unknown purchase order.
   **Expected Result:** Each operation returns conflict/not-found; stock and workflow rows remain unchanged.
   **Linked Audit Finding:** None — baseline data integrity.

**Test ID:** TC-OPS-003  
**Title:** Deny teacher and parent procurement/inventory writes  
**Priority:** High  
**Type:** Security  
**Preconditions:** Log in as teacher and parent with no inventory/procurement/assets create/update permission.  
**Test Steps:**

1. Call postStockMovement, createRequisition and createAsset.
2. Attempt to change organizationId/campusId in the input.
3. Inspect source tables.
   **Expected Result:** All writes are forbidden or scope-denied; no stock, procurement or asset row changes.
   **Linked Audit Finding:** None — baseline RBAC.

**Test ID:** TC-OPS-004  
**Title:** Link purchase orders to supplier master and expose vendor/location workflows  
**Priority:** Medium  
**Type:** Regression  
**Preconditions:** Create a supplier record and a stock location; create an approved requisition.  
**Test Steps:**

1. Open /procurement/vendors and /inventory/stock-locations.
2. Create a purchase order selecting the supplier ID.
3. Generate a vendor/spend report and inspect the purchase-order row.
   **Expected Result:** The purchase order stores a stable supplier reference, vendor reports aggregate by supplier, and location data is typed; storing only supplierName in detailsJson is a failed acceptance result.
   **Linked Audit Finding:** [F-017](AUDIT.md#f-017--procurement-supplier-master-is-disconnected-from-purchase-orders) and [F-022](AUDIT.md#f-022--generic-route-fallback-masks-implementation-gaps)

### 2.15 Health, Safety and Facilities

**Test ID:** TC-SAFE-001  
**Title:** Record health, visitor, incident and facility workflows  
**Priority:** High  
**Type:** E2E  
**Preconditions:** Log in as a management/safety user with health:update, safety:create and facilities:create; use Organization A test records.  
**Test Steps:**

1. Save a student health profile and clinic visit.
2. Create a visitor, gate pass, security incident and evacuation record.
3. Request a facility booking and create a maintenance ticket/complaint.
4. Transition each record through one valid state.
   **Expected Result:** Each record is stored in its dedicated tenant/campus table, valid transitions are audited, and sensitive data is visible only to authorized test roles.
   **Linked Audit Finding:** None — implemented core happy path.

**Test ID:** TC-SAFE-002  
**Title:** Reject invalid health and facility inputs  
**Priority:** High  
**Type:** Integration  
**Preconditions:** Use a valid student and facility.  
**Test Steps:**

1. Submit health text above the schema limit.
2. Submit a clinic visit with a missing student or summary.
3. Submit a facility booking whose end is before or equal to its start.
4. Attempt an invalid status transition.
   **Expected Result:** Validation/conflict/not-found responses are returned; no invalid health/facility row or transition is stored.
   **Linked Audit Finding:** None — baseline validation.

**Test ID:** TC-SAFE-003  
**Title:** Enforce sensitive health permission on profile reads and uploads  
**Priority:** Critical  
**Type:** Security  
**Preconditions:** Create a custom test role with health:read but without health:view_sensitive; create one health profile and one health document.  
**Test Steps:**

1. Open /health/profiles as the custom role.
2. Call /api/uploads/signature with entityType health_record.
3. Attempt to view the health document and profile through a direct URL.
   **Expected Result:** Health allergies/conditions and health-document upload/download are denied until health:view_sensitive is granted; ordinary health:read does not reveal sensitive values.
   **Linked Audit Finding:** [F-013](AUDIT.md#f-013--health-profile-reads-do-not-require-healthview_sensitive)

**Test ID:** TC-SAFE-004  
**Title:** Prevent overlapping facility bookings during concurrent approval  
**Priority:** High  
**Type:** Regression  
**Preconditions:** Facility Room A has no approved booking; two facility requests use overlapping windows.  
**Test Steps:**

1. Create both booking requests concurrently.
2. Approve both requests concurrently.
3. Count approved overlapping bookings for Room A and inspect conflict responses.
   **Expected Result:** At most one overlapping booking is approved; the other approval returns conflict; the database has no overlapping approved invariant violation.
   **Linked Audit Finding:** [F-012](AUDIT.md#f-012--facility-booking-overlap-is-not-protected-at-approval-time)

### 2.16 Activities, Alumni and CMS

**Test ID:** TC-COMM-001  
**Title:** Create a club membership, alumni event and public CMS form submission  
**Priority:** Medium  
**Type:** E2E  
**Preconditions:** Log in as an authorized activities/alumni/CMS user; create an active student, club and published public form.  
**Test Steps:**

1. Create a club and add the student as a member.
2. Create an alumni event and register an attendee.
3. Create a CMS page, publish it, and submit the public form through /api/public/cms/forms/{id}.
4. Inspect the activity, alumni, CMS and submission tables.
   **Expected Result:** Each typed record is stored in Organization A; duplicate membership is prevented; published CMS page/form is reachable only according to its public contract; and actions are audited.
   **Linked Audit Finding:** None — implemented core happy path.

**Test ID:** TC-COMM-002  
**Title:** Reject duplicate memberships, malformed forms and invalid donations  
**Priority:** Medium  
**Type:** Integration  
**Preconditions:** Club membership and published form already exist.  
**Test Steps:**

1. Add the same student to the same club twice.
2. Create a form with malformed JSON or an invalid field name.
3. Submit a zero/negative or oversized donation.
   **Expected Result:** Conflict/validation responses are returned; no duplicate membership, invalid form or invalid donation row is created.
   **Linked Audit Finding:** None — baseline validation.

**Test ID:** TC-COMM-003  
**Title:** Deny student publishing and cross-campus community writes  
**Priority:** High  
**Type:** Security  
**Preconditions:** Log in as student; prepare a draft CMS page and a club in another campus.  
**Test Steps:**

1. Call the CMS publish action.
2. Attempt to create a membership referencing the other-campus club/student.
3. Query CMS/community data after the requests.
   **Expected Result:** CMS publication and out-of-scope membership are denied; draft and community data remain unchanged.
   **Linked Audit Finding:** None — baseline permission/scope.

**Test ID:** TC-COMM-004  
**Title:** Verify CMS media provenance and complete missing community routes  
**Priority:** Medium  
**Type:** Regression  
**Preconditions:** Have a valid Cloudinary asset and an external URL that is not owned by the tenant.  
**Test Steps:**

1. Attempt to register the external URL as CMS media.
2. Register the verified Cloudinary asset.
3. Open /activities/houses, /activities/competitions, /cms/news, /cms/galleries and /cms/settings.
   **Expected Result:** Only verified tenant-owned media is accepted; the other routes use typed domain records and permissions rather than storing arbitrary URL/name/note records. Current baseline behavior is recorded as a failure where applicable.
   **Linked Audit Finding:** [F-018](AUDIT.md#f-018--cms-media-url-is-not-verified-by-the-upload-policy) and [F-022](AUDIT.md#f-022--generic-route-fallback-masks-implementation-gaps)

### 2.17 Reports, Analytics and Dashboards

**Test ID:** TC-RPT-001  
**Title:** View a scoped report and export CSV, XLSX and print HTML  
**Priority:** High  
**Type:** E2E  
**Preconditions:** Organization A and B each have students/invoices; log in as a reports-authorized Organization A user.  
**Test Steps:**

1. Open /analytics and verify KPI/trend values against the Organization A fixture.
2. Open /reports and select students, finance and attendance.
3. Download CSV, XLSX and Print HTML for each selected report.
4. Inspect response headers, rows, organization scope and audit entries.
   **Expected Result:** Only Organization A/campus-scope rows are returned; CSV/XLSX/HTML content is valid and safely escaped; each export is private/no-store and audited.
   **Linked Audit Finding:** None — implemented report happy path.

**Test ID:** TC-RPT-002  
**Title:** Reject unknown report types and unbounded limits  
**Priority:** High  
**Type:** API  
**Preconditions:** Have an authenticated user with reports:read but no export permission.  
**Test Steps:**

1. Request /reports?report=unknown.
2. Request /api/exports?report=students&format=csv&limit=999999.
3. Request an unsupported export format.
   **Expected Result:** The page falls back only to its documented safe default or returns validation; export requests reject invalid limits/formats; no unbounded query runs.
   **Linked Audit Finding:** None — baseline contract validation.

**Test ID:** TC-RPT-003  
**Title:** Deny unauthorized and sensitive report exports  
**Priority:** High  
**Type:** Security  
**Preconditions:** Log in as teacher and parent; neither has reports:export or reports:export_sensitive.  
**Test Steps:**

1. Call /api/exports for finance/payroll as each role.
2. Attempt a sensitive export query with reports:export_sensitive missing.
3. Inspect response and audit log.
   **Expected Result:** Every unauthorized export returns forbidden; no file body or sensitive row is returned; no successful export audit exists.
   **Linked Audit Finding:** None — permission boundary.

**Test ID:** TC-RPT-004  
**Title:** Implement scheduled reports, alerts, drill-downs and true PDF output  
**Priority:** Medium  
**Type:** Regression  
**Preconditions:** Seed an overdue invoice, low attendance, missing marks and low-stock item; configure a report schedule.  
**Test Steps:**

1. Open /reports/scheduled, /alerts, /data-quality and each analytics drill-down.
2. Create a schedule and run it through the worker.
3. Export PDF and inspect MIME type, file signature and filename.
4. Inspect source-linked alert/schedule/history rows.
   **Expected Result:** Scheduled reports and source-linked alerts are typed, rerunnable and auditable; PDF response is application/pdf with a valid PDF payload; generic rows or HTML disguised as PDF are not accepted.
   **Linked Audit Finding:** [F-019](AUDIT.md#f-019--scheduled-insights-and-pdf-output-are-not-implemented) and [F-022](AUDIT.md#f-022--generic-route-fallback-masks-implementation-gaps)

### 2.18 Integrations and Automation

**Test ID:** TC-INT-001  
**Title:** Save an encrypted integration, issue an API key and accept a signed webhook  
**Priority:** Critical  
**Type:** Integration  
**Preconditions:** Log in as super_admin/management with integrations:manage; configure provider test-provider with endpoint, API key and webhook secret.  
**Test Steps:**

1. Save the configuration and inspect the integration list.
2. Create an API key and copy the returned secret.
3. Build an HMAC signature for event-001 and POST it to /api/integrations/webhooks/test-provider with the required organization/event headers.
4. Inspect integrationConfigs, apiKeys, webhookEvents and integrationLogs.
   **Expected Result:** Secrets are not returned by list operations; the API key secret is returned only once and stored hashed; the valid webhook is accepted once, logged and encrypted at rest.
   **Linked Audit Finding:** None — implemented boundary happy path.

**Test ID:** TC-INT-002  
**Title:** Reject invalid provider configuration, signatures and worker secrets  
**Priority:** High  
**Type:** API  
**Preconditions:** Use an invalid provider key/config, wrong HMAC signature and wrong internal job secret.  
**Test Steps:**

1. Submit an empty/invalid integration configuration.
2. POST a webhook with a modified body/signature.
3. POST /api/internal/jobs/run with a missing or wrong x-internal-job-secret.
   **Expected Result:** Validation is returned for configuration; webhook returns unauthorized and is logged as rejected; the job route returns 401; no job is claimed.
   **Linked Audit Finding:** None — baseline security.

**Test ID:** TC-INT-003  
**Title:** Deny provider configuration and API-key administration to non-managers  
**Priority:** Critical  
**Type:** Security  
**Preconditions:** Log in as principal, teacher, accountant and parent; note principal intentionally lacks integrations permissions in config/permissions.ts.  
**Test Steps:**

1. Call saveIntegrationConfigAction and createApiKeyAction as each role.
2. Attempt to disable another tenant's integration/API key by ID.
3. Inspect configuration/key rows and audit rows.
   **Expected Result:** Only roles with integrations:manage can mutate Organization A; cross-tenant IDs return not-found/forbidden; secrets and configuration values are not exposed.
   **Linked Audit Finding:** [F-004](AUDIT.md#f-004--production-payment-notification-hardware-gps-lms-and-calendar-adapters-are-not-implemented)

**Test ID:** TC-INT-004  
**Title:** Make webhook deduplication atomic and exercise provider adapters/retries  
**Priority:** High  
**Type:** Regression  
**Preconditions:** Configure one provider and prepare two identical event-001 deliveries plus provider adapters for one payment and one notification.  
**Test Steps:**

1. POST both identical signed webhooks concurrently.
2. Run the worker against any queued delivery job and simulate provider success, failure and retry.
3. Inspect webhookEvents uniqueness, integrationLogs, jobRuns and provider reference/status.
   **Expected Result:** Exactly one webhook event is stored for the organization/provider/event identity; one delivery job is claimed safely; transient provider failures retry with backoff; terminal failures are visible; and successful external delivery is distinct from local queue acceptance.
   **Linked Audit Finding:** [F-015](AUDIT.md#f-015--webhook-duplicate-protection-is-check-then-insert) and [F-004](AUDIT.md#f-004--production-payment-notification-hardware-gps-lms-and-calendar-adapters-are-not-implemented)

### 2.19 Import and Export

**Test ID:** TC-IMP-001  
**Title:** Import valid student CSV rows and download row errors  
**Priority:** High  
**Type:** E2E  
**Preconditions:** Log in as a user with students:import; prepare a CSV with two valid rows and one duplicate/malformed row.  
**Test Steps:**

1. Open /students/import and select the CSV.
2. Submit the import.
3. If queued, run the authorized worker until completion.
4. Open the job list and download its error CSV.
5. Query students and importJobs.
   **Expected Result:** Valid rows create students; invalid rows remain in the error report with row/field messages; the job reaches completed_with_errors; counts and audit data match.
   **Linked Audit Finding:** None — implemented student import happy path.

**Test ID:** TC-IMP-002  
**Title:** Reject duplicate rows, missing columns and over-limit imports  
**Priority:** High  
**Type:** API  
**Preconditions:** Prepare CSV files with duplicate admission numbers, missing required columns, more than 1,000 rows and a body over 5 MB.  
**Test Steps:**

1. POST each file to /api/imports/students.
2. Inspect status/body and importJobs.
3. Retry a valid large request with the same idempotency key.
   **Expected Result:** Invalid/oversized requests return 4xx without creating students; duplicate rows are reported per row; the same idempotency key does not enqueue a second job.
   **Linked Audit Finding:** None — baseline import controls.

**Test ID:** TC-IMP-003  
**Title:** Deny imports to users without students:import  
**Priority:** Critical  
**Type:** Security  
**Preconditions:** Log in as teacher, parent, student and accountant, none with students:import.  
**Test Steps:**

1. POST a valid CSV as each role.
2. Call the import-error download URL for an existing job.
3. Inspect student/import-job counts.
   **Expected Result:** Every request returns forbidden; no student/job/error export is disclosed or changed.
   **Linked Audit Finding:** None — permission boundary.

**Test ID:** TC-IMP-004  
**Title:** Support non-student imports and background/PDF exports  
**Priority:** Medium  
**Type:** Regression  
**Preconditions:** Prepare employee, fee, marks and inventory files and a report with more than the synchronous threshold.  
**Test Steps:**

1. Open the agreed employee/fee/marks/inventory import routes.
2. Submit each file and inspect queued job/progress/error rows.
3. Request a large report as a background export and a PDF.
   **Expected Result:** Each supported dataset has a validated import job; large exports are queued and resumable; PDF has a valid PDF MIME/file; current student-CSV-only and synchronous HTML behavior is recorded as a failed acceptance result.
   **Linked Audit Finding:** [F-020](AUDIT.md#f-020--importexport-coverage-stops-at-student-csv-and-synchronous-report-files)

**Test ID:** TC-IMP-005  
**Title:** Unit-test student import parsing and row-error reporting  
**Priority:** High  
**Type:** Unit  
**Preconditions:** Run Vitest against `features/import-export/services/student-import-parser.ts`; no database or browser session is required.  
**Test Steps:**

1. Parse a CSV with valid rows, blank rows and duplicate admission numbers.
2. Parse rows with missing fields and malformed values, then compare their row/field errors.
3. Compare the returned records, normalized fields, totalRows and row-level errors with the parser contract; leave the request-size and row-cap checks to TC-IMP-002.
   **Expected Result:** Valid rows are normalized; blank rows are ignored as defined; invalid rows retain deterministic row/field errors; and totalRows is reported without silently dropping parser input.
   **Linked Audit Finding:** None — unit baseline for the implemented student import slice.

### 2.20 Role Portals

**Test ID:** TC-PORT-001  
**Title:** Show role-specific dashboard metrics and linked student records  
**Priority:** High  
**Type:** E2E  
**Preconditions:** Seed teacher class scope and parent/student linked scope; seed attendance, assignment, result, fee, transport and library data.  
**Test Steps:**

1. Open /teacher as the teacher.
2. Open /parent as the parent.
3. Open /student as the linked student.
4. Compare cards, student rows and quick-action links with source tables.
   **Expected Result:** Teacher sees assigned-class metrics; parent sees linked children; student sees own data; each card is backed by authorized server queries and no unrelated student appears.
   **Linked Audit Finding:** None — current snapshot happy path.

**Test ID:** TC-PORT-002  
**Title:** Handle empty linked and assigned scopes safely  
**Priority:** Medium  
**Type:** E2E  
**Preconditions:** Use a parent with no linked children and a teacher with no class-section scope.  
**Test Steps:**

1. Open the relevant portal pages.
2. Follow each quick-action link.
3. Attempt a write through a linked module route.
   **Expected Result:** The dashboard shows an explicit empty state, no records are fabricated, reads return zero scoped rows, and writes remain permission/scope protected.
   **Linked Audit Finding:** None — edge-state coverage.

**Test ID:** TC-PORT-003  
**Title:** Deny a user from opening another role’s portal  
**Priority:** High  
**Type:** Security  
**Preconditions:** Have valid parent, student and teacher sessions with portals:read.  
**Test Steps:**

1. Open /teacher as the parent and student.
2. Open /parent as the teacher.
3. Open /student as the teacher and parent.
4. Inspect HTTP status, rendered role title and data queries.
   **Expected Result:** Each user is denied or redirected unless the requested portal matches an explicitly documented role policy; no caller-selected portal can expose a different role’s view.
   **Linked Audit Finding:** [F-014](AUDIT.md#f-014--portal-pages-do-not-enforce-the-requested-role)

**Test ID:** TC-PORT-004  
**Title:** Add dedicated portal subpages and preserve linked-student isolation  
**Priority:** Medium  
**Type:** Regression  
**Preconditions:** Parent is linked to Student A but not Student B; both have attendance, fee, result and assignment data.  
**Test Steps:**

1. Open the portal timetable, homework, fees/receipts, PTM, notices and documents links.
2. Confirm each page queries the selected linked student rather than a broad workspace.
3. Attempt to change a child identifier in the URL/query.
   **Expected Result:** Dedicated portal pages show only Student A data; switching children is explicit and scoped; changing an ID cannot reveal Student B.
   **Linked Audit Finding:** [F-014](AUDIT.md#f-014--portal-pages-do-not-enforce-the-requested-role) and [F-022](AUDIT.md#f-022--generic-route-fallback-masks-implementation-gaps)

### 2.21 Audit and Operational Controls

**Test ID:** TC-AUD-001  
**Title:** Record and view a tenant mutation audit trail  
**Priority:** High  
**Type:** Integration  
**Preconditions:** Log in as an audit-authorized Organization A user; create/update/archive one scoped record.  
**Test Steps:**

1. Perform the mutation through its normal action.
2. Open /audit-logs.
3. Filter/read the returned audit row and compare actor, organization, campus, entity, action and timestamps with the mutation.
   **Expected Result:** The audit row is present, tenant/campus scoped and readable only to authorized roles; before/after metadata does not expose secrets.
   **Linked Audit Finding:** None — baseline audit coverage.

**Test ID:** TC-AUD-002  
**Title:** Reject unauthenticated operational access  
**Priority:** Critical  
**Type:** API  
**Preconditions:** Clear all session cookies and use a request client with no Firebase/session credentials.  
**Test Steps:**

1. Request /audit-logs, /dashboard and /api/internal/jobs/run.
2. Request /api/health/live and /api/health/ready separately.
   **Expected Result:** Protected pages/routes deny or redirect; the internal job endpoint returns 401; liveness is available according to its public contract; readiness reports configuration/database state without leaking secrets.
   **Linked Audit Finding:** None — baseline operational boundary.

**Test ID:** TC-AUD-003  
**Title:** Enforce audit-log permission and tenant isolation  
**Priority:** High  
**Type:** Security  
**Preconditions:** Organization A and B have audit rows; log in as a student, parent and Organization A audit reader.  
**Test Steps:**

1. Request audit logs as the student and parent.
2. Request them as the Organization A audit reader.
3. Try to change organization/campus query values or use an Organization B entity ID.
   **Expected Result:** Only the authorized reader receives Organization A rows; other roles are denied; Organization B rows never appear.
   **Linked Audit Finding:** None — baseline audit scope.

**Test ID:** TC-AUD-004  
**Title:** Make browser smoke and production observability gates executable  
**Priority:** Medium  
**Type:** Regression  
**Preconditions:** Run on a machine where the standalone server can bind the configured test address; configure test Firebase/DB values.  
**Test Steps:**

1. Run npm.cmd run test:e2e.
2. Confirm the login heading test, unauthenticated dashboard redirect and unauthenticated platform redirect all execute against the same running server.
3. Repeat with metrics/error logging/alert routing enabled in the staging deployment.
   **Expected Result:** The three smoke tests pass without connection/bind errors; staging records request errors, worker failures, readiness failures and security alerts; current EACCES port failure is classified as environment-blocked rather than a product pass/fail.
   **Linked Audit Finding:** [F-023](AUDIT.md#f-023--smoke-e2e-result-is-environment-blocked)

## 3. Cross-Module / End-to-End Scenarios

**Test ID:** TC-E2E-001  
**Title:** New admission creates a usable student across modules  
**Priority:** Critical  
**Type:** E2E  
**Preconditions:** Fresh Organization A with academic year/class/section capacity; admissions user, teacher and parent test accounts exist.  
**Test Steps:**

1. Create and approve an admission.
2. Verify the student appears in /students with active enrollment and guardian link.
3. Mark attendance for the student.
4. Create an invoice and open the parent portal.
5. Enter and publish an exam result.
   **Expected Result:** The same student ID is used by enrollment, attendance, finance, results and parent portal; each module shows only the appropriate linked data; every transition is audited.
   **Linked Audit Finding:** [F-007](AUDIT.md#f-007--student-history-tabs-are-links-not-student-specific-history), [F-024](AUDIT.md#f-024--admission-document-verification-and-completeness-are-not-connected) and [F-014](AUDIT.md#f-014--portal-pages-do-not-enforce-the-requested-role)

**Test ID:** TC-E2E-002  
**Title:** Parent views a fee due, completes payment and receives a receipt  
**Priority:** Critical  
**Type:** E2E  
**Preconditions:** Parent is linked to Student A; invoice has a balance; payment provider sandbox is configured.  
**Test Steps:**

1. Log in as the parent and view the fee balance.
2. Start the selected payment flow.
3. Complete the provider sandbox payment and deliver the signed webhook.
4. Refresh the parent fee/receipt view and inspect finance/provider/audit rows.
   **Expected Result:** The provider reference is linked to exactly one payment; invoice balance, receipt, ledger and parent display agree; repeated webhook delivery is idempotent; failed provider delivery is visible/retryable.
   **Linked Audit Finding:** [F-004](AUDIT.md#f-004--production-payment-notification-hardware-gps-lms-and-calendar-adapters-are-not-implemented), [F-015](AUDIT.md#f-015--webhook-duplicate-protection-is-check-then-insert) and [F-002](AUDIT.md#f-002--fee-configuration-and-accounting-routes-use-the-generic-record-workspace)

**Test ID:** TC-E2E-003  
**Title:** Absence creates the correct notification without exposing unrelated students  
**Priority:** High  
**Type:** Integration  
**Preconditions:** Parent is linked to Student A only; Student B is in the same campus; teacher is assigned to the class.  
**Test Steps:**

1. Teacher marks Student A absent.
2. Read the resulting notification as the parent and as Student B’s parent.
3. Generate the attendance report/low-attendance alert.
   **Expected Result:** Student A’s parent receives the correct scoped notification; Student B’s parent receives none; report/alert data uses typed attendance aggregates rather than a generic route.
   **Linked Audit Finding:** [F-008](AUDIT.md#f-008--staff-wellbeing-low-attendance-and-report-routes-are-not-implemented), [F-010](AUDIT.md#f-010--communication-is-limited-to-in-app-events) and [F-022](AUDIT.md#f-022--generic-route-fallback-masks-implementation-gaps)

**Test ID:** TC-E2E-004  
**Title:** Procurement receipt updates stock and asset records once  
**Priority:** High  
**Type:** Integration  
**Preconditions:** Approved requisition references an inventory item; one goods receipt and one asset are ready for the test.  
**Test Steps:**

1. Create a purchase order and receive quantity 5.
2. Retry the same receipt request with the same idempotency/reference if supported.
3. Inspect inventory quantity, stock movements, purchase order status, goods receipt and asset assignment.
   **Expected Result:** Stock increases once, receipt/order transitions are valid, duplicate processing is rejected or idempotent, and audit entries connect the entire chain.
   **Linked Audit Finding:** [F-017](AUDIT.md#f-017--procurement-supplier-master-is-disconnected-from-purchase-orders)

**Test ID:** TC-E2E-005  
**Title:** Signed provider webhook flows through job, notification and audit records  
**Priority:** Critical  
**Type:** Integration  
**Preconditions:** Configure a provider sandbox, valid webhook secret and worker secret; seed a payment or notification event.  
**Test Steps:**

1. Send a valid signed webhook.
2. Send the same event concurrently and then send a bad signature for a new event.
3. Run the worker.
4. Inspect provider status, jobRuns, webhookEvents, integrationLogs and tenant audit logs.
   **Expected Result:** Valid event is accepted once, duplicate is idempotent, bad signature is rejected, worker retry/dead-letter state is correct, and no provider secret/payload is exposed to unauthorized users.
   **Linked Audit Finding:** [F-004](AUDIT.md#f-004--production-payment-notification-hardware-gps-lms-and-calendar-adapters-are-not-implemented) and [F-015](AUDIT.md#f-015--webhook-duplicate-protection-is-check-then-insert)

**Test ID:** TC-E2E-006  
**Title:** Student import feeds attendance, finance and portal scope  
**Priority:** High  
**Type:** E2E  
**Preconditions:** User has students:import; CSV contains two students with valid academic context; parent links will be created after import.  
**Test Steps:**

1. Import the CSV and wait for completion.
2. Create guardian links and an invoice for one imported student.
3. Mark attendance and publish a result.
4. Log in as that student’s parent and inspect the portal.
   **Expected Result:** Imported IDs are stable across student, enrollment, attendance, finance, results and portal data; row errors are separate; no unrelated student is exposed.
   **Linked Audit Finding:** [F-007](AUDIT.md#f-007--student-history-tabs-are-links-not-student-specific-history) and [F-020](AUDIT.md#f-020--importexport-coverage-stops-at-student-csv-and-synchronous-report-files)

## 4. Security Test Checklist

### RBAC matrix

Use the following expected boundary as the minimum role-by-endpoint matrix. A custom role or delegation may add an explicit permission, but a client-supplied role must never do so.

| Endpoint/action                                 | Platform admin                            | Super admin / management                   | Teacher                                              | Accountant                       | Parent / student        | Librarian / transport / warden   | Public                                   |
| ----------------------------------------------- | ----------------------------------------- | ------------------------------------------ | ---------------------------------------------------- | -------------------------------- | ----------------------- | -------------------------------- | ---------------------------------------- |
| GET /platform and school provisioning           | Allow                                     | Deny                                       | Deny                                                 | Deny                             | Deny                    | Deny                             | Deny                                     |
| Tenant dashboard/session                        | Platform redirects to platform context    | Allow                                      | Allow                                                | Allow                            | Allow                   | Allow                            | Deny                                     |
| Student create/update                           | Deny tenant action                        | Allow                                      | Deny unless explicitly delegated                     | Deny unless explicitly delegated | Deny                    | Deny unless explicitly delegated | Deny                                     |
| Student read linked/scope                       | Deny tenant action                        | Allow                                      | Assigned class only                                  | Configured read scope            | Own/linked only         | Configured read scope            | Deny                                     |
| Attendance mark                                 | Deny tenant action                        | Allow                                      | Assigned class only                                  | Deny by default                  | Deny                    | Warden read only by default      | Deny                                     |
| Attendance correction approval                  | Deny tenant action                        | Allow                                      | Deny by default                                      | Deny by default                  | Deny                    | Deny by default                  | Deny                                     |
| Fee collect/refund                              | Deny tenant action                        | Allow if granted                           | Deny                                                 | Allow                            | Deny                    | Deny                             | Deny                                     |
| Exam marks entry/publication                    | Deny tenant action                        | Allow if granted                           | Enter assigned marks only; no publish by default     | Deny                             | Read published only     | Deny by default                  | Deny                                     |
| Payroll processing/payslip read                 | Deny tenant action                        | Allow if granted                           | Read only if granted                                 | Allow if granted                 | Deny                    | Deny by default                  | Deny                                     |
| Library issue/administration                    | Deny tenant action                        | Allow if granted                           | Deny by default                                      | Deny                             | Borrower scope only     | Librarian allow                  | Deny                                     |
| Transport allocation/manifest                   | Deny tenant action                        | Allow if granted                           | Deny by default                                      | Deny                             | Read linked only        | Transport staff allow            | Deny                                     |
| Hostel allotment/canteen administration         | Deny tenant action                        | Allow if granted                           | Deny                                                 | Deny                             | Read according to scope | Warden allow                     | Deny                                     |
| Health profile read/update and health documents | Deny tenant action                        | Read/update only with sensitive permission | Deny by default                                      | Deny                             | Deny sensitive data     | Only explicitly granted          | Deny                                     |
| CMS publish                                     | Deny tenant action                        | Allow if granted                           | Deny by default                                      | Deny                             | Deny                    | Deny by default                  | Public read/submission only              |
| Report export / sensitive export                | Deny tenant action                        | Allow if granted                           | Deny unless explicitly granted                       | Allow configured reports         | Deny                    | Configured scope only            | Deny                                     |
| Integration manage/API keys                     | Deny tenant action                        | Allow                                      | Principal/other roles deny unless explicitly granted | Deny                             | Deny                    | Deny                             | Deny                                     |
| Webhook intake                                  | Deny browser identity; signature required | Not a tenant UI action                     | Not a tenant UI action                               | Not a tenant UI action           | Not a tenant UI action  | Not a tenant UI action           | Allow only with valid provider signature |
| Internal job runner                             | Deny                                      | Not a tenant UI action                     | Not a tenant UI action                               | Not a tenant UI action           | Not a tenant UI action  | Not a tenant UI action           | Allow only with internal secret          |
| Tenant/platform audit logs                      | Platform audit only                       | Tenant audit if granted                    | Deny by default                                      | Deny by default                  | Deny                    | Configured role only             | Deny                                     |

### Additional security checks

- Tenant isolation: repeat every read/write with Organization B IDs, Campus B1 IDs and forged organizationId/campusId fields; expect denial or not-found and zero cross-tenant rows.
- IDOR: change student, invoice, payment, document, portal, job, webhook and audit identifiers in URLs and bodies.
- Input injection: try SQL metacharacters, HTML tags, event-handler attributes, spreadsheet formulas, JSON prototype-like keys and oversized strings in names, notes, CMS body, public forms and report exports.
- XSS/CSP: render CMS body, media metadata, notices, messages, error text and imported student names in a browser; confirm escaping and CSP behavior.
- Authentication: test expired/revoked sessions, email-unverified users, logout reuse, active-campus cookie tampering, Firebase token audience/issuer failures and login rate limits.
- Uploads: test executable formats, oversized files, wrong Cloudinary host, wrong publicId prefix, mismatched version/secure URL, health_record without health:view_sensitive and cross-tenant entity IDs.
- Secrets: verify API key secrets, provider configuration, webhook bodies, Firebase credentials, session/encryption values and internal job secrets never appear in HTML, logs, exports or error responses.
- Rate limits: test login/session, imports, public forms, webhooks and job endpoints at and above their configured thresholds.
- Concurrency: run transport allocation, hostel bed allocation, facilities approval, finance payment/refund, import idempotency and webhook delivery in parallel; assert database invariants, not only HTTP success.
- Privacy: validate payroll, health, student documents, reports and audit log retention/access with a custom role matrix and an explicit data-deletion/retention policy.

### Performance/load checks

1. Use k6 or Artillery against a staging-like deployment with representative Organization A data and a separate Organization B tenant.
2. Measure p50/p95/p99 latency and error rate for dashboard/report reads, student list/profile reads, bulk attendance marking, fee payment/refund, import submission, webhook intake and report export.
3. Run concurrent route-allocation, hostel-bed, facility-approval, payment, import and webhook workloads at the expected peak class size; record database lock/deadlock/retry behavior and invariant violations.
4. Run a large report/export and a 1,000-row student import; confirm bounded memory, request timeouts, queued progress and no unbounded synchronous response.
5. Set release-specific thresholds before execution. Do not treat the following as measured targets until the run produces evidence: no invariant violation, no cross-tenant row, no duplicate money/provider event, and an agreed p95 per endpoint.

### Accessibility checks

1. Run axe or an equivalent scanner on /login, /dashboard, /students/new, /attendance/students, /fees/invoices, /exams/marks, /students/{selected-id}/documents, /reports and each role portal.
2. Navigate each page keyboard-only: reach every input/action, observe a visible focus indicator, operate dialogs/forms, and submit without a mouse.
3. Verify every form control has an accessible label, validation error is associated with the field and announced, tables have usable headers, status changes are announced, and color is not the only error/success signal.
4. Repeat at narrow viewport and with a screen reader; record the page, selector/label, assistive-technology result and a screenshot for every defect.

## 5. Regression Checklist (Traceability Matrix)

| Audit Finding                                                                    | Severity | Test ID(s) covering it                                                                                                               |
| -------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| F-001 — Academic core routes use the generic record workspace                    | Critical | TC-ACD-001, TC-ACD-002, TC-ACD-003, TC-ACD-004                                                                                       |
| F-002 — Fee configuration and accounting routes use the generic record workspace | Critical | TC-FIN-004, TC-E2E-002                                                                                                               |
| F-003 — Payroll deductions are hard-coded to zero                                | Critical | TC-HR-004                                                                                                                            |
| F-004 — Production provider adapters are not implemented                         | Critical | TC-FIN-004, TC-COM-004, TC-INT-001, TC-INT-004, TC-TRANS-005, TC-E2E-002, TC-E2E-005                                                 |
| F-005 — Hostel bed allocation is not atomic/unique                               | Critical | TC-RES-004                                                                                                                           |
| F-006 — Student update authorization is broader than student read authorization  | High     | TC-SIS-003, TC-E2E-006                                                                                                               |
| F-007 — Student history tabs are links, not student-specific history             | High     | TC-SIS-004, TC-E2E-001, TC-E2E-006                                                                                                   |
| F-008 — Staff, wellbeing, low-attendance and report routes are not implemented   | High     | TC-ATT-004, TC-E2E-003                                                                                                               |
| F-009 — Exam deep-feature routes are not connected to domain services            | High     | TC-EXAM-004                                                                                                                          |
| F-010 — Communication is limited to in-app events                                | High     | TC-COM-004, TC-E2E-003                                                                                                               |
| F-011 — Transport capacity is check-then-insert                                  | High     | TC-TRANS-002, TC-TRANS-004                                                                                                           |
| F-012 — Facility booking overlap is not protected at approval time               | High     | TC-SAFE-004                                                                                                                          |
| F-013 — Health profile reads do not require health:view_sensitive                | High     | TC-SAFE-003                                                                                                                          |
| F-014 — Portal pages do not enforce the requested role                           | High     | TC-PORT-003, TC-E2E-001                                                                                                              |
| F-015 — Webhook duplicate protection is check-then-insert                        | High     | TC-INT-004, TC-E2E-002, TC-E2E-005                                                                                                   |
| F-022 — Generic route fallback masks implementation gaps                         | High     | TC-ADM-004, TC-ACD-004, TC-ATT-004, TC-COM-004, TC-HR-005, TC-LIB-004, TC-OPS-004, TC-PORT-004, TC-RES-005, TC-RPT-004, TC-TRANS-005 |
| F-024 — Admission document verification and completeness are not connected       | High     | TC-ADM-004, TC-E2E-001                                                                                                               |
| F-025 — Student document tab has no dedicated upload/list workflow               | High     | TC-SIS-004, TC-E2E-001                                                                                                               |

## 6. Test Execution Order Recommendation

1. Prepare the disposable database, Firebase/Cloudinary/provider sandboxes and role matrix; record build/version and migration identifiers.
2. Run Critical security and data-integrity regressions first: TC-AUTH-003, TC-SIS-003, TC-FIN-002, TC-FIN-003, TC-HR-004, TC-RES-004, TC-TRANS-004, TC-SAFE-003, TC-INT-004 and TC-E2E-005.
3. Run core happy paths in dependency order: platform/foundation, auth/users, admissions, SIS/documents, academic setup, attendance, exams, finance, HR, operations, safety/community and reports.
4. Run cross-module journeys TC-E2E-001 through TC-E2E-006 and verify database/audit traceability after each journey.
5. Run all negative/invalid-input and permission-boundary suites with Organization B/Campus B1 identifiers and direct action/API calls.
6. Run edge/concurrency/load tests for money, attendance, imports, webhook delivery, route capacity, bed allocation, facility bookings and report exports.
7. Run accessibility checks on user-facing pages: keyboard-only navigation, visible focus, form labels, error announcements, table headers, color contrast, responsive layout and screen-reader names.
8. Repeat npm.cmd test, npm.cmd run typecheck, npm.cmd run lint, npm.cmd run build and npm.cmd run test:e2e in a clean staging-like environment.
9. Do not approve release until all Critical/High matrix rows pass, provider delivery evidence is attached, the E2E server-binding issue is resolved, and backup/restore, migration, security, accessibility and load evidence is recorded.
