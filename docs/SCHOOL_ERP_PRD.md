<!-- Generated for School ERP React/Firebase/Turso/Cloudinary implementation. -->

# School ERP Product Requirements Document (PRD)

## 0. Document Purpose

This PRD defines the product scope, user needs, module requirements, non-functional requirements, acceptance criteria, and implementation expectations for a full-featured School ERP web application.

This document is written for a code-focused LLM or software engineering agent. It should be treated as a build-ready product specification, not as a vague idea brief. The LLM must implement the project using the chosen stack and must preserve clean architecture, strict typing, tenant isolation, role-based permissions, and modular code organization.

## 1. Product Summary

### 1.1 Product Name

**School ERP**

### 1.2 Product Type

A multi-tenant, web-based School ERP dashboard and portal system for schools, colleges, coaching centres, and groups of institutions.

### 1.3 Product Vision

Build a production-quality ERP platform that centralizes school operations into one unified system. A single student, staff, parent, and institution record should power all connected workflows such as admissions, attendance, examinations, fees, communication, transport, library, hostel, inventory, HR, payroll, analytics, and reports.

### 1.4 Core Business Outcome

The product should reduce manual school administration work by giving each role a controlled dashboard for the tasks they perform daily, while giving management strong visibility through analytics, reports, alerts, and audit logs.

### 1.5 Primary Stack Decisions

The implementation must use:

- **React with Next.js App Router** as the application framework because the selected dashboard starter is a Next.js React template.
- **TypeScript** for all application code.
- **Firebase Authentication** for login, signup, password reset, email verification, and identity management.
- **Turso / libSQL** as the primary relational database.
- **Drizzle ORM** for schema definitions, migrations, and typed queries.
- **Cloudinary** for image and file uploads through secure server-side signed upload flows.
- **next-shadcn-admin-dashboard** as the base dashboard UI/template reference.
- **shadcn/ui, Tailwind CSS, Radix UI, Lucide React** for core UI.
- **Tremor** for analytics, KPI cards, charts, dashboards, and MIS pages.
- **Zod** for validation.
- **React Hook Form** for forms.
- **TanStack Table** for data tables.
- **Vitest + React Testing Library + Playwright** for unit, integration, and end-to-end tests.

## 2. Target Users and Roles

The ERP must support the following user types. Every user must authenticate through Firebase Auth and must have a corresponding local profile in Turso.

### 2.1 Super Admin

Global owner of the platform. Manages organizations, campuses, subscription/status, system settings, super-level audit logs, integrations, and cross-tenant health.

### 2.2 Management / Principal

Institution leadership. Views full school dashboards, academic health, fee collection, admissions pipeline, staff performance, alerts, and approval workflows.

### 2.3 Office Staff / Administrator

Handles student records, admissions, document verification, certificates, notices, events, forms, and general school administration.

### 2.4 Teacher

Handles assigned classes, attendance, timetable, lesson plans, homework, assignments, marks entry, communication, substitution duties, and class-level reports.

### 2.5 Accountant

Handles fees, invoices, receipts, payments, refunds, ledgers, expenses, payroll posting, reconciliation, and finance reports.

### 2.6 Librarian

Handles library catalogue, book copies, issue/return, borrower limits, reservations, fines, digital resources, and library reports.

### 2.7 Transport Staff

Handles routes, stops, vehicles, drivers, manifests, allocations, trips, fuel, maintenance, and transport reports.

### 2.8 Hostel Warden

Handles hostel rooms, beds, allotments, attendance, outpass, visitors, hostel fees, mess records, discipline, and maintenance requests.

### 2.9 Parent / Guardian

Views child profile, attendance, homework, results, fee dues, receipts, transport status, leave requests, meetings, notices, documents, and communication.

### 2.10 Student

Views profile, timetable, assignments, resources, attendance, exams, results, certificates, quiz attempts, fees visibility, and service requests.

### 2.11 Alumni

Views alumni profile, directory settings, community events, mentoring, reunions, certificates, job board, and engagement features.

## 3. Product Scope

### 3.1 In Scope

The product must include complete foundations and functional modules for:

1. Platform Foundation
2. Admissions and Student Lifecycle
3. Academic Management
4. Attendance and Discipline
5. Examination and Assessment
6. Fees, Finance and Accounts
7. HR, Payroll and Staff Management
8. Parent, Student and Teacher Portals
9. Communication and Engagement
10. Library Management
11. Transport and Fleet
12. Hostel, Canteen and Residence
13. Inventory, Assets and Procurement
14. Health, Safety and Facilities
15. Activities, Sports and Houses
16. Alumni and Community
17. Website, Forms and CMS
18. Reports, Analytics and MIS
19. Integrations and Automation
20. Compliance, Accessibility and Quality

