<!-- Generated for School ERP React/Firebase/Turso/Cloudinary implementation. -->

# School ERP LLM Implementation Plan

## 0. Execution Instruction for the Coding LLM

Build the complete project from this plan in one continuous implementation pass. Do not stop after a foundation step. Do not ask the user to approve each stage. Do not write “finish this first”, “pause here”, “continue later”, or “next phase after confirmation”. Treat this entire file as one accepted implementation command.

The generated result must be a clean, working, modular React/Next.js School ERP codebase using Firebase Auth, Turso/libSQL, Drizzle ORM, Cloudinary, next-shadcn-admin-dashboard UI patterns, shadcn/ui, Tailwind CSS, and Tremor analytics.

If a full third-party integration is too large for the first code pass, implement a typed adapter interface, explicit provider configuration, failure states, logs, and TODO comments only at the provider boundary. Do not report an unconfigured provider as successful.

## 1. Non-Negotiable Build Rules

1. Use TypeScript everywhere.
2. Use strict mode.
3. Use the Next.js App Router because the chosen dashboard template is Next.js based.
4. Keep React components modular.
5. Do not put many unrelated components, actions, schemas, and database logic in one file.
6. Do not create giant page files.
7. Do not duplicate student, staff, parent, or school master records in separate modules.
8. Every tenant-owned table must include `organizationId`.
9. Every campus-specific table must include `campusId`.
10. Every protected server query must enforce tenant scope.
11. Every mutation must validate with Zod.
12. Every mutation must check Firebase-authenticated user and local RBAC permission.
13. Every mutation must write an audit log.
14. Every large list must use pagination.
15. Every module must have loading, empty, error, and success UI states.
16. Every form must show validation errors.
17. Never expose Firebase Admin, Turso token, Cloudinary secret, or private config to client bundles.
18. Use server-only files for Firebase Admin, Turso, and Cloudinary signing.
19. Keep complex business logic inside feature services, not inside React components.
20. Write tests for guards, validation, permission logic, and representative CRUD flows.

## 2. Required Skills and Technical Capabilities to Use

The coding LLM must use or implement the following technical skills during generation:

- React component architecture.
- Next.js App Router routing, layouts, route groups, server components, client components, route handlers, middleware, and server actions.
- TypeScript strict typing.
- Tailwind CSS and shadcn/ui composition.
- Tremor chart and dashboard composition.
- Firebase Auth client SDK.
- Firebase Admin token/session verification.
- Turso/libSQL connection management.
- Drizzle ORM schema, relations, migrations, and typed query patterns.
- Zod validation and React Hook Form integration.
- Cloudinary signed upload flow.
- Role-based access control and data scoping.
- Multi-tenant database design.
- Audit logging.
- Data table design with TanStack Table.
- CSV/Excel import/export.
- Test writing with Vitest, React Testing Library, and Playwright.
- Accessibility-first UI implementation.
- Secure env-var handling.
- Clean folder structure and feature-based modularization.

## 3. Bootstrap the Project

Use the selected dashboard repository as the UI base. If cloning is possible, start from:

```bash
git clone https://github.com/arhamkhnz/next-shadcn-admin-dashboard.git school-erp
cd school-erp
```

If cloning is not possible in the agent environment, create a new Next.js TypeScript project and recreate the same dashboard shell patterns with shadcn/ui:

```bash
pnpm create next-app@latest school-erp --ts --eslint --tailwind --app --src-dir false --import-alias "@/*"
cd school-erp
```

Normalize the project to:

- App Router.
- TypeScript.
- Tailwind CSS.
- shadcn/ui.
- Dark/light theme.
- Responsive sidebar.
- Header with organization switcher, campus switcher, global search, notifications, and user menu.

## 4. Install Dependencies

Install runtime dependencies:

```bash
pnpm add firebase firebase-admin
pnpm add @libsql/client drizzle-orm
pnpm add zod react-hook-form @hookform/resolvers
pnpm add cloudinary
pnpm add @tanstack/react-table @tanstack/react-query
pnpm add date-fns lucide-react sonner next-safe-action
pnpm add clsx tailwind-merge class-variance-authority
pnpm add @tremor/react recharts
pnpm add uuid papaparse xlsx react-dropzone qrcode jose
```

Install dev dependencies:

