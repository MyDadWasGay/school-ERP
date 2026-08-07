<!-- Generated for School ERP React/Firebase/Turso/Cloudinary implementation. -->

# School ERP Technical Design Document (TDD)

> In this document, TDD means **Technical Design Document**. Testing strategy is included separately inside this document.

## 0. Technical Goal

Build a production-quality, modular, multi-tenant School ERP web application using React, Next.js, TypeScript, Firebase Auth, Turso/libSQL, Drizzle ORM, Cloudinary, shadcn/ui, and Tremor.

The codebase must be maintainable by humans and AI coding agents. It must avoid giant files, avoid duplicated domain logic, enforce tenant isolation, and provide a repeatable architecture for every module.

## 1. Architecture Overview

### 1.1 Application Architecture

Use a **Next.js App Router** application because the chosen dashboard UI starter is a Next.js React dashboard. Next.js should be treated as the React framework, while React remains the UI foundation.

Architecture layers:

1. **Presentation Layer**
   - App Router pages.
   - Route groups.
   - Server components for data loading where possible.
   - Client components for interactive forms, tables, filters, charts, dialogs, and upload widgets.
   - shadcn/ui for core UI.
   - Tremor for analytical dashboards.

2. **Application Layer**
   - Server actions and route handlers.
   - Domain services.
   - Use-case functions.
   - Validation through Zod.
   - Permission checks.
   - Audit log creation.

3. **Domain Layer**
   - Domain types.
   - Domain constants.
   - Status machines.
   - Permission definitions.
   - Domain-specific validation schemas.
   - Business rules.

4. **Data Layer**
   - Turso/libSQL database.
   - Drizzle ORM schema and typed queries.
   - Migrations through drizzle-kit.
   - Repository/query functions split by domain.

5. **Integration Layer**
   - Firebase Auth client SDK.
   - Firebase Admin token verification on server.
   - Cloudinary signed upload service.
   - Notification provider adapters.
   - Payment provider adapters.
   - Hardware/device integration adapter interfaces.
   - Scheduled jobs adapter.

## 2. Selected Technology Stack

### 2.1 Runtime and Framework

- Next.js App Router
- React
- TypeScript
- Node.js runtime for server routes that require Firebase Admin, Cloudinary, or Turso driver access
- Tailwind CSS
- shadcn/ui
- Radix UI primitives
- Lucide React icons
- Tremor analytics components

### 2.2 Authentication

- Firebase Authentication for email/password login, password reset, email verification, and identity state.
- Firebase Admin SDK for verifying ID tokens on server routes.
- Local Turso user profile table for application role, organization, campus scope, status, and permissions.

### 2.3 Database

- Turso/libSQL as relational database.
- Drizzle ORM as schema/query layer.
- drizzle-kit for migrations.
- SQLite-compatible schema design.

### 2.4 File Storage

- Cloudinary for images and documents.
- Use signed upload flow generated server-side.
- Store Cloudinary metadata in Turso.
- Do not store large file binaries in Turso.

### 2.5 Forms and Validation

- React Hook Form.
- Zod schemas.
- Shared server/client validation schemas where safe.
- Server-side validation is mandatory even when client-side validation exists.

### 2.6 Tables and Data Views

- TanStack Table for advanced tables.
- shadcn table primitives for rendering.
- Server-side pagination/filtering for large records.

### 2.7 Testing

- Vitest for unit tests.
- React Testing Library for component tests.
- Playwright for E2E tests.
- MSW or test adapters for integration mocking where useful.

## 3. Recommended Dependencies

Install and use these packages unless the starter already includes an equivalent:

```bash
pnpm add firebase firebase-admin
pnpm add @libsql/client drizzle-orm
pnpm add zod react-hook-form @hookform/resolvers
pnpm add cloudinary
pnpm add @tanstack/react-table @tanstack/react-query
pnpm add date-fns
pnpm add lucide-react
pnpm add sonner
pnpm add next-safe-action
pnpm add clsx tailwind-merge class-variance-authority
pnpm add @tremor/react
pnpm add recharts
pnpm add uuid
pnpm add papaparse xlsx
pnpm add react-dropzone
pnpm add qrcode
pnpm add bcryptjs
pnpm add jose
```