### 3.2 First Build Requirement

Because the complete ERP is very large, the first generated project must still include all modules in the navigation, routing, permissions, schema foundations, service layers, CRUD scaffolds, validation patterns, and dashboards. Complex integrations such as biometric hardware, GPS, WhatsApp provider, payment gateway, CCTV, external LMS, and voice calls should be implemented behind typed adapter interfaces with explicit configuration and clear extension points; an unconfigured integration must fail clearly rather than report a fake success.

The codebase must not leave empty placeholder pages. Every page should provide at least:

- A working route.
- Role-protected access.
- Tenant scope handling.
- A responsive layout.
- A table/list view.
- Create/edit form where applicable.
- Basic validation.
- Server action or API route integration.
- Audit log creation for data mutations.
- Empty, loading, error, and success states.

### 3.3 Out of Scope for Initial Build

The following are not required as fully working third-party production integrations in the initial code generation pass, but architecture must support them:

- Live GPS device integration.
- Biometric hardware integration.
- CCTV/access-control integration.
- Real payment gateway settlement.
- Actual SMS/WhatsApp/voice provider sending.
- Native Android/iOS app builds.
- Advanced AI analytics.
- SCORM/xAPI runtime implementation.
- Real online proctoring.
- Full accounting compliance for every jurisdiction.

## 4. Product Principles

### 4.1 Single Source of Truth

A single student record must power attendance, fees, exams, transport, library, hostel, health, portals, reports, and certificates. The application must never create duplicate student master tables per module.

### 4.2 Tenant Isolation

Every school group, campus, user, student, invoice, exam, report, document, message, and workflow must be scoped to an organization. Campus-scoped records must also include campus references where applicable.

### 4.3 Role-Based and Scope-Based Access

Access control must support module, action, campus, class, section, and data-scope restrictions. The system must not rely only on client-side hiding of navigation items.

### 4.4 Auditability

Every create, update, delete, approval, import, export, login-sensitive event, document action, and financial mutation must produce an audit log.

### 4.5 Modular Implementation

Each domain must live in its own feature folder with routes, components, schema, actions, queries, permissions, and tests separated cleanly.

### 4.6 Accessible and Responsive UI

All screens must work on desktop, tablet, and mobile browser sizes. Forms, dialogs, dropdowns, tables, and charts must have proper labels, keyboard navigation, readable contrast, and scalable text.

### 4.7 Production-Ready Error Handling

Every route must have clear error handling, loading states, empty states, toast messages, form errors, and server-side validation errors.

## 5. High-Level User Journeys

### 5.1 School Onboarding

1. Super Admin creates an organization.
2. Super Admin creates one or more campuses.
3. Management configures academic years, terms, classes, sections, subjects, fee heads, roles, permissions, branding, and settings.
4. Office Staff imports or creates students, parents, and employees.
5. Teachers, accountants, librarians, transport staff, hostel wardens, parents, and students access their own role-specific portals.

### 5.2 Admission to Enrollment

1. Office Staff creates or receives an enquiry.
2. Counsellor follows up and records notes.
3. Applicant submits registration details and documents.
4. Staff verifies documents and eligibility.
5. Admission test/interview is scheduled where required.
6. Selection/waitlist decision is recorded.
7. Application fee and admission fee are collected.
8. Admission is approved.
9. Student master, parent links, enrollment history, class allocation, roll number, and documents are created.

### 5.3 Daily Attendance

1. Teacher opens assigned class attendance.
2. Teacher marks present, absent, late, leave, half-day, or medical status.
3. The system validates date, class, section, academic year, and teacher assignment.
4. Attendance corrections require approval.
5. Parent alerts are queued for absences.
6. Attendance dashboards and reports update.

### 5.4 Fee Collection

1. Accountant configures fee structures and due dates.
2. System generates invoices/demands.
3. Parent or cashier records payment.
4. Receipt is generated.
5. Ledger entry and audit log are created.
6. Outstanding balance, defaulter lists, and collection analytics update.

### 5.5 Examination and Result Publication

1. Exam scheme and calendar are configured.
2. Teachers enter marks.
3. Validations apply grade rules, absent/exempt statuses, grace marks, and moderation workflows.
4. Principal approves result.
5. Report cards become visible to parents/students.
6. Analytics update by student, class, subject, teacher, and term.

### 5.6 Communication

1. Authorized user creates notice, circular, announcement, event, or campaign.
2. Audience is selected by role, campus, class, section, route, hostel, fee status, or custom filter.
3. Message is scheduled or published.
4. Delivery logs and read acknowledgements are recorded.
5. Parent/student/teacher dashboards show relevant communication.

## 6. Module Requirements

## 6.1 Platform Foundation