```bash
pnpm add -D drizzle-kit tsx
pnpm add -D vitest @vitejs/plugin-react jsdom
pnpm add -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
pnpm add -D playwright @playwright/test
pnpm add -D eslint prettier prettier-plugin-tailwindcss
```

Install shadcn/ui components:

```bash
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button card input textarea select checkbox radio-group switch label form table dialog sheet dropdown-menu popover calendar tabs badge alert separator avatar breadcrumb command toast sonner skeleton tooltip scroll-area pagination accordion alert-dialog
```

Add package scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "tsx db/migrate.ts",
    "db:studio": "drizzle-kit studio",
    "check": "pnpm typecheck && pnpm lint && pnpm test && pnpm build"
  }
}
```

## 5. Create Environment and Config Foundation

Create:

- `.env.example`
- `db/client.ts` and server-side provider configuration guards
- `config/constants.ts`
- `config/modules.ts`
- `config/permissions.ts`
- `config/nav.ts`

Server-side configuration must be validated at the database and provider boundaries. Server-only config must not be imported in client files.

Required env vars:

```env
NEXT_PUBLIC_APP_NAME="School ERP"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

NEXT_PUBLIC_FIREBASE_API_KEY=""
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=""
NEXT_PUBLIC_FIREBASE_PROJECT_ID=""
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=""
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=""
NEXT_PUBLIC_FIREBASE_APP_ID=""

FIREBASE_PROJECT_ID=""
FIREBASE_CLIENT_EMAIL=""
FIREBASE_PRIVATE_KEY=""

TURSO_DATABASE_URL=""
TURSO_AUTH_TOKEN=""

CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""

APP_ENCRYPTION_SECRET=""
INTERNAL_JOB_SECRET=""

```

## 6. Create Database Layer

Create:

```text
db/
  client.ts
  migrate.ts
  schema/
    index.ts
    foundation.ts
    users.ts
    admissions.ts
    students.ts
    academics.ts
    attendance.ts
    exams.ts
    finance.ts
    hr.ts
    communication.ts
    library.ts
    transport.ts
    hostel.ts
    inventory.ts
    health.ts
    activities.ts
    alumni.ts
    cms.ts
    reports.ts
    integrations.ts
    audit.ts
  queries/