Dev dependencies:

```bash
pnpm add -D drizzle-kit
pnpm add -D vitest @vitejs/plugin-react jsdom
pnpm add -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
pnpm add -D playwright @playwright/test
pnpm add -D eslint prettier prettier-plugin-tailwindcss
pnpm add -D tsx
```

shadcn components to install:

```bash
pnpm dlx shadcn@latest add button card input textarea select checkbox radio-group switch label form table dialog sheet dropdown-menu popover calendar tabs badge alert separator avatar breadcrumb command toast sonner skeleton tooltip scroll-area pagination accordion alert-dialog
```

## 4. Environment Variables

Create `.env.example` with:

```env
# App
NEXT_PUBLIC_APP_NAME="School ERP"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"

# Firebase Client
NEXT_PUBLIC_FIREBASE_API_KEY=""
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=""
NEXT_PUBLIC_FIREBASE_PROJECT_ID=""
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=""
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=""
NEXT_PUBLIC_FIREBASE_APP_ID=""

# Firebase Admin
FIREBASE_PROJECT_ID=""
FIREBASE_CLIENT_EMAIL=""
FIREBASE_PRIVATE_KEY=""

# Turso / libSQL
TURSO_DATABASE_URL=""
TURSO_AUTH_TOKEN=""

# Cloudinary
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""

# Security
APP_ENCRYPTION_SECRET=""
INTERNAL_JOB_SECRET=""

# Provider integrations are configured per deployment environment.
```

Rules:

- Never expose server-only env vars with `NEXT_PUBLIC_`.
- Firebase private key must support newline replacement.
- Validate env vars at startup through a typed `env.ts` module.

## 5. Repository Structure

Use this clean structure. Do not dump code into one file.

```text
school-erp/
  app/
    (auth)/
      login/
      register/
      forgot-password/
      verify-email/
    (dashboard)/
      layout.tsx
      dashboard/
      organizations/
      campuses/
      users/
      admissions/
      students/
      parents/
      academics/
      attendance/
      exams/
      fees/
      accounts/
      hr/
      payroll/
      staff/
      communication/
      library/
      transport/
      hostel/
      canteen/
      inventory/
      assets/
      procurement/
      health/
      safety/
      facilities/
      activities/
      alumni/
      cms/
      reports/
      analytics/
      alerts/
      settings/
      audit-logs/
    api/
      auth/
      uploads/
      webhooks/
      reports/
      exports/
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
    nav.ts
    modules.ts
    permissions.ts
    constants.ts
  db/
    client.ts
    migrate.ts
    seed.ts
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
      portals.ts
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
      foundation.queries.ts
      users.queries.ts
      students.queries.ts
      admissions.queries.ts
      attendance.queries.ts
      finance.queries.ts
  features/
    foundation/
      actions/
      components/
      schemas/
      services/
      types/
      tests/
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
      firebase-client.ts
      firebase-admin.ts
      session.ts
      guards.ts
      claims.ts
    cloudinary/
      server.ts
      signatures.ts
      types.ts
    rbac/
      permissions.ts
      check-permission.ts
      scopes.ts
    audit/
      audit-log.ts
    validations/
      shared.ts
    errors/
      app-error.ts
      result.ts
    utils/
      cn.ts
      dates.ts
      ids.ts
      pagination.ts
      search.ts
    exports/
      csv.ts
      excel.ts
      pdf.ts
    integrations/
      notification-provider.ts
      payment-provider.ts
      hardware-provider.ts
  hooks/
    use-auth.ts
    use-current-user.ts
    use-debounce.ts
    use-confirm.ts
  middleware.ts
  drizzle.config.ts
  next.config.ts
  tailwind.config.ts
  package.json
  README.md
```