### 6.1.1 Organization, Campus and Session Setup

The system must support:

- Multi-tenant school groups.
- Multi-campus and branch management.
- Academic years.
- Terms/semesters.
- Working days.
- Holidays.
- School calendar.
- Classes.
- Sections.
- Houses.
- Departments.
- Streams.
- Batches.
- Courses.
- Subjects.
- Subject groups.
- Elective rules.
- Grading scales.
- Academic policies.
- School profile.
- Branding.
- Logo.
- Templates.
- Locale.
- Timezone.
- Currency.
- Configurable terminology.
- Custom fields.
- Custom forms.
- Custom statuses.
- Custom workflows.

Acceptance criteria:

- Super Admin can create, edit, deactivate, and view organizations.
- Management can manage campuses under its organization.
- Academic year can be marked active.
- Only one active academic year is allowed per organization unless explicitly configured.
- Class and section creation must be tenant-scoped.
- UI must prevent deleting configuration records that are already used by students, invoices, exams, or attendance.

### 6.1.2 Users, Roles and Access

The system must support:

- Accounts for all listed school roles.
- RBAC by module and action.
- Scope control by campus, class, section, and data ownership.
- Permission groups.
- Delegated access.
- Temporary access.
- Approval rights.
- Secure login.
- Email verification.
- Password reset.
- Optional two-factor readiness.
- SSO-ready adapter interface.
- User activation/deactivation.
- Session controls.
- Device/session history.
- Login audit.

Acceptance criteria:

- Firebase UID must map to one local user profile.
- Local user profile must contain role, organization, campus scope, and status.
- Users without verified email can be blocked based on organization settings.
- Inactive users cannot access protected routes.
- Server-side authorization must run before protected data reads/writes.
- Navigation must show only allowed modules but server checks remain authoritative.

### 6.1.3 Data, Security and Administration

The system must support:

- Unique IDs for student, employee, admission, invoice, book, vehicle, and asset.
- Document storage categories.
- Document expiry reminders.
- Access policies.
- Version history.
- Audit logs.
- Backups and export readiness.
- Retention policy metadata.
- Consent management.
- Privacy controls.
- Data masking for sensitive fields.
- CSV/Excel import/export.
- Duplicate detection.
- Bulk updates.
- API keys.
- Webhooks.
- Integration controls.
- Environment settings.

Acceptance criteria:

- Every sensitive view/export must be audited.
- Documents must store Cloudinary public ID, secure URL, type, size, uploaded by, linked entity, version, and expiry date.
- Import jobs must store status, row count, errors, created records, and uploaded file metadata.
- Bulk updates must validate tenant scope and log a summary audit event.

## 6.2 Admissions and Student Lifecycle

### 6.2.1 Enquiry and Lead Management

The system must support online/offline enquiries, walk-ins, source tracking, campaign attribution, lead pipeline, counsellor assignment, follow-up tasks, call notes, reminders, prospect communication, conversion metrics, lost reasons, and counsellor performance reports.

Acceptance criteria:

- Staff can create enquiries and assign counsellors.
- Enquiries can move through configurable statuses.
- Follow-ups have due dates and completion status.
- Lost reason is mandatory when marking a lead lost.
- Conversion from enquiry to application preserves source and campaign fields.

### 6.2.2 Registration and Admission

The system must support configurable registration forms, eligibility rules, age calculation, application number generation, applicant/parent profiles, sibling linking, document uploads, verification checklists, declarations, consent capture, admission tests, interview scheduling, scoring, selection/waitlists, seat matrix, capacity, quota rules, approvals, application fee, receipts, refunds, reconciliation, offer/admission letters, acceptance workflow, and admission status tracking.

Acceptance criteria:

- Application numbers must be unique per organization and academic year.
- Document verification status must be visible.
- Seat capacity must not be exceeded without permission.
- Admission approval creates or links student and parent profiles.
- Rejected or withdrawn applications must not create active enrollment.

### 6.2.3 Student Information System

The system must support demographic details, contact/address/medical details, transport/hostel/family details, parent/guardian profiles, custody preferences, sibling and alumni relationships, student photos, identity documents, certificates, prior-school records, attachments, enrollment history, class/section allocation, roll number, house assignment, statuses, promotion, detention, subject changes, section transfer, academic rollover, timeline, notes, achievements, discipline incidents, interventions, ID card, QR code, and profile print formats.

Acceptance criteria:

- Student profile is the central master record.
- Student status changes must be audited.
- Enrollment history must be preserved across academic years.
- Class/section transfer must create a history record.
- Parent-child linking must support multiple children.

### 6.2.4 Certificates and Records

The system must support bonafide, character, conduct, transfer, migration, leaving, and study certificates; templates; serial numbers; digital signature-ready fields; QR verification; archive; issue register; and duplicate certificate workflow.