```

Configure `drizzle.config.ts` for Turso/libSQL.

Implement `db/client.ts` with `@libsql/client` and `drizzle-orm/libsql`.

Implement schema files with shared patterns:

- `id`
- `organizationId`
- `campusId`
- `createdAt`
- `updatedAt`
- `createdBy`
- `updatedBy`
- `status`
- indexes for tenant filters
- unique constraints per organization where required

Create helper functions:

- `createId(prefix?: string)`
- `now()`
- `tenantColumns()`
- `auditColumns()`

## 7. Implement Foundation Schema

Implement these core tables first in schema, but do not stop after them:

- organizations
- campuses
- academicYears
- terms
- holidays
- classes
- sections
- houses
- departments
- streams
- batches
- subjects
- subjectGroups
- gradingScales
- customFields
- customForms
- workflowDefinitions

Add indexes:

- organization/campus.
- academic year active status.
- class/section lookup.
- unique slug per organization where applicable.

## 8. Implement Users and RBAC Schema

Implement:

- users
- roles
- permissions
- rolePermissions
- userRoles
- userCampusScopes
- userClassSectionScopes
- delegatedAccess
- sessionLogs
- loginAudits

Required role seeds:

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

Create permission constants for every module:

- read
- create
- update
- delete
- approve
- reject
- export
- import
- view_sensitive
- configure

Add special permissions:

- attendance:mark
- attendance:approve_correction
- fees:collect
- fees:refund
- exams:enter_marks
- exams:publish_result
- reports:export_sensitive
- settings:update
- integrations:manage
- audit_logs:read

## 9. Implement Authentication

Create:

```text
lib/auth/firebase-client.ts
lib/auth/firebase-admin.ts
lib/auth/session.ts
lib/auth/guards.ts
lib/auth/claims.ts
hooks/use-auth.ts
hooks/use-current-user.ts
app/(auth)/login/page.tsx
app/(auth)/register/page.tsx
app/(auth)/forgot-password/page.tsx
app/(auth)/verify-email/page.tsx
app/api/auth/session/route.ts
app/api/auth/logout/route.ts
middleware.ts
```

Requirements:

- Client login with Firebase email/password.
- Password reset flow.
- Email verification flow.
- Secure HTTP-only session cookie creation through server route.
- Server verifies session using Firebase Admin.
- Local user profile is loaded from Turso.
- Inactive/suspended users are blocked.
- Unverified email is blocked if school setting requires it.
- Middleware protects dashboard route groups.
- Server actions use `requireUser()`, `requirePermission()`, and `requireTenant()`.

## 10. Implement RBAC and Scope Services

Create:

```text
lib/rbac/permissions.ts
lib/rbac/check-permission.ts
lib/rbac/scopes.ts
features/users/services/rbac.service.ts
```

Implement:

- Permission string constants.
- Role permission seed mapping.
- Scope checker.
- Campus scope checker.
- Class/section scope checker.
- Parent child-profile scope checker.
- Teacher assigned-class scope checker.
- Global super admin bypass only for platform-level operations.

Every query helper should accept the current user context and apply scope filters.

## 11. Implement Audit Logging

Create:

```text
lib/audit/audit-log.ts
features/audit/components/audit-log-table.tsx
app/(dashboard)/audit-logs/page.tsx
```

Audit log service must support:

- create
- update
- delete
- approve
- reject
- import
- export
- login
- upload
- download
- view_sensitive
- collect_payment
- refund_payment
- publish_result

All mutation server actions must call `writeAuditLog()`.

## 12. Implement Cloudinary Upload System

Create:

```text
lib/cloudinary/server.ts
lib/cloudinary/signatures.ts
lib/cloudinary/types.ts
components/upload/file-upload-field.tsx
components/upload/image-upload-field.tsx
app/api/uploads/signature/route.ts
features/documents/
```

Requirements:

- Generate signed upload params server-side.
- Verify auth and permission before signature.
- Restrict folder by organization ID.
- Validate file type and size.
- Store metadata in `documentFiles`.
- Support entity linking:
  - student
  - employee
  - application
  - certificate
  - library_item
  - asset
  - cms_media
  - health_record
  - custom

Do not use unrestricted unsigned uploads for school/private documents.

## 13. Implement Dashboard Shell

Create or adapt:

```text
components/layout/dashboard-shell.tsx
components/layout/sidebar.tsx
components/layout/header.tsx
components/layout/org-switcher.tsx
components/layout/campus-switcher.tsx
components/layout/user-menu.tsx
components/layout/notifications-menu.tsx
components/layout/mobile-sidebar.tsx
components/common/page-header.tsx
components/common/empty-state.tsx
components/common/error-state.tsx
components/common/loading-state.tsx
```

Requirements:

- Responsive sidebar.
- Role-aware navigation.
- Organization/campus context display.
- Breadcrumbs.
- Theme toggle.
- User menu.
- Notifications icon.
- Mobile-friendly layout.

## 14. Implement Shared UI Building Blocks

Create:

```text
components/data-table/data-table.tsx
components/data-table/data-table-pagination.tsx
components/data-table/data-table-toolbar.tsx
components/forms/form-section.tsx
components/forms/field-error.tsx
components/forms/submit-button.tsx
components/charts/kpi-card.tsx
components/charts/chart-card.tsx
components/common/status-badge.tsx
components/common/confirm-dialog.tsx
components/common/search-input.tsx
components/common/filter-bar.tsx
```

Requirements:

- DataTable must support server pagination.
- StatusBadge must support standard statuses.
- ConfirmDialog must be reused for destructive actions.
- Forms must use React Hook Form and Zod.

## 15. Implement Foundation Module

Create feature files:

```text
features/foundation/
  actions/
  components/
  schemas/
  services/
  types/
  tests/