## 6. Code Organization Rules

### 6.1 File Size Rules

- Keep most files below 250 lines.
- Hard maximum: 400 lines except generated migration files.
- If a file grows too large, split it into:
  - `*.types.ts`
  - `*.schema.ts`
  - `*.queries.ts`
  - `*.actions.ts`
  - `*.components.tsx`
  - focused child components.

### 6.2 Component Rules

- One major component per file.
- Reusable UI goes in `components/`.
- Domain-specific UI goes in `features/<domain>/components/`.
- Page files should orchestrate, not contain all business logic.
- Avoid inline giant forms inside page files.
- Extract table columns to `columns.tsx`.
- Extract filter components to `filters.tsx`.
- Extract form schemas to `schemas/`.

### 6.3 Server Rules

- Server-only database and admin SDK code must be under `db/`, `lib/auth/firebase-admin.ts`, or server-only feature services.
- Never import server-only modules into client components.
- All mutations must validate input, check auth, check permission, enforce tenant scope, mutate data, write audit log, and return typed result.

### 6.4 Naming Rules

Use clear domain names:

- `students`
- `enrollments`
- `guardianLinks`
- `attendanceRecords`
- `feeInvoices`
- `feePayments`
- `examSchemes`
- `marksEntries`
- `libraryItems`
- `transportRoutes`

Avoid vague names:

- `data`
- `item`
- `thing`
- `helper`
- `misc`
- `utils2`
- `newFile`

## 7. Authentication Design

### 7.1 Firebase Auth Flow

Client-side:

1. User logs in using Firebase Auth.
2. Client receives Firebase ID token.
3. Protected routes require authenticated state.
4. Client requests current local user profile from server.

Server-side:

1. Route handler or server action reads ID token from Authorization header or session cookie.
2. Firebase Admin verifies the token.
3. Server loads local `users` row by `firebaseUid`.
4. Server validates:
   - user exists
   - user is active
   - organization is active
   - campus scope is allowed
   - email verification if required
   - permission for requested action
5. Server executes the action.

### 7.2 Session Strategy

Use a secure session cookie approach for Next.js:

- On login, exchange Firebase ID token for a secure HTTP-only session cookie through `/api/auth/session`.
- Middleware checks for the session cookie.
- Server verifies session cookie with Firebase Admin.
- Client still uses Firebase SDK for auth state and token refresh.

### 7.3 User Provisioning

Supported flows:

1. Super Admin creates organization admin user.
2. Institution admin invites staff.
3. Parent/student accounts can be created after student enrollment.
4. Firebase account creation can be done by client registration or admin invite flow.
5. Local profile must always be created/linked.

### 7.4 User Status

Users must have statuses:

- active
- invited
- pending_email_verification
- suspended
- deactivated

Inactive/suspended users cannot access protected resources.

## 8. RBAC and Scope Model

### 8.1 Permission Format

Use a permission string format:

```text
module:action
```

Examples:

```text
students:read
students:create
students:update
students:delete
students:export
fees:collect
fees:refund
attendance:mark
attendance:approve_correction
exams:publish_result
reports:export
settings:update
```

### 8.2 Scope Types

Each user can have one or more scopes:

- global
- organization
- campus
- class
- section
- assigned_teacher
- own_profile
- child_profile

### 8.3 Permission Check Contract

```ts
type PermissionCheckInput = {
  userId: string;
  organizationId: string;
  campusId?: string;
  permission: string;
  resource?: {
    type: string;
    id?: string;
    classId?: string;
    sectionId?: string;
    ownerUserId?: string;
    studentId?: string;
  };
};
```

The check must return:

```ts
type PermissionCheckResult = {
  allowed: boolean;
  reason?: string;
};
```

### 8.4 Client and Server

- Client uses permissions only to shape navigation.
- Server uses permissions as the real gate.
- Every server action must call a guard.

## 9. Database Design

Use Drizzle schema split by domain. Every tenant-scoped table must include:

