<!-- Generated for School ERP React/Firebase/Turso/Cloudinary implementation. -->

# LLM Context File: School ERP React Project

## 0. Purpose

This file is the compact context prompt for a coding LLM. Paste this file into the coding agent before asking it to generate the project. It summarizes the product, stack, architecture, code rules, and execution expectations.

## 1. Mission

Build a full School ERP dashboard and portal system in React using Next.js, TypeScript, Firebase Auth, Turso/libSQL, Drizzle ORM, Cloudinary, shadcn/ui, and Tremor.

The application must support school administration across admissions, student records, attendance, exams, fees, HR/payroll, portals, communication, library, transport, hostel, inventory, health/safety, activities, alumni, CMS, reports, analytics, integrations, and audit logs.

## 2. Mandatory Stack

Use:

- React with Next.js App Router.
- TypeScript strict mode.
- Firebase Authentication for login, password reset, email verification, and identity.
- Firebase Admin SDK for server-side token/session verification.
- Turso/libSQL for relational database.
- Drizzle ORM for schema, typed queries, and migrations.
- Cloudinary for image/file uploads through server-side signed upload flow.
- next-shadcn-admin-dashboard as the dashboard UI reference/base.
- shadcn/ui for UI primitives.
- Tailwind CSS for styling.
- Tremor for analytics dashboards and KPI/chart components.
- Zod for validation.
- React Hook Form for forms.
- TanStack Table for data tables.
- Vitest, React Testing Library, and Playwright for tests.

## 3. Core Product Rule

A single student record must power attendance, fees, exams, transport, library, hostel, parent portal, student portal, reports, and certificates. Do not duplicate student master data per module.

## 4. Multi-Tenancy Rule

Every school group is an organization. Every organization can have multiple campuses. All private records must be scoped by `organizationId`, and campus-specific records must also use `campusId`.

Never trust organization ID, campus ID, role, or permission values from the browser. Always derive permission and tenant scope from the authenticated server-side user context.

## 5. Auth Rule

Firebase Auth is used for identity. Turso stores the local app profile.

Every authenticated user must have:

- Firebase UID.
- Local user ID.
- Organization ID.
- Role.
- Status.
- Campus scope.
- Optional class/section scope.
- Optional linked student/guardian/employee record.

Use Firebase Admin on the server to verify ID tokens/session cookies. Use local RBAC tables for authorization.

## 6. RBAC Rule

Permission format:

```text
module:action
```

Examples:

```text
students:read
students:create
attendance:mark
fees:collect
exams:publish_result
reports:export
settings:update
audit_logs:read
```

Client-side navigation can hide modules, but server-side permission checks are mandatory for every protected read and write.

## 7. Required Roles

Implement these roles:

- super_admin
- management
- principal
- office_staff
- teacher
- accountant
- librarian
- transport_staff
- hostel_warden
- parent
- student
- alumni

## 8. Required Modules

Implement routes, navigation, schemas, permissions, core CRUD, and non-empty pages for:

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

## 9. First Build Expectation

The first generated project must include every module in routing and navigation. Complex integrations may begin behind typed adapter interfaces, but provider configuration, failure handling, and operational logging must be explicit before production launch. Every module page must be functional enough to show a list/table, filters, create/edit patterns, validation, and permission enforcement.

Do not leave blank placeholder pages.

## 10. Clean Code Rules

Do not write the project as huge files.

Follow these rules:

- One major component per file.
- Keep most files under 250 lines.
- Hard maximum 400 lines except migrations.
- Split feature code into:
  - `actions/`
  - `components/`
  - `schemas/`
  - `services/`
  - `types/`
  - `tests/`
- Put shared UI in `components/`.
- Put domain UI in `features/<domain>/components/`.
- Put database schema in `db/schema/`.
- Put database queries in `db/queries/`.
- Put auth guards in `lib/auth/`.
- Put permission logic in `lib/rbac/`.
- Put Cloudinary signing in `lib/cloudinary/`.
- Put audit helpers in `lib/audit/`.
- Page files should orchestrate, not contain full business logic.

## 11. Required Folder Structure

Use this structure:

```text
app/
  (auth)/
  (dashboard)/
  api/
components/
  ui/
  layout/
  dashboard/
  data-table/
  forms/
  charts/
  upload/
  common/
config/
db/
  schema/
  queries/
features/
  foundation/
  users/
  admissions/
  students/
  academics/
  attendance/
  exams/
  finance/
  hr/
  portals/
  communication/
  library/
  transport/
  hostel/
  inventory/
  health/
  activities/
  alumni/
  cms/
  reports/
  integrations/
  audit/
lib/
  auth/
  cloudinary/
  rbac/
  audit/
  validations/
  errors/
  utils/
  exports/
  integrations/
hooks/
tests/
```

## 12. Mutation Pattern

Every server mutation must:

1. Parse input with Zod.
2. Resolve current Firebase-authenticated server user.
3. Load local Turso user profile.
4. Check user status.
5. Check RBAC permission.
6. Enforce organization/campus/class/section scope.
7. Execute database mutation.
8. Write audit log.
9. Revalidate affected route/cache.
10. Return typed success/error result.