```

Build pages:

- `/organizations`
- `/campuses`
- `/settings/academic-years`
- `/settings/classes`
- `/settings/sections`
- `/settings/subjects`
- `/settings/roles`
- `/settings/permissions`

Implement CRUD for:

- organizations
- campuses
- academic years
- classes
- sections
- subjects
- roles
- permissions

Acceptance:

- Super Admin manages organizations.
- Institution admin manages campus and academic settings.
- All writes audited.
- Deletes blocked if dependent records exist.

## 16. Implement User Management

Build pages:

- `/users`
- `/users/[id]`
- `/settings/roles`
- `/settings/permissions`
- `/settings/access-scopes`

Implement:

- User list.
- Create/invite user.
- Link Firebase UID.
- Assign role.
- Assign campus scope.
- Assign class/section scope.
- Activate/deactivate.
- Delegated access.
- Login audit view.

Acceptance:

- Role and scope changes audited.
- Suspended users cannot login.
- Navigation changes by permission.

## 17. Implement Admissions Module

Build pages:

- `/admissions/enquiries`
- `/admissions/applications`
- `/admissions/tests`
- `/admissions/approvals`
- `/admissions/seat-matrix`
- `/admissions/reports`

Implement:

- Enquiry CRUD.
- Follow-up tasks.
- Lead status pipeline.
- Source/campaign tracking.
- Application CRUD.
- Applicant and parent data.
- Document upload and verification.
- Admission test/interview scheduling.
- Seat matrix.
- Approval workflow.
- Convert application to student.
- Admission reports.

Acceptance:

- Application number is generated.
- Seat capacity is enforced.
- Approved admission creates student, guardians, enrollment, and timeline event.
- Rejected admission does not create active student.

## 18. Implement Student Information System

Build pages:

- `/students`
- `/students/new`
- `/students/[id]`
- `/students/[id]/profile`
- `/students/[id]/guardians`
- `/students/[id]/documents`
- `/students/[id]/enrollment`
- `/students/[id]/timeline`
- `/students/[id]/attendance`
- `/students/[id]/fees`
- `/students/[id]/results`
- `/certificates`

Implement:

- Student CRUD.
- Guardian CRUD.
- Student-guardian linking.
- Enrollment history.
- Class/section transfer.
- Roll number.
- House assignment.
- Student photo upload.
- Identity documents.
- Medical summary.
- Status changes.
- Timeline.
- Certificate templates.
- Certificate issuing.
- QR verification route.

Acceptance:

- Student master powers all modules.
- Class transfer preserves history.
- Certificate number unique.
- Sensitive data requires permission.

## 19. Implement Academic Management

Build pages:

- `/academics/curriculum`
- `/academics/lesson-plans`
- `/academics/teacher-allocation`
- `/academics/timetable`
- `/academics/substitutions`
- `/academics/assignments`
- `/academics/resources`

Implement:

- Curriculum setup.
- Course/unit/chapter/outcome mapping.
- Syllabus mapping.
- Lesson plan CRUD.
- Lesson plan approval.
- Teaching resources with upload.
- Teacher allocation.
- Workload summary.
- Timetable periods.
- Clash detection.
- Substitution flow.
- Assignment/homework CRUD.
- Assignment submissions.
- Teacher feedback.
- Completion analytics.

Acceptance:

- Teacher sees assigned academic records.
- Timetable detects clashes.
- Assignment due dates and late status work.
- Curriculum coverage dashboard renders.

## 20. Implement Attendance and Discipline

Build pages:

- `/attendance/students`
- `/attendance/staff`
- `/attendance/leave`
- `/attendance/corrections`
- `/attendance/discipline`
- `/attendance/wellbeing`
- `/attendance/reports`

Implement:

- Student attendance session.
- Student attendance records.
- Bulk marking.
- Period-wise marking.
- Attendance corrections.
- Approval workflow.
- Staff attendance.
- Leave types.
- Leave request.
- Leave balances.
- Discipline incidents.
- Merits/demerits.
- Wellbeing confidential records.
- Low attendance alerts.

Acceptance:

- Attendance is scoped by assigned teacher/class.
- Corrections after cutoff require approval.
- Parent absence notifications create in-app events.
- Confidential wellbeing access is restricted.

## 21. Implement Examination and Assessment

Build pages:

- `/exams/planning`
- `/exams/schedules`
- `/exams/marks`
- `/exams/results`
- `/exams/report-cards`
- `/exams/question-bank`
- `/exams/online-tests`

Implement:

- Exam type CRUD.
- Exam scheme.
- Grade rules.
- Exam schedule.
- Room allocation.
- Invigilator duty.
- Admit card scaffold.
- Marks entry.
- Bulk import.
- Result moderation.
- Result approval.
- Result publication.
- Report card view/export.
- Question bank.
- Online test scaffold.
- Attempt history.

Acceptance:

- Marks validation blocks out-of-range marks.
- Results hidden until published.
- Publishing result is audited.
- Report cards show student, marks, grades, and attendance summary.

## 22. Implement Fees, Finance and Accounts

Build pages:

- `/fees/configuration`
- `/fees/invoices`
- `/fees/payments`
- `/fees/receipts`
- `/fees/refunds`
- `/fees/defaulters`
- `/accounts/chart-of-accounts`
- `/accounts/ledger`
- `/accounts/expenses`
- `/accounts/reconciliation`
- `/accounts/reports`
- `/accounts/donations`

Implement:

- Fee heads.
- Fee structures.
- Installments.
- Fee assignment.
- Invoice generation.
- Invoice items.
- Payment collection.
- Receipt generation.
- Partial payments.
- Refunds.
- Concessions.
- Late fee rules.
- Defaulter list.
- Chart of accounts.
- Ledger entries.
- Expenses.
- Bank accounts.
- Reconciliation scaffold.
- Donation records.

Acceptance:

- Every payment creates receipt and ledger entries.
- Refunds reference original payment.
- Financial mutations are immutable except reversals.
- Export actions audited.

## 23. Implement HR and Payroll

Build pages:

- `/hr/employees`
- `/hr/recruitment`
- `/hr/documents`
- `/hr/performance`
- `/hr/training`
- `/payroll/structures`
- `/payroll/runs`
- `/payroll/payslips`

Implement:

- Employee CRUD.
- Employee documents.
- Job applicant tracking.
- Onboarding tasks.
- Qualifications and experience.
- Department/designation.
- Reporting manager.
- Salary structures.
- Components.
- Payroll run.
- Payslip generation.
- Staff appraisal scaffold.
- Training events.

Acceptance:

- Employee ID unique.
- Employee portal user can be linked.
- Payroll run snapshots inputs.
- Payslips restricted to authorized roles.

## 24. Implement Portals

Build route groups:

- `/teacher`
- `/parent`
- `/student`

Teacher portal:

- Dashboard.
- My classes.
- Today timetable.
- Attendance.
- Lesson plans.
- Homework.
- Marks entry.
- Substitution duties.
- Leave.
- Payslips.

Parent portal:

- Child switcher.
- Child profile.
- Attendance.
- Homework.
- Results.
- Fees/receipts.
- Timetable.
- Transport.
- Leave.
- PTM.
- Notices.
- Documents.
- Support.

Student portal:

- Profile.
- Timetable.
- Assignments.
- Resources.
- Attendance.
- Exams.
- Results.
- Certificates.
- Activities.
- Support.

Acceptance:

- Parent sees only linked children.
- Student sees only own records.
- Teacher sees only assigned scope unless extra permission exists.

## 25. Implement Communication and Engagement

Build pages:

- `/communication/messages`
- `/communication/templates`
- `/communication/notices`
- `/communication/events`
- `/communication/ptm`
- `/communication/logs`

Implement:

- Message templates.
- Audience segmentation.
- In-app notifications.
- Selected email/SMS/WhatsApp provider adapters.
- Notices.
- Circular acknowledgements.
- Events.
- Event registrations.
- PTM slot creation.
- Parent booking.
- Delivery logs.

Acceptance:

- In-app notifications work.
- External provider sends are logged with provider references and delivery state.
- Audience selection respects tenant and role scopes.

## 26. Implement Library Module

Build pages:

- `/library/catalogue`
- `/library/copies`
- `/library/issue-return`
- `/library/reservations`
- `/library/fines`
- `/library/digital-resources`
- `/library/reports`

Implement:

- Library item CRUD.
- Copy/accession management.
- Issue transaction.
- Return transaction.
- Renewal.
- Reservation.
- Lost/damaged status.
- Fine calculation.
- Digital resources.
- Circulation reports.

Acceptance:

- Accession number unique.
- Borrower limit enforced.
- Fine calculated on return.
- Inventory availability updates.

## 27. Implement Transport and Fleet

Build pages:

- `/transport/routes`
- `/transport/stops`
- `/transport/vehicles`
- `/transport/drivers`
- `/transport/allocations`
- `/transport/trips`
- `/transport/incidents`
- `/transport/reports`

Implement:

- Routes.
- Stops.
- Route-stop ordering.
- Vehicles.
- Vehicle documents.
- Drivers/conductors.
- Student/staff route allocation.
- Seat capacity validation.
- Trip logs.
- QR boarding scaffold.
- Incident logs.
- Expiry alerts.

Acceptance:

- Route allocation validates capacity.
- Vehicle document expiry creates alerts.
- Manifests export.

## 28. Implement Hostel and Canteen

Build pages:

- `/hostel/buildings`
- `/hostel/rooms`
- `/hostel/beds`
- `/hostel/allotments`
- `/hostel/visitors`
- `/hostel/outpasses`
- `/hostel/attendance`
- `/hostel/reports`
- `/canteen/menu`
- `/canteen/meal-plans`
- `/canteen/transactions`
- `/canteen/reports`

Implement:

- Hostel building/floor/room/bed setup.
- Bed allotment.
- Check-in/out.
- Visitor logs.
- Outpass workflow.
- Hostel attendance.
- Mess menu.
- Meal plan.
- Canteen transaction scaffold.
- Occupancy analytics.

Acceptance:

- Bed capacity enforced.
- Outpass approval workflow works.
- Hostel occupancy dashboard renders.

## 29. Implement Inventory, Assets and Procurement

Build pages:

- `/inventory/items`
- `/inventory/stock-locations`
- `/inventory/stock-movements`
- `/inventory/suppliers`
- `/inventory/reports`
- `/assets/register`
- `/assets/assignments`
- `/assets/maintenance`
- `/assets/depreciation`
- `/procurement/requisitions`
- `/procurement/purchase-orders`
- `/procurement/goods-receipts`
- `/procurement/vendors`

Implement:

- Item catalogue.
- Stock locations.
- Stock movements.
- Supplier records.
- Purchase requisitions.
- Purchase orders.
- Goods receipt.
- Asset register.
- Asset assignment.
- Maintenance tickets.
- Depreciation scaffold.
- Low-stock alerts.

Acceptance:

- Stock quantity changes only through movements.
- Purchase order status transitions are validated.
- Maintenance ticket timeline exists.

## 30. Implement Health, Safety and Facilities

Build pages:

- `/health/profiles`
- `/health/clinic-visits`
- `/health/medications`
- `/health/screenings`
- `/safety/visitors`
- `/safety/gate-passes`
- `/safety/incidents`
- `/safety/evacuation`
- `/facilities/bookings`
- `/facilities/maintenance`
- `/facilities/complaints`

Implement:

- Health profiles.
- Allergies/conditions.
- Clinic visits.
- Medication logs.
- Parent alert events.
- Visitor pre-registration.
- Gate passes.
- Security incidents.
- Evacuation roll call scaffold.
- Facility booking.
- Maintenance tickets.
- SLA tracking.

Acceptance:

- Health records require sensitive permissions.
- Visitor logs export.
- Facility ticket statuses are tracked.

## 31. Implement Activities, Sports and Alumni

Build pages:

- `/activities/houses`
- `/activities/clubs`
- `/activities/sports`
- `/activities/competitions`
- `/activities/achievements`
- `/alumni/profiles`
- `/alumni/events`
- `/alumni/mentorship`
- `/alumni/jobs`
- `/alumni/donations`

Implement:

- House setup.
- House points.
- Club membership.
- Sports teams.
- Fixtures and scores.
- Activity registration.
- Achievements.
- Co-curricular transcript scaffold.
- Alumni profiles.
- Alumni directory privacy.
- Alumni events.
- Mentorship scaffold.
- Job board.

Acceptance:

- House points link to student.
- Alumni privacy settings respected.
- Achievements appear in student timeline.

## 32. Implement Website, Forms and CMS

Build pages:

- `/cms/pages`
- `/cms/media`
- `/cms/news`
- `/cms/galleries`
- `/cms/forms`
- `/cms/submissions`
- `/cms/settings`

Implement:

- CMS pages.
- Draft/published/archived workflow.
- SEO metadata.
- Media library using Cloudinary.
- Form builder.
- Form submissions.
- Admission enquiry linking.
- Public form route scaffold.
- Gallery records.

Acceptance:

- CMS publishing audited.
- Form submission can create enquiry.
- Media metadata stored.

## 33. Implement Reports, Analytics and MIS

Build pages:

- `/analytics`
- `/analytics/admissions`
- `/analytics/attendance`
- `/analytics/finance`
- `/analytics/academics`
- `/analytics/operations`
- `/reports`
- `/reports/scheduled`
- `/alerts`
- `/data-quality`

Use Tremor for:

- KPI cards.
- Bar charts.
- Donut charts.
- Area charts.
- Trend charts.
- Comparison cards.

Implement reports:

- Student register.
- Admissions report.
- Attendance report.
- Fee collection report.
- Defaulter report.
- Exam result report.
- Payroll report.
- Inventory report.
- Library circulation report.
- Transport report.
- Hostel occupancy report.
- Communication delivery report.

Implement alerts:

- Low attendance.
- Overdue fees.
- Missing marks.
- Expiring documents.
- Vehicle document expiry.
- Employee document expiry.
- Low stock.
- Capacity limits.
- Incomplete workflows.

Acceptance:

- Reports enforce permissions.
- Exports audited.
- Dashboards use aggregated queries.
- Alerts link to source records.

## 34. Implement Integrations and Automation

Build pages:

- `/integrations`
- `/integrations/payment`
- `/integrations/notifications`
- `/integrations/hardware`
- `/integrations/webhooks`
- `/integrations/logs`
- `/settings/api-keys`

Implement:

- Integration config.
- Provider interfaces.
- Configured provider adapters.
- Webhook event storage.
- Integration logs.
- Retry status.
- Manual exception workflow.
- Scheduled job interfaces.

Adapters:

- PaymentProvider.
- NotificationProvider.
- HardwareAttendanceProvider.
- GpsTrackingProvider.
- LmsProvider.
- CalendarProvider.

Acceptance:

- Integrations fail closed when provider configuration is missing.
- Failed events are logged.
- Credentials hidden server-side.

## 35. Implement Import and Export System

Create:

```text
lib/exports/csv.ts
lib/exports/excel.ts
lib/exports/pdf.ts
features/import-export/
```

Implement:

- CSV import parser.
- Excel import parser.
- Row validation.
- Import job table.
- Row-level errors.
- Export job table.
- CSV export.
- Excel export.
- PDF-ready HTML export scaffold.
- Audit all imports/exports.

Acceptance:

- Student import validates duplicate admission/student IDs.
- Export respects permission and tenant scope.
- Failed import rows are visible.

## 36. Production provisioning

Do not create runtime sample records or fake accounts. Apply migrations to the
target database, create the first school through `/setup` or `/platform`, and
create platform administrators only through `npm run db:seed:platform-admin`.
- Sample analytics data.

Seed must be idempotent where possible.

## 37. Testing Implementation

Create:

```text
features/*/tests/
tests/e2e/
tests/setup.ts
vitest.config.ts
playwright.config.ts
```

Write unit tests for:

- `checkPermission`
- scope filters
- student validation schema
- admission approval service
- attendance marking validation
- fee payment allocation
- marks validation
- Cloudinary signature guard
- audit log writer

Write integration tests for:

- create student action
- mark attendance action
- collect fee payment action
- enter marks action
- publish result action

Write Playwright E2E tests for:

- login
- dashboard access
- create class/section
- create student
- mark attendance
- generate invoice
- collect payment
- enter marks
- publish result
- parent views child result

## 38. README and Developer Documentation

Create `README.md` with:

- Project overview.
- Stack.
- Setup.
- Env vars.
- Firebase setup.
- Turso setup.
- Cloudinary setup.
- Install command.
- Dev command.
- Migration commands.
- Seed command.
- Test commands.
- Build command.
- Folder structure.
- RBAC explanation.
- Tenant scope explanation.
- How to add a new module.
- How to add a new permission.
- How to add a new report.
- How to add an integration provider.

## 39. Final Quality Gates

The generated project must satisfy:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Fix errors instead of ignoring them.

No `any` unless there is a documented unavoidable boundary.

No direct DB calls from client components.

No server secrets in client code.

No large monolithic files.

No blank module pages.

## 40. Expected Final Deliverable

The final deliverable should be a complete codebase with:

- Working auth pages.
- Protected dashboard.
- Role-aware navigation.
- Turso/Drizzle schema and migrations.
- Production provisioning and migration runbooks.
- Cloudinary signed upload.
- Core CRUD for all major domains.
- All modules represented in routes.
- Tremor analytics dashboards.
- shadcn UI forms/tables/dialogs.
- Audit logs.
- Reports and exports.
- Configured integration adapters.
- Tests.
- README.
