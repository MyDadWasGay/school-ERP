# Complete School ERP: Modules & Feature Catalogue

> A product and implementation checklist for a full school ERP. Select modules based on the institution type (school, college, coaching centre, or group of schools), local rules, and operational workflow.

## 1. Platform Foundation

### Organization, Campus & Session Setup
- Multi-tenant setup (multiple school groups), multi-campus and branch management
- Academic years, terms/semesters, working days, holidays and school calendar
- Classes, sections, houses, departments, streams, batches and course setup
- Subjects, subject groups, elective rules, grading scales and academic policies
- School profile, branding, logo, templates, locale, timezone and currency
- Configurable terminology, custom fields, custom forms, statuses and workflows

### Users, Roles & Access
- Accounts for super admin, management, principal, office staff, teacher, accountant, librarian, transport staff, hostel warden, parent, student and alumni
- Role-based access control (RBAC) by module, action, campus, class, section and data scope
- Permission groups, delegated access, temporary access and approval rights
- Secure login, password policy, OTP/email verification, two-factor authentication and SSO
- User activation/deactivation, session controls, device/session history and login audit

### Data, Security & Administration
- Unique IDs for student, employee, admission, invoice, book, vehicle and asset
- Document storage with categories, expiry reminders, access policies and version history
- Activity/audit logs for create, edit, delete, approval, payment and login events
- Backups, restore testing, archival, data retention and data export
- Encryption in transit/at rest, consent management, privacy controls and data masking
- Import/export through CSV/Excel, duplicate detection, bulk updates and data validation
- API keys, webhooks, third-party integration controls and environment settings

## 2. Admissions & Student Lifecycle

### Enquiry & Lead Management
- Online/offline enquiry forms, walk-in enquiries, source tracking and campaign attribution
- Lead pipeline, counsellor assignment, follow-up tasks, call notes and reminders
- Prospect communication by email, SMS, WhatsApp and in-app notification
- Enquiry conversion metrics, lost-reason tracking and counsellor performance reports

### Registration & Admission
- Configurable registration forms, eligibility rules and age calculation
- Application number generation, applicant/parent profiles and sibling linking
- Document uploads, verification checklist, declarations and consent capture
- Admission tests, interview scheduling, assessor scoring and selection/wait lists
- Seat matrix, class/section capacity, quota/category rules and admission approvals
- Application fee collection, online payment, receipts, refunds and reconciliation
- Offer/admission letters, acceptance workflow and admission status tracking

### Student Information System
- Complete demographic, contact, address, medical, transport, hostel and family details
- Parent/guardian profiles, custody/contact preferences, sibling and alumni relationships
- Student photos, identity documents, certificates, prior-school records and attachments
- Enrollment history, class/section allocation, roll number and house assignment
- Student status: active, inactive, transferred, withdrawn, expelled, graduated or alumni
- Promotion, detention, stream/subject changes, section transfer and academic rollover
- Student timeline, notes, achievements, discipline incidents and intervention plans
- ID card, smart card, barcode/QR code and student profile print formats

### Certificates & Records
- Bonafide, character, conduct, transfer, migration, leaving and study certificates
- Configurable certificate templates, serial numbers, digital signature and QR verification
- Student record archive, document issue register and duplicate certificate workflow

## 3. Academic Management

### Curriculum & Lesson Planning
- Curriculum framework, courses, units, chapters, learning outcomes and competencies
- Class-wise and subject-wise syllabus mapping, annual plan and pace tracking
- Lesson plans, teaching resources, worksheets and shared content repository
- Teacher plan approval, completion tracking and curriculum coverage reports

### Class, Subject & Teacher Allocation
- Class/section and subject setup, class teachers and co-teacher assignments
- Faculty workload, teaching periods, substitution rules and workload reports
- Student elective allocation, subject changes and subject combination validation

### Timetable & Substitution
- Master timetable for classes, teachers, rooms, labs and activities
- Constraint-based scheduling for availability, workload, clashes, breaks and periods
- Exam, event and special timetable variants
- Teacher absence handling, substitute allocation and substitution notifications
- Daily timetable, printable timetable, mobile view and timetable change alerts

### Homework, Assignments & Projects
- Create homework, assignments, projects, rubrics, due dates and attachments
- Class/section/individual assignment, scheduled publishing and parent visibility
- Online submission, late submission status, teacher feedback, grades and plagiarism integration
- Assignment calendar, pending-work dashboard and completion analytics