Acceptance criteria:

- Certificate number must be unique.
- Issued certificates must be immutable except through duplicate/reissue workflow.
- Certificate templates must be tenant-scoped.
- QR verification route must show public verification details without exposing private data.

## 6.3 Academic Management

### 6.3.1 Curriculum and Lesson Planning

Support curriculum framework, courses, units, chapters, learning outcomes, competencies, syllabus mapping, annual plan, pace tracking, lesson plans, teaching resources, worksheets, shared repository, teacher plan approval, completion tracking, and coverage reports.

Acceptance criteria:

- Teacher can create lesson plans for assigned subjects.
- Principal/academic head can approve plans.
- Completion status must feed curriculum coverage dashboard.

### 6.3.2 Class, Subject and Teacher Allocation

Support class/section setup, subject setup, class teacher, co-teacher, faculty workload, periods, substitution rules, workload reports, student elective allocation, subject changes, and subject combination validation.

Acceptance criteria:

- Teacher assignment must be date-bound and academic-year scoped.
- Workload summary must show periods per week by teacher.
- Subject combination rules prevent invalid elective selection.

### 6.3.3 Timetable and Substitution

Support master timetable for classes, teachers, rooms, labs, activities, constraint validation, clashes, breaks, periods, exam/event/special variants, teacher absence handling, substitute allocation, notifications, daily timetable, printable timetable, mobile view, and change alerts.

Acceptance criteria:

- Timetable cannot create teacher, room, or section clashes unless override permission exists.
- Substitution assignment must notify the substitute teacher.
- Parent/student portal must show current daily timetable.

### 6.3.4 Homework, Assignments and Projects

Support homework, assignments, projects, rubrics, due dates, attachments, class/section/individual assignment, scheduled publishing, parent visibility, online submission, late status, teacher feedback, grades, plagiarism adapter, calendar, pending-work dashboard, and completion analytics.

Acceptance criteria:

- Teachers can assign homework to class/section/student.
- Students can submit files if enabled.
- Late submissions are flagged.
- Teacher feedback updates parent/student views.

### 6.3.5 Optional Learning Management

Support course pages, digital content, videos, links, resource folders, live class links, recordings, attendance, participation tracking, discussion boards, quizzes, question bank, progress, and at-risk learner indicators through scaffolded modules and extension-ready adapters.

Acceptance criteria:

- LMS pages exist and use the same course/student/teacher foundation.
- External content links are validated and stored safely.
- Quiz engine uses assessment/question bank schema where possible.

## 6.4 Attendance and Discipline

### 6.4.1 Student Attendance

Support daily, period-wise, subject-wise, hostel, and activity attendance; statuses; manual marking; bulk marking; teacher app view; biometric/RFID/QR adapter readiness; correction requests; approvals; remarks; audit trail; parent alerts; low-attendance warnings; reports.

Acceptance criteria:

- Attendance cannot be marked for a closed academic year.
- Teachers can mark only assigned classes unless granted override.
- Corrections require approval after configurable cutoff.
- Low-attendance warnings appear in dashboards.

### 6.4.2 Staff Attendance

Support shifts, roster, biometric/RFID/manual attendance, geo-tagged mobile check-in readiness, late arrival, early departure, overtime, missed-punch, regularization, and payroll linkage.

Acceptance criteria:

- Staff attendance summary must be available by period.
- Regularization must require approval.
- Payroll module can query approved attendance summaries.

### 6.4.3 Leave Management

Support student leave applications, medical proof, approval workflow, attendance linkage, employee leave types, balances, accrual, holidays, encashment, approval hierarchy, substitute request, and work allocation.

Acceptance criteria:

- Approved student leave updates attendance view.
- Employee leave balances update after approval.
- Leave requests must show timeline and status.

### 6.4.4 Discipline and Wellbeing

Support incident logging, severity, actions, follow-up, parent acknowledgement, merits, demerits, house points, rewards, badges, counselling records, confidential access controls, referrals, anti-bullying, safeguarding, grievance, and case management.

Acceptance criteria:

- Confidential records are visible only to authorized roles.
- Parent acknowledgement can be requested for incidents.
- Discipline records appear in student timeline with permission rules.

## 6.5 Examination and Assessment

### 6.5.1 Exam Planning

Support exam types, terms, schemes, weightages, grading rules, calendar, date sheet, room allocation, invigilator duty, seating plan, admit cards, candidate lists, exam notices, practical/oral/project assessment setup, and examiner assignment.

Acceptance criteria:

- Exam scheme must define subjects and marks/weightages before marks entry.
- Date sheet detects teacher/room conflicts.
- Admit card generation uses student and exam eligibility data.