- `id`
- `organizationId`
- `campusId` when applicable
- `createdAt`
- `updatedAt`
- `createdBy`
- `updatedBy`
- `status` when applicable

Use text IDs generated by `createId()` or `uuid`.

### 9.1 Foundation Tables

- `organizations`
- `campuses`
- `academicYears`
- `terms`
- `holidays`
- `schoolCalendarEvents`
- `classes`
- `sections`
- `houses`
- `departments`
- `streams`
- `batches`
- `subjects`
- `subjectGroups`
- `gradingScales`
- `customFields`
- `customForms`
- `workflowDefinitions`

### 9.2 User and RBAC Tables

- `users`
- `roles`
- `permissions`
- `rolePermissions`
- `userRoles`
- `userCampusScopes`
- `userClassSectionScopes`
- `delegatedAccess`
- `sessionLogs`
- `loginAudits`

### 9.3 Student Lifecycle Tables

- `enquiries`
- `enquiryFollowUps`
- `applications`
- `applicationDocuments`
- `applicationAssessments`
- `admissions`
- `students`
- `guardians`
- `studentGuardianLinks`
- `studentMedicalProfiles`
- `studentDocuments`
- `enrollments`
- `studentTimelineEvents`
- `studentCertificates`
- `certificateTemplates`

### 9.4 Academic Tables

- `curriculums`
- `courses`
- `units`
- `chapters`
- `learningOutcomes`
- `syllabusMaps`
- `lessonPlans`
- `teachingResources`
- `teacherAssignments`
- `studentSubjectEnrollments`
- `timetableTemplates`
- `timetablePeriods`
- `substitutions`
- `assignments`
- `assignmentSubmissions`
- `assignmentFeedback`

### 9.5 Attendance and Discipline Tables

- `studentAttendanceSessions`
- `studentAttendanceRecords`
- `attendanceCorrectionRequests`
- `staffAttendanceRecords`
- `leaveTypes`
- `leaveRequests`
- `leaveBalances`
- `disciplineIncidents`
- `wellbeingRecords`
- `grievanceCases`
- `meritDemeritEvents`

### 9.6 Exams and Assessment Tables

- `examTypes`
- `examSchemes`
- `examTerms`
- `exams`
- `examSchedules`
- `examRooms`
- `invigilatorDuties`
- `admitCards`
- `marksEntries`
- `gradeRules`
- `resultPublications`
- `reportCards`
- `questionBankItems`
- `onlineTests`
- `testAttempts`
- `testAnswers`

### 9.7 Finance Tables

- `feeHeads`
- `feeStructures`
- `feeInstallments`
- `studentFeeAssignments`
- `feeInvoices`
- `feeInvoiceItems`
- `feePayments`
- `feeReceipts`
- `feeRefunds`
- `concessions`
- `lateFeeRules`
- `chartOfAccounts`
- `ledgerEntries`
- `expenses`
- `vendorBills`
- `bankAccounts`
- `bankReconciliations`
- `donors`
- `donationCampaigns`

### 9.8 HR and Payroll Tables

- `employees`
- `employeeDocuments`
- `jobApplicants`
- `onboardingTasks`
- `salaryStructures`
- `salaryComponents`
- `payrollRuns`
- `payslips`
- `staffAppraisals`
- `trainingEvents`

### 9.9 Communication Tables

- `messageTemplates`
- `messages`
- `messageRecipients`
- `notificationEvents`
- `notices`
- `events`
- `eventRegistrations`
- `ptmSlots`
- `ptmBookings`

### 9.10 Library Tables

- `libraryItems`
- `libraryCopies`
- `libraryBorrowers`
- `libraryIssueTransactions`
- `libraryReservations`
- `libraryFines`
- `digitalResources`

### 9.11 Transport Tables

- `transportRoutes`
- `transportStops`
- `routeStopLinks`
- `vehicles`
- `vehicleDocuments`
- `drivers`
- `conductors`
- `routeAllocations`
- `transportTrips`
- `boardingLogs`
- `transportIncidents`