### Learning Management (Optional LMS)
- Course pages, digital content, videos, links, SCORM/xAPI support and resource folders
- Live class links, recordings, attendance and teacher/student participation tracking
- Discussion boards, quizzes, question bank, self-paced learning and certificates
- Learning progress, competency mastery and at-risk learner indicators

## 4. Attendance & Discipline

### Student Attendance
- Daily, period-wise, subject-wise, hostel and activity attendance
- Present, absent, late, leave, half-day, medical and custom attendance statuses
- Manual marking, bulk marking, teacher app, biometric, RFID, QR/barcode and face-device integration
- Attendance correction requests, approvals, remarks and audit trail
- Automated parent alerts, absence notifications and low-attendance warnings
- Class, student, date-range, subject and statutory attendance reports

### Staff Attendance
- Shift/roster setup, biometric/RFID/manual attendance and geo-tagged mobile check-in
- Late arrival, early departure, overtime, missed-punch and regularization workflow
- Attendance summary feeding payroll and leave balances

### Leave Management
- Student leave application, medical proof, approval workflow and attendance linkage
- Employee leave types, balances, accrual, holidays, encashment and leave approval hierarchy
- Substitute request/work allocation during teacher leave

### Discipline & Wellbeing
- Behaviour/discipline incident logging, severity, actions, follow-up and parent acknowledgement
- Merits, demerits, house points, rewards, badges and student recognition
- Counselling records, wellbeing check-ins, confidential access controls and referrals
- Anti-bullying, safeguarding and grievance/case management workflows

## 5. Examination & Assessment

### Exam Planning
- Exam types, terms, assessment schemes, weightages and grading rules
- Exam calendar, date sheet, room allocation, invigilator duty and seating plan
- Admit cards/hall tickets, candidate lists and exam notices
- Practical/oral/project assessment setup and examiner assignment

### Marks, Grades & Results
- Online/offline marks entry, bulk import, validation and moderation workflow
- Marks-to-grade conversion, GPA/CGPA, percentiles, rank and best-of rules
- Absent/exempt/withheld/retest handling, grace marks and result approval
- Progress cards/report cards, transcripts, result publication and parent access
- Comparative analytics by student, class, section, subject, teacher and term

### Online Assessments
- Question bank with topics, difficulty, outcomes, tags and question types
- Randomized tests, time limits, proctoring integrations, auto-grading and manual evaluation
- Attempt history, answer analysis, item analysis and remediation recommendations

## 6. Fees, Finance & Accounts

### Fee Configuration
- Fee heads, structures, instalments, due dates, billing cycles and class/category mapping
- Admission, tuition, transport, hostel, library, exam, activity and miscellaneous fees
- Concessions, scholarships, waivers, sibling discounts, staff discounts and approvals
- Late fee rules, fines, grace periods, fee revisions and arrear calculations

### Billing & Collection
- Auto invoice/demand generation, individual bills and consolidated sibling billing
- Cash, cheque, card, UPI, bank transfer, payment gateway and POS collection
- Online payment links, parent portal payments, receipts, acknowledgements and downloadable invoices
- Partial payments, advance payments, allocations, adjustments, refunds and cancellations
- Daily collection, cashier closing, bank deposit and settlement reconciliation
- Defaulter lists, reminders, collection forecast, aging and collection reports

### Accounting
- Chart of accounts, cost centres, budgets, vouchers, journal entries and ledgers
- Income, expenses, vendor bills, purchase payments, receivables and payables
- Bank accounts, bank reconciliation, cash book, trial balance, P&L and balance sheet
- Tax configuration, tax invoices, statutory reports and financial-year closing
- Payroll posting, fee posting and inventory/asset depreciation integration

### Fundraising & Donations (Optional)
- Donor records, campaigns, pledges, receipts, restricted funds and utilization reports

## 7. HR, Payroll & Staff Management

### Employee Information
- Recruitment/applicant tracking, onboarding checklist, employee master and personnel files
- Qualifications, experience, certifications, documents, background checks and expiry alerts
- Department/designation/grade, reporting manager, employment status and contract details
- Staff ID cards, directory and emergency contacts

### Payroll & Benefits
- Salary structures, components, deductions, allowances, loans, advances and reimbursements
- Payroll periods, attendance/leave integration, overtime and arrears
- Payslip generation, approval, bank payment file, tax calculations and statutory deductions
- Salary revisions, bonus/incentives, settlement and employee self-service access