### 6.5.2 Marks, Grades and Results

Support online/offline marks entry, bulk import, validation, moderation, grade conversion, GPA/CGPA, percentile, rank, best-of rules, absent/exempt/withheld/retest, grace marks, result approval, report cards, transcripts, publication, parent access, and analytics.

Acceptance criteria:

- Marks cannot exceed configured maximum.
- Result publication requires approval.
- Parent/student cannot view unpublished results.
- Report card export must be available.

### 6.5.3 Online Assessments

Support question bank, topics, difficulty, learning outcomes, tags, question types, randomized tests, time limits, proctoring adapter, auto-grading, manual evaluation, attempt history, answer analysis, item analysis, and remediation recommendations.

Acceptance criteria:

- Question bank supports MCQ, short answer, long answer, true/false, and file response.
- Objective questions can auto-grade.
- Attempts preserve submitted answers and scoring history.

## 6.6 Fees, Finance and Accounts

### 6.6.1 Fee Configuration

Support fee heads, structures, instalments, due dates, billing cycles, class/category mapping, admission/tuition/transport/hostel/library/exam/activity/miscellaneous fees, concessions, scholarships, waivers, sibling discounts, staff discounts, approvals, late fee rules, fines, grace periods, revisions, and arrears.

Acceptance criteria:

- Fee structure can be versioned by academic year.
- Concessions require approval when configured.
- Late fee calculation must be deterministic and auditable.

### 6.6.2 Billing and Collection

Support auto invoice generation, individual bills, sibling billing, cash/cheque/card/UPI/bank transfer/payment gateway/POS collection readiness, online payment links, parent payments, receipts, invoices, partial payments, advance payments, allocations, adjustments, refunds, cancellations, daily collection, cashier closing, deposit, settlement reconciliation, defaulters, reminders, forecasts, aging, and reports.

Acceptance criteria:

- Every payment creates receipt and ledger entries.
- Partial payments reduce outstanding balance.
- Refunds require reference to original payment.
- Cashier closing summary must reconcile collections.

### 6.6.3 Accounting

Support chart of accounts, cost centres, budgets, vouchers, journals, ledgers, income, expenses, vendor bills, purchase payments, receivables, payables, bank accounts, reconciliation, cash book, trial balance, P&L, balance sheet, tax configuration, statutory reports, financial-year closing, payroll posting, fee posting, and inventory depreciation integration.

Acceptance criteria:

- Financial events must be traceable to source documents.
- Ledger entries must be immutable except reversal entries.
- Trial balance page must show debit/credit totals.

### 6.6.4 Donations

Support donor records, campaigns, pledges, receipts, restricted funds, and utilization reports as optional but scaffolded module.

## 6.7 HR, Payroll and Staff Management

### 6.7.1 Employee Information

Support recruitment, applicant tracking, onboarding, employee master, personnel files, qualifications, experience, certifications, documents, background checks, expiry alerts, department, designation, grade, reporting manager, employment status, contract details, staff ID cards, directory, and emergency contacts.

Acceptance criteria:

- Employee ID must be unique.
- Expiring documents must trigger dashboard alerts.
- Employee profile must link to Firebase user when portal access is enabled.

### 6.7.2 Payroll and Benefits

Support salary structures, components, deductions, allowances, loans, advances, reimbursements, payroll periods, attendance/leave integration, overtime, arrears, payslip generation, approval, bank payment file, tax calculations, statutory deductions, salary revisions, bonus/incentives, settlement, and employee self-service.

Acceptance criteria:

- Payroll run must snapshot inputs.
- Approved payroll run generates payslips.
- Payslip visibility must be role-controlled.

### 6.7.3 Performance and Development

Support appraisals, goals/KPIs, competency reviews, 360 feedback, increments, training calendar, nominations, certification tracking, feedback, staff workload, substitution, duty rosters, and performance reports.

## 6.8 Parent, Student and Teacher Portals

### 6.8.1 Parent Portal

Support child switching, profile, timetable, attendance, homework, results, fees, receipts, transport, leave applications, meeting booking, consent forms, documents, support requests, notification preferences, and secure communication.

### 6.8.2 Student Portal

Support profile, timetable, assignments, resources, attendance, exam schedule, results, certificates, online learning, submissions, quiz attempts, fee visibility, and service requests.

### 6.8.3 Teacher Portal

Support my classes, attendance, timetable, lesson plans, homework, marks entry, communication, leave, payslips, substitution duties, professional resources, and approvals.

Acceptance criteria:

- Portal users must only see records linked to their identity.
- Parent with multiple children must switch context safely.
- Teacher dashboard must prioritize today’s timetable, attendance, homework, and pending marks.

## 6.9 Communication and Engagement

### 6.9.1 Messaging and Notifications