### 9.12 Hostel and Canteen Tables

- `hostelBuildings`
- `hostelFloors`
- `hostelRooms`
- `hostelBeds`
- `hostelAllotments`
- `hostelVisitors`
- `hostelOutpasses`
- `hostelAttendance`
- `messMenus`
- `mealPlans`
- `canteenTransactions`

### 9.13 Inventory and Assets Tables

- `inventoryCategories`
- `inventoryItems`
- `stockLocations`
- `stockMovements`
- `suppliers`
- `purchaseRequisitions`
- `purchaseOrders`
- `goodsReceipts`
- `assets`
- `assetAssignments`
- `assetMaintenanceTickets`
- `assetDepreciationEntries`

### 9.14 Health and Safety Tables

- `healthProfiles`
- `clinicVisits`
- `medicationLogs`
- `healthScreenings`
- `visitorLogs`
- `gatePasses`
- `securityIncidents`
- `evacuationRollCalls`
- `facilityBookings`
- `facilityMaintenanceTickets`

### 9.15 Activities and Alumni Tables

- `clubs`
- `clubMemberships`
- `sportsTeams`
- `sportsFixtures`
- `activityRegistrations`
- `studentAchievements`
- `alumniProfiles`
- `alumniEvents`
- `mentorships`
- `jobBoardPosts`

### 9.16 CMS, Reports and Integration Tables

- `cmsPages`
- `cmsMedia`
- `forms`
- `formFields`
- `formSubmissions`
- `reportDefinitions`
- `scheduledReports`
- `alerts`
- `integrationConfigs`
- `integrationLogs`
- `webhookEvents`
- `importJobs`
- `exportJobs`
- `auditLogs`
- `documentFiles`

## 10. Example Drizzle Pattern