### Performance & Development
- Appraisals, goals/KPIs, competency reviews, 360-degree feedback and increments
- Training calendar, workshop nominations, certification tracking and training feedback
- Staff workload, substitution, duty rosters and performance reports

## 8. Parent, Student & Teacher Portals

### Parent Portal/App
- Child profile, timetable, attendance, homework, results, fees, receipts and transport status
- Leave applications, meeting booking, consent forms, document downloads and support requests
- Multiple-child switching, notification preferences and secure communication

### Student Portal/App
- Profile, timetable, assignments, resources, attendance, exam schedule, results and certificates
- Online learning, submissions, quiz attempts, fee visibility and service requests

### Teacher Portal/App
- My classes, attendance, timetable, lesson plans, homework, marks entry and communication
- Leave/attendance, payslips, substitution duties, professional resources and approvals

## 9. Communication & Engagement

### Messaging & Notifications
- SMS, email, WhatsApp, push notifications, in-app alerts and voice-call integration
- Audience segmentation by campus, class, section, role, route, hostel, fee status or custom criteria
- Templates, personalization variables, scheduled campaigns, delivery logs and opt-in/out controls
- Two-way messaging, replies, read receipts and attachment support where provider allows

### Notices, Events & Calendar
- Notice board, circulars, announcements, acknowledgements and expiry dates
- School calendar, holidays, events, PTMs, competitions, trips and RSVP/registration
- Event tickets/passes, volunteer lists, permission slips and photo/gallery publishing

### PTM & Appointments
- Parent-teacher slot setup, booking, cancellation, queue handling and reminders
- Meeting notes, action items and follow-up visibility controls

## 10. Library Management

- Catalogue with ISBN, accession number, authors, publishers, categories, shelves and copies
- Barcode/RFID-enabled issue, return, renewal, reservation and lost/damaged item workflow
- Borrower limits, due dates, fine rules, holiday-aware calculation and fee posting
- OPAC/search, availability, reading history, acquisition requests and vendor purchase lists
- Stock verification, weeding, library attendance and circulation reports
- E-books/digital resources, access links and license tracking

## 11. Transport & Fleet

- Routes, stops, pickup/drop points, stages, route fees and service areas
- Vehicles, permits, insurance, fitness, fuel, maintenance and expiry reminders
- Driver/conductor profiles, licenses, background checks, duty rosters and contact details
- Student/staff route allocation, stop changes, seat capacity and route-wise manifests
- GPS/live bus tracking, estimated arrival time, geofencing and boarding/alighting alerts
- RFID/QR boarding, trip logs, incidents, complaints and transport reports

## 12. Hostel, Canteen & Residence

### Hostel
- Buildings, floors, rooms, beds, capacity, warden assignment and room allotment
- Check-in/out, visitor logs, attendance, leave/outpass, discipline and maintenance requests
- Hostel fees, mess charges, refunds, room changes and occupancy reports

### Canteen/Mess
- Menu planning, meal plans, dietary/allergy notes, tokens and POS sales
- Student wallet/prepaid balance, spending limits, parent top-up and transaction history
- Inventory consumption, vendor orders, wastage and nutrition/allergen reporting

## 13. Inventory, Assets & Procurement

### Inventory
- Item catalogues, categories, units, stock locations, opening stock and reorder levels
- Stock receipt, issue, transfer, return, adjustment, consumption and stock count
- Department/class/lab issue tracking, batch/serial/expiry tracking and low-stock alerts
- Suppliers, purchase orders, goods receipt, invoices and stock valuation reports

### Assets & Maintenance
- Asset register, tags/QR/barcodes, category, ownership, custodian and location
- Asset issue/return, warranty, AMC, depreciation, disposal and audit verification
- Maintenance tickets, preventive maintenance schedules, vendor SLA and repair costs

### Procurement
- Purchase requisitions, approval workflows, quotation comparison, PO creation and vendor management
- Budget checks, goods receipt, invoice matching and purchase analytics

## 14. Health, Safety & Facilities

### Health Centre
- Medical profile, allergies, immunization, conditions, medicine consent and emergency contacts
- Clinic visits, vitals, treatment, medication administration, incident records and parent alerts
- Health screening, vaccination drives and confidential health reporting