Support SMS, email, WhatsApp, push, in-app, voice-call adapter readiness, audience segmentation, templates, personalization variables, scheduling, delivery logs, opt-in/out, two-way replies, read receipts, and attachments where provider allows.

Acceptance criteria:

- In-app notifications must work in first build.
- External providers are adapter-based and replaceable behind explicit configuration boundaries.
- Audience resolution must be tenant-scoped and auditable.

### 6.9.2 Notices, Events and Calendar

Support notice board, circulars, announcements, acknowledgements, expiry dates, school calendar, holidays, events, PTMs, competitions, trips, RSVP, registration, tickets/passes, volunteer lists, permission slips, gallery publishing.

### 6.9.3 PTM and Appointments

Support teacher slot setup, parent booking, cancellation, queue handling, reminders, meeting notes, action items, and visibility controls.

## 6.10 Library Management

Support catalogue, ISBN, accession number, authors, publishers, categories, shelves, copies, barcode/RFID readiness, issue, return, renewal, reservation, lost/damaged workflow, borrower limits, due dates, fine rules, holiday-aware fine calculation, fee posting, OPAC/search, reading history, acquisition requests, vendors, stock verification, weeding, library attendance, circulation reports, e-books, access links, and license tracking.

Acceptance criteria:

- Each physical copy has unique accession number.
- Issue transaction validates borrower limit.
- Return transaction calculates fine.
- Lost/damaged status updates inventory availability.

## 6.11 Transport and Fleet

Support routes, stops, pickup/drop points, stages, fees, service areas, vehicles, permits, insurance, fitness, fuel, maintenance, expiry reminders, driver/conductor profiles, licenses, background checks, duty rosters, student/staff route allocation, stop changes, seat capacity, manifests, GPS adapter, ETA readiness, geofencing readiness, boarding alerts, QR boarding, trip logs, incidents, complaints, and reports.

Acceptance criteria:

- Route allocation must validate seat capacity.
- Vehicle documents with expiry dates must create alerts.
- Manifest must be printable/exportable.

## 6.12 Hostel, Canteen and Residence

### Hostel

Support buildings, floors, rooms, beds, capacity, warden assignment, room allotment, check-in/out, visitors, attendance, leave/outpass, discipline, maintenance, hostel fees, mess charges, refunds, room changes, occupancy reports.

### Canteen/Mess

Support menu planning, meal plans, dietary/allergy notes, tokens, POS readiness, student wallet/prepaid balance readiness, spending limits, parent top-up readiness, transaction history, inventory consumption, vendor orders, wastage, nutrition/allergen reporting.

Acceptance criteria:

- Room allotment cannot exceed bed capacity.
- Hostel attendance and outpass workflows must be separate from normal class attendance but linked to student master.
- Canteen transactions must be auditable.

## 6.13 Inventory, Assets and Procurement

### Inventory

Support item catalogues, categories, units, stock locations, opening stock, reorder levels, receipts, issues, transfers, returns, adjustments, consumption, stock count, department/class/lab issue tracking, batch/serial/expiry tracking, low-stock alerts, suppliers, purchase orders, goods receipt, invoices, valuation reports.

### Assets and Maintenance

Support asset register, tags/QR/barcodes, category, ownership, custodian, location, issue/return, warranty, AMC, depreciation, disposal, audit verification, maintenance tickets, preventive schedules, vendor SLA, repair costs.

### Procurement

Support requisitions, approvals, quotation comparison, PO creation, vendor management, budget checks, goods receipt, invoice matching, purchase analytics.

Acceptance criteria:

- Stock movement must use transaction records, not direct silent quantity edits.
- Asset disposal must require approval.
- Procurement workflow status must be visible.

## 6.14 Health, Safety and Facilities

### Health Centre

Support medical profile, allergies, immunization, conditions, medicine consent, emergency contacts, clinic visits, vitals, treatment, medication administration, incident records, parent alerts, screenings, vaccination drives, and confidential reporting.

### Safety and Security

Support visitor pre-registration, gate pass, QR/ID verification, logs, restricted access, student/staff entry-exit records, emergency contacts, incident reporting, evacuation roll call, CCTV/access-control adapter readiness, lost-and-found, security duty log.

### Facilities and Maintenance

Support room booking, maintenance requests, work orders, inspections, vendor assignment, utility tracking, cleanliness checklists, complaint tracking, and SLA reports.

Acceptance criteria:

- Health records require stricter permissions.
- Visitor logs must be exportable.
- Facilities tickets must have status, owner, SLA, and timeline.

## 6.15 Activities, Sports and Houses

Support house setup, house points, club membership, activity enrolment, sports teams, trials, fixtures, scores, coach assignment, equipment, certificates, competition registration, participant lists, consent, fees, achievements, portfolios, awards, badges, leadership roles, and co-curricular transcript.