## 13. Query Pattern

Every protected query must:

1. Resolve current user.
2. Check read permission.
3. Apply tenant scope.
4. Apply campus/class/section/ownership scope.
5. Apply search, filter, sort, and pagination.
6. Return typed result.

## 14. Cloudinary Rule

Use server-side signed uploads.

Flow:

1. Client asks `/api/uploads/signature`.
2. Server verifies user and permission.
3. Server returns signed params.
4. Client uploads to Cloudinary.
5. Client sends resulting metadata to server action.
6. Server saves metadata and audit log.

Never expose Cloudinary API secret to the client.

## 15. Analytics Rule

Use Tremor for dashboards:

- KPI cards.
- Bar charts.
- Donut charts.
- Area charts.
- Line charts.
- Trend cards.

Required analytics pages:

- Management overview.
- Admissions.
- Attendance.
- Finance.
- Academics.
- Operations.
- Data quality.
- Alerts.

## 16. UI Rule

Use the next-shadcn-admin-dashboard style as the main visual system:

- Responsive sidebar.
- Header.
- Breadcrumbs.
- Theme toggle.
- Cards.
- Tables.
- Filters.
- Dialogs.
- Form pages.
- Settings pages.
- Mobile-friendly dashboard shell.

Use shadcn/ui components consistently.

## 17. Database Rules

Use Drizzle ORM and Turso/libSQL.

Every tenant-scoped table should include:

- `id`
- `organizationId`
- `campusId` where applicable
- `createdAt`
- `updatedAt`
- `createdBy`
- `updatedBy`
- `status` where applicable

Add useful indexes for:

- organizationId
- campusId
- academicYearId
- classId
- sectionId
- studentId
- status
- createdAt

## 18. Core Entities

Include at minimum:

- Organization
- Campus
- AcademicYear
- Class
- Section
- Subject
- User
- Role
- Permission
- Staff
- Student
- Guardian
- Enrollment
- Document
- Enquiry
- Application
- Admission
- Certificate
- Attendance
- Leave
- DisciplineIncident
- Exam
- Mark
- Grade
- ReportCard
- Assignment
- FeeStructure
- Invoice
- Payment
- Refund
- LedgerEntry
- Expense
- PayrollRun
- Route
- Stop
- Vehicle
- LibraryItem
- LibraryIssue
- HostelRoom
- BedAllotment
- InventoryItem
- PurchaseOrder
- Supplier
- Asset
- MaintenanceTicket
- Notice
- Event
- Message
- Report
- Alert
- IntegrationLog
- AuditLog

## 19. UI States

Every page must handle:

- Loading.
- Empty.
- Error.
- Success.
- Validation errors.
- Confirm destructive action.
- Mobile layout.

## 20. Testing Rule

Implement tests for:

- Auth guard.
- Permission checks.
- Scope filtering.
- Zod validation schemas.
- Student create/edit.
- Attendance marking.
- Fee payment.
- Marks entry.
- Cloudinary signature permission guard.
- Audit log creation.

## 21. Seed Data Rule

Create seed data for:

- One organization.
- Two campuses.
- Academic year.
- Classes.
- Sections.
- Subjects.
- Roles.
- Permissions.
- Demo users.
- Students.
- Guardians.
- Teachers.
- Fee structures.
- Invoices.
- Exam schemes.
- Attendance.
- Library.
- Transport.
- Hostel.
- Inventory.
- Notices.
- Analytics examples.

## 22. Execution Style for LLM

Implement the whole plan directly. Do not ask the user to confirm smaller steps. Do not output only a plan. Generate or modify the project files. Use clean names. Keep code modular. Run typecheck, lint, tests, and build. Fix generated errors.

## Future Android App Compatibility Requirement

The project must be designed so it can be converted into an Android app later without rewriting the backend or database layer.

Rules:
- Build all business logic behind reusable API routes/services.
- Do not connect mobile clients directly to Turso using exposed database tokens.
- Firebase Auth must be the single identity provider across web and mobile.
- RBAC permissions must be enforced server-side, not only in the UI.
- Cloudinary uploads must use signed upload flows from backend endpoints.
- Keep UI components modular so parent, student, and teacher portals can later be rebuilt in React Native/Expo or wrapped using Capacitor.
- Avoid hard-coding desktop-only layouts.
- Every page must be responsive from mobile width upward.
- Keep shared validation schemas, TypeScript types, DTOs, and API contracts in reusable folders.
- Admin-heavy screens can remain optimized for web/tablet, but parent/student/teacher portals must be mobile-first.

## 23. Final Output Expected from Coding LLM

The coding LLM should produce:

- A working Next.js React app.
- Auth pages.
- Protected dashboard.
- Role-aware navigation.
- Turso/Drizzle schema.
- Migrations.
- Production provisioning and migration runbooks.
- Cloudinary signed uploads.
- Core CRUD pages.
- All ERP modules in routes.
- Tremor analytics dashboards.
- Reports/export scaffolding.
- Audit logs.
- Configured integration adapters.
- Tests.
- README.