### Safety & Security
- Visitor pre-registration, gate pass, QR/ID verification, visitor logs and restricted access lists
- Student/staff entry-exit records, emergency contacts, incident reporting and evacuation roll call
- CCTV/access-control integration, lost-and-found and security duty log

### Facilities & Maintenance
- Classroom/lab/room booking, maintenance requests, work orders, inspections and vendor assignment
- Utility tracking, cleanliness checklists, complaint tracking and SLA reports

## 15. Activities, Sports & Houses

- House setup, house points, club membership and activity enrolment
- Sports teams, trials, fixtures, scores, coach assignment, equipment and certificates
- Competition/event registration, participant lists, consent, fees and achievement records
- Student portfolios, awards, badges, leadership roles and co-curricular transcript

## 16. Alumni & Community

- Alumni profiles, graduation batch, contact updates, privacy preferences and directory
- Mentoring, reunions, job board, fundraising campaigns, donations and engagement analytics
- Community/partner directory, volunteer management and alumni certificates

## 17. Website, Forms & CMS

- Public website pages, admissions landing pages, news, notices, galleries, staff directory and contact forms
- Form builder for admissions, surveys, consent, complaints, registrations and feedback
- SEO metadata, page publishing approvals, media library, content scheduling and multilingual pages
- Online prospectus/downloads, chatbot/live-chat integrations and enquiry-to-admission linking

## 18. Reports, Analytics & MIS

### Dashboards
- Role-specific dashboards for management, principal, office, teacher, accountant, parent and student
- KPIs: admissions funnel, enrollment, attendance, fee collection, academic outcomes, staff and transport
- Drill-down filters by academic year, campus, class, section, category, route and date range

### Reports
- Student registers, enrollment, admissions, withdrawals, promotions and demographic reports
- Attendance, leave, discipline, homework, exam, fee, accounting, payroll and inventory reports
- Transport, library, hostel, health, asset and communication delivery reports
- Scheduled reports, export to PDF/Excel/CSV, printable templates and report access permissions

### Analytics & Alerts
- Trend analysis, comparisons, cohort tracking and custom report builder
- Rule-based alerts for low attendance, overdue fees, missed marks, expiring documents and capacity limits
- Data quality dashboard for missing fields, duplicates, invalid documents and incomplete workflows

## 19. Integrations & Automation

- Payment gateways, UPI, banks, POS, accounting software and automated reconciliation
- SMS, email, WhatsApp, push notification and voice providers
- Biometric devices, RFID, smart cards, barcode scanners, GPS trackers, CCTV and access control
- Google/Microsoft SSO, calendars, Meet/Teams/Zoom, cloud storage and LMS/content tools
- API, webhooks, scheduled jobs, import/export connectors and integration error logs
- Workflow automation: approval routing, reminders, escalations, auto-allocation and document generation

## 20. Compliance, Accessibility & Quality

- Configurable statutory and board-specific reports; regional tax, fee and certificate requirements
- Consent, privacy requests, data retention, audit trails and secure document handling
- Accessibility support: keyboard navigation, readable contrast, screen-reader labels and scalable text
- Responsive web portal plus Android/iOS apps; offline-friendly attendance and sync conflict handling
- Localization: multiple languages, date formats, currencies, timezone and translation management
- Monitoring, error logging, uptime status, support tickets, knowledge base and release notes

## Core Data Entities

- Organization, campus, academic year, class, section, subject, course, room and timetable
- User, role, permission, staff, student, parent/guardian, enrollment and document
- Enquiry, application, admission, certificate, attendance, leave and discipline incident
- Assessment, exam, mark, grade, report card, assignment and learning resource
- Fee structure, invoice, payment, refund, concession, ledger, expense and payroll run
- Route, stop, vehicle, trip, library item, issue transaction, hostel room and bed allotment
- Inventory item, purchase order, supplier, asset, maintenance ticket, notice, event and message

## Cross-Module Rules

- A single student record should power attendance, fees, exams, transport, library, hostel and portals; avoid duplicate student masters.
- Every financial event should be traceable to a receipt, invoice, ledger entry, user and audit log.
- Every workflow should define its status transitions, owner, approver, notifications, SLA and reversal/correction policy.
- Every sensitive module should enforce least-privilege access and record view/edit/export actions.
- Every integration should have retry handling, reconciliation views and a manual exception workflow.