Acceptance criteria:

- House points must link to student and house.
- Event registration must validate eligibility and consent.
- Achievements must appear in student profile timeline.

## 6.16 Alumni and Community

Support alumni profiles, graduation batch, contact updates, privacy preferences, directory, mentoring, reunions, job board, fundraising campaigns, donations, engagement analytics, community/partner directory, volunteer management, and alumni certificates.

Acceptance criteria:

- Alumni directory must respect privacy preferences.
- Alumni records must link back to graduated student records where possible.

## 6.17 Website, Forms and CMS

Support public website pages, admissions landing pages, news, notices, galleries, staff directory, contact forms, form builder, surveys, consent, complaints, registrations, feedback, SEO metadata, publishing approvals, media library, scheduling, multilingual pages, prospectus/downloads, chatbot/live-chat adapter readiness, and enquiry-to-admission linking.

Acceptance criteria:

- CMS content has draft/published/archived status.
- Public forms can create enquiries or tickets.
- Media library uses Cloudinary metadata.

## 6.18 Reports, Analytics and MIS

### Dashboards

Support role-specific dashboards for management, principal, office, teacher, accountant, parent, and student. KPIs must include admissions funnel, enrollment, attendance, fee collection, academic outcomes, staff, and transport. Drill-down filters must include academic year, campus, class, section, category, route, and date range.

### Reports

Support student registers, enrollment, admissions, withdrawals, promotions, demographics, attendance, leave, discipline, homework, exam, fee, accounting, payroll, inventory, transport, library, hostel, health, asset, communication delivery, scheduled reports, PDF/Excel/CSV export, printable templates, and report access permissions.

### Analytics and Alerts

Support trend analysis, comparisons, cohort tracking, custom report builder, rule-based alerts, low attendance, overdue fees, missed marks, expiring documents, capacity limits, data quality dashboard, missing fields, duplicates, invalid documents, and incomplete workflows.

Acceptance criteria:

- Analytics pages must use Tremor components.
- Reports must respect RBAC.
- Export actions must be audited.
- Alerts must be stored, dismissible, and link to source records.

## 6.19 Integrations and Automation

Support payment gateway adapter, UPI, bank/POS readiness, accounting software adapter, SMS/email/WhatsApp/push/voice provider adapters, biometric/RFID/smart card/barcode/GPS/CCTV/access-control adapter interfaces, Google/Microsoft SSO readiness, calendars, Meet/Teams/Zoom links, cloud storage adapter, LMS/content tools, API keys, webhooks, scheduled jobs, import/export connectors, integration error logs, approval routing, reminders, escalations, auto-allocation, and document generation.

Acceptance criteria:

- Every integration must have config, status, retry behavior, logs, and manual exception handling.
- Provider-specific credentials must never be exposed client-side.
- Failed automation jobs must be visible to admins.

## 6.20 Compliance, Accessibility and Quality

Support configurable statutory reports, regional fee/certificate requirements, consent, privacy requests, retention, audit trails, secure documents, keyboard navigation, contrast, screen-reader labels, scalable text, responsive web, offline-friendly attendance architecture readiness, localization, monitoring, error logging, uptime status, support tickets, knowledge base, and release notes.

Acceptance criteria:

- All forms must have labels and validation messages.
- Sensitive fields must support masking.
- Tenant admin can configure locale, timezone, currency, and terminology.
- Error logs must not expose secrets.

## 7. Data Requirements

The system must include core data entities for:

- Organization, campus, academic year, class, section, subject, course, room, timetable.
- User, role, permission, staff, student, parent/guardian, enrollment, document.
- Enquiry, application, admission, certificate, attendance, leave, discipline incident.
- Assessment, exam, mark, grade, report card, assignment, learning resource.
- Fee structure, invoice, payment, refund, concession, ledger, expense, payroll run.
- Route, stop, vehicle, trip, library item, issue transaction, hostel room, bed allotment.
- Inventory item, purchase order, supplier, asset, maintenance ticket, notice, event, message.

## 8. Navigation Requirements

### 8.1 Main Super Admin Navigation

- Global Dashboard
- Organizations
- Campuses
- Users and Roles
- Subscriptions/Status
- Integrations
- System Audit Logs
- Platform Settings

### 8.2 Institution Admin Navigation

- Dashboard
- Organization Setup
- Admissions
- Students
- Parents
- Academics
- Attendance
- Exams
- Fees
- Accounts
- HR and Payroll
- Staff
- Teacher Portal
- Parent Portal
- Student Portal
- Communication
- Library
- Transport
- Hostel
- Canteen
- Inventory
- Assets
- Procurement
- Health
- Safety
- Facilities
- Activities
- Alumni
- CMS and Forms
- Reports
- Analytics
- Alerts
- Settings
- Audit Logs