```ts
// db/schema/foundation.ts
import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const organizations = sqliteTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  status: text("status", { enum: ["active", "suspended", "deactivated"] }).notNull().default("active"),
  logoUrl: text("logo_url"),
  locale: text("locale").notNull().default("en"),
  timezone: text("timezone").notNull().default("Asia/Kolkata"),
  currency: text("currency").notNull().default("INR"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`)
}, (table) => ({
  slugIdx: uniqueIndex("organizations_slug_idx").on(table.slug),
  statusIdx: index("organizations_status_idx").on(table.status)
}));
```

## 11. API and Server Action Design

Prefer server actions for dashboard CRUD. Use API routes when:

- Firebase session exchange is needed.
- Cloudinary signature generation is needed.
- Webhooks are received.
- File exports are streamed.
- External services need REST endpoints.

### 11.1 Server Action Result Type

```ts
export type ActionResult<T> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; code?: string; fieldErrors?: Record<string, string[]> };
```

### 11.2 Mutation Pattern

Every mutation must follow:

1. Parse input with Zod.
2. Resolve current user.
3. Verify permission.
4. Enforce tenant scope.
5. Execute database transaction when needed.
6. Write audit log.
7. Revalidate affected path or cache.
8. Return typed result.

### 11.3 Query Pattern

Every query must follow:

1. Resolve current user.
2. Verify read permission.
3. Apply organization/campus/class/section scope.
4. Apply pagination/search/filter.
5. Return typed rows and pagination metadata.

## 12. Route Matrix

### 12.1 Foundation

- `/dashboard` management dashboard.
- `/organizations`
- `/campuses`
- `/settings/academic-years`
- `/settings/classes`
- `/settings/sections`
- `/settings/subjects`
- `/settings/roles`
- `/settings/permissions`
- `/audit-logs`

### 12.2 Admissions

- `/admissions/enquiries`
- `/admissions/applications`
- `/admissions/tests`
- `/admissions/approvals`
- `/admissions/seat-matrix`
- `/admissions/reports`

### 12.3 Student Lifecycle

- `/students`
- `/students/[id]`
- `/students/[id]/documents`
- `/students/[id]/attendance`
- `/students/[id]/fees`
- `/students/[id]/results`
- `/students/[id]/timeline`
- `/certificates`

### 12.4 Academics

- `/academics/curriculum`
- `/academics/lesson-plans`
- `/academics/teacher-allocation`
- `/academics/timetable`
- `/academics/substitutions`
- `/academics/assignments`
- `/academics/resources`

### 12.5 Attendance

- `/attendance/students`
- `/attendance/staff`
- `/attendance/leave`
- `/attendance/corrections`
- `/attendance/reports`

### 12.6 Exams

- `/exams/planning`
- `/exams/schedules`
- `/exams/marks`
- `/exams/results`
- `/exams/report-cards`
- `/exams/question-bank`
- `/exams/online-tests`

### 12.7 Finance

- `/fees/configuration`
- `/fees/invoices`
- `/fees/payments`
- `/fees/receipts`
- `/fees/refunds`
- `/fees/defaulters`
- `/accounts/ledger`
- `/accounts/expenses`
- `/accounts/reconciliation`
- `/accounts/reports`

### 12.8 HR and Payroll

- `/hr/employees`
- `/hr/recruitment`
- `/hr/documents`
- `/hr/performance`
- `/payroll/structures`
- `/payroll/runs`
- `/payroll/payslips`

### 12.9 Portals

- `/teacher`
- `/parent`
- `/student`

### 12.10 Operations

- `/communication/messages`
- `/communication/notices`
- `/communication/events`
- `/communication/ptm`
- `/library`
- `/transport`
- `/hostel`
- `/canteen`
- `/inventory`
- `/assets`
- `/procurement`
- `/health`
- `/safety`
- `/facilities`
- `/activities`
- `/alumni`
- `/cms`
- `/reports`
- `/analytics`
- `/alerts`
- `/integrations`

## 13. UI Design System

### 13.1 Dashboard Base

Use the selected next-shadcn-admin-dashboard as base inspiration for:

- Sidebar layout.
- Header.
- Theme support.
- Responsive dashboard shell.
- Cards.
- Tables.
- Form pages.
- Dashboard pages.

### 13.2 Tremor Usage

Use Tremor for:

- KPI cards.
- Bar charts.
- Donut charts.
- Area charts.
- Line charts.
- Trend components.
- Analytical tables where appropriate.

### 13.3 UI States

Every major screen must have:

- Loading skeleton.
- Empty state.
- Error state.
- Success toast.
- Validation errors.
- Confirm dialog for destructive actions.
- Responsive layout.
- Dark mode compatibility.

## 14. Upload Design

### 14.1 Upload Flow

1. Client requests signed upload parameters from `/api/uploads/signature`.
2. Server verifies session and permission.
3. Server returns timestamp, signature, folder, cloud name, api key.
4. Client uploads directly to Cloudinary.
5. Client sends returned metadata to server action.
6. Server stores metadata in `documentFiles` or related table.
7. Server writes audit log.

### 14.2 File Metadata

Store:

- `id`
- `organizationId`
- `campusId`
- `entityType`
- `entityId`
- `category`
- `cloudinaryPublicId`
- `secureUrl`
- `resourceType`
- `format`
- `bytes`
- `width`
- `height`
- `version`
- `originalFilename`
- `uploadedBy`
- `expiresAt`
- `accessPolicy`
- `createdAt`

### 14.3 Security Rules

- Do not use unrestricted unsigned uploads for private school documents.
- Generate signatures server-side.
- Restrict folder by organization.
- Validate file type and size before saving metadata.
- Never trust client-supplied URL without verifying expected Cloudinary fields.

## 15. Audit Log Design

Audit log fields:

- `id`
- `organizationId`
- `campusId`
- `actorUserId`
- `actorRole`
- `action`
- `module`
- `entityType`
- `entityId`
- `beforeJson`
- `afterJson`
- `metadataJson`
- `ipAddress`
- `userAgent`
- `createdAt`

Required audited actions:

- create
- update
- delete
- approve
- reject
- export
- import
- login
- upload
- download
- view_sensitive
- collect_payment
- refund_payment
- publish_result

## 16. Notifications Design

Use an internal notification event table and adapters.

### 16.1 Notification Event

Fields:

- `id`
- `organizationId`
- `type`
- `channel`
- `recipientUserId`
- `recipientContact`
- `templateId`
- `payloadJson`
- `status`
- `scheduledAt`
- `sentAt`
- `error`
- `createdAt`

### 16.2 Providers

Create provider interfaces:

```ts
export interface NotificationProvider {
  send(input: NotificationSendInput): Promise<NotificationSendResult>;
}
```

Initial provider boundary:

- Configured email, SMS, and WhatsApp provider adapters
- `InAppNotificationProvider`

## 17. Reporting and Export Design

Reports should be created through query builders and export jobs.

### 17.1 Export Types

- CSV
- Excel
- PDF-ready HTML templates

### 17.2 Export Rules

- Every export checks permission.
- Every export is audited.
- Exports for sensitive data require `reports:export_sensitive`.
- Large exports should create an export job.

## 18. Testing Strategy

### 18.1 Unit Tests

Test:

- Zod schemas.
- Permission checks.
- Scope filters.
- ID generators.
- Late fee calculation.
- Attendance status transitions.
- Marks validation.
- Seat capacity validation.
- Fine calculation.
- Payroll calculation helpers.

### 18.2 Integration Tests

Test:

- Auth guard.
- Server action mutation pattern.
- Student create/edit.
- Attendance marking.
- Fee payment.
- Marks entry.
- Cloudinary signature route with mocked auth.
- Audit log creation.

### 18.3 E2E Tests

Test:

- Login.
- Dashboard load.
- Create organization/campus.
- Create class/section.
- Create student.
- Mark attendance.
- Generate invoice.
- Record payment.
- Enter marks.
- Publish result.
- Parent portal child view.

### 18.4 Test Data

Use seed data:

- One organization.
- Two campuses.
- One active academic year.
- Classes 1-12.
- Sections A/B.
- Subjects.
- Roles.
- Users for each role.
- Students and guardians.
- Fee structures.
- Exam scheme.
- Library items.
- Transport route.

## 19. Performance and Query Design

- Use server-side pagination for lists.
- Index common filters:
  - organizationId
  - campusId
  - academicYearId
  - classId
  - sectionId
  - studentId
  - status
  - createdAt
- Use aggregate queries for dashboards.
- Avoid client-side filtering over huge datasets.
- Avoid N+1 query patterns.
- Create reusable query helpers for scoped lists.

## 20. Error Handling

Create `AppError` with:

- `code`
- `message`
- `status`
- `details`

Common codes:

- `UNAUTHENTICATED`
- `FORBIDDEN`
- `NOT_FOUND`
- `VALIDATION_ERROR`
- `TENANT_SCOPE_ERROR`
- `DUPLICATE_RECORD`
- `CONFLICT`
- `INTEGRATION_ERROR`
- `DATABASE_ERROR`

## 21. Deployment Notes

- Deployable to Vercel or any Next.js-compatible Node hosting.
- Turso database URL/token configured through environment.
- Firebase Admin credentials configured securely.
- Cloudinary credentials configured securely.
- Build command: `pnpm build`.
- Database migration command: `pnpm db:migrate`.
- Provisioning command: `pnpm db:seed:platform-admin` for platform identity setup.

## 22. Technical Acceptance Criteria

The technical implementation is acceptable only when:

- App builds successfully.
- TypeScript strict passes.
- Lint passes.
- Database migrations run.
- Seed data works.
- Auth session works.
- Protected dashboard route cannot be accessed anonymously.
- RBAC blocks unauthorized actions server-side.
- Tenant scope is enforced.
- Signed Cloudinary upload route works.
- Audit log entries are created for mutations.
- Tremor dashboards render.
- shadcn UI shell works.
- Tests pass.
- README explains setup.