### 8.3 Teacher Navigation

- My Dashboard
- My Classes
- Attendance
- Timetable
- Lesson Plans
- Homework
- Assignments
- Marks Entry
- Communication
- Leave
- Payslips
- Substitution Duties
- Resources

### 8.4 Parent Navigation

- Dashboard
- Children
- Attendance
- Homework
- Results
- Fees and Receipts
- Timetable
- Transport
- Leave
- PTM
- Notices
- Documents
- Support

### 8.5 Student Navigation

- Dashboard
- Profile
- Timetable
- Assignments
- Resources
- Attendance
- Exams
- Results
- Certificates
- Activities
- Support

## 9. Non-Functional Requirements

### 9.1 Performance

- Dashboard routes should load core shell quickly.
- Tables should use pagination, search, and filters.
- Heavy reports should use server-side pagination.
- Charts should query aggregated data, not pull all raw rows to the client.
- Database queries must include organization scoping and indexes.

### 9.2 Security

- All private routes must require Firebase Auth.
- Server must verify Firebase ID token before reading/writing protected data.
- Local user profile and permissions must be checked server-side.
- Never trust role or organization values from the client.
- Cloudinary upload signatures must be generated server-side.
- Sensitive env vars must never be bundled into client code.
- Audit logs must track sensitive operations.
- All mutation inputs must be validated with Zod.
- SQL queries must use Drizzle or parameterized queries.

### 9.3 Reliability

- Server actions and API routes must return typed success/error responses.
- UI must handle loading, empty, error, and retry states.
- Import jobs must preserve row-level error details.
- Integration adapters must log failed attempts.

### 9.4 Maintainability

- No giant files.
- No module should mix unrelated domains.
- Shared components must be reusable and typed.
- Database schema should be split by domain.
- Form schemas should live near feature modules.
- Common utilities must be central and tested.
- Use explicit names instead of vague names like `data`, `stuff`, or `helper`.

### 9.5 Accessibility

- All inputs need labels.
- Icon-only buttons need screen-reader labels.
- Data tables need readable headers.
- Dialogs and dropdowns must be keyboard accessible.
- Do not use color alone to communicate status.
- Support dark and light mode.

## 10. Analytics Requirements

Analytics must be implemented using Tremor where suitable. Required dashboards:

### 10.1 Management Dashboard

- Total students.
- Active admissions.
- Attendance percentage.
- Fee collection rate.
- Pending dues.
- Staff count.
- Transport utilization.
- Hostel occupancy.
- Open incidents.
- Expiring documents.

### 10.2 Admissions Dashboard

- Enquiries by source.
- Lead conversion funnel.
- Applications by status.
- Seat utilization.
- Counsellor performance.
- Lost reasons.

### 10.3 Attendance Dashboard

- Today’s attendance.
- Class-wise attendance.
- Low-attendance students.
- Trend by month.
- Absence alerts.

### 10.4 Finance Dashboard

- Total invoiced.
- Total collected.
- Outstanding dues.
- Collection by mode.
- Defaulter aging.
- Refunds.
- Cashier closing.

### 10.5 Academic Dashboard

- Curriculum coverage.
- Homework completion.
- Marks distribution.
- Subject performance.
- At-risk students.

### 10.6 Operations Dashboard

- Library circulation.
- Transport capacity.
- Vehicle document expiry.
- Hostel occupancy.
- Inventory low stock.
- Maintenance tickets.

## 11. Acceptance Criteria for Generated Codebase

The generated codebase is acceptable only if:

- It builds successfully.
- TypeScript strict mode passes.
- ESLint passes.
- The routing structure includes all major modules.
- Firebase Auth is integrated.
- Turso/Drizzle schema and migrations exist.
- Cloudinary signed upload flow exists.
- RBAC middleware/server guard exists.
- Tenant scoping exists in all server queries.
- Core CRUD patterns exist for key modules.
- Audit logging is called from all mutation helpers.
- Tremor analytics components are used for dashboards.
- shadcn/ui components power forms, tables, dialogs, navigation, and layouts.
- Forms use Zod and React Hook Form.
- Tables use pagination/filtering.
- The codebase avoids monolithic files.
- Tests exist for auth guards, permission checks, validation schemas, and at least one CRUD flow per major domain group.
- README includes setup commands, env vars, database migration commands, and development instructions.

## 12. Definition of Done

The project is done when it contains a complete, navigable, authenticated, role-aware School ERP foundation with all modules scaffolded and core workflows implemented through clean, maintainable, typed code.

The application must be good enough for a coding agent or human developer to continue production hardening without rewriting the architecture.
