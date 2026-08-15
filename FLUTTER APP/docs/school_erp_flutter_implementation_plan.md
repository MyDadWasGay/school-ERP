# School ERP Flutter Android App — Implementation Plan

## 1. Objective

Build a production-ready Flutter Android application for the existing School ERP platform while reusing the same FastAPI backend already used by the Next.js web application.

The mobile application must be treated as a first-class API client, not as a wrapper around the web application. Business rules, authorization, validation, tenancy, academic-year logic, fee calculations, attendance rules, grading rules, and workflow state transitions should remain enforced by FastAPI so that web and mobile always behave consistently.

### Target architecture

```text
                     ┌────────────────────┐
                     │    Next.js Web     │
                     └─────────┬──────────┘
                               │ HTTPS / JSON
                               │
                     ┌─────────▼──────────┐
                     │      FastAPI       │
                     │ Business Rules +  │
                     │ RBAC + Validation │
                     └─────┬────┬────┬────┘
                           │    │    │
                     Database Redis Storage
                           │
                    Background Workers
                           │
                           ▼
                 Push Notification Service
                           │
                           ▼
                     Firebase Cloud
                       Messaging
                           │
                           ▼
                     Flutter Android
```

The Flutter app communicates directly with FastAPI over HTTPS.

---

# 2. Product Principles

1. **Mobile-first, not web-on-mobile.** Only expose workflows that make sense on a phone. Keep large imports, complex settings, bulk data management, advanced report builders, and infrastructure-level configuration on the web portal.
2. **Permission-driven UI.** Navigation and actions are generated from permissions returned by the API. Roles help determine defaults, but backend permissions remain authoritative.
3. **Fast perceived performance.** Use cached read models, skeleton states, optimistic UI where safe, pagination, prefetching, and minimal blocking transitions.
4. **Single source of business truth.** Flutter must not duplicate business calculations that belong in FastAPI.
5. **Safe offline behavior.** Allow offline reads and carefully selected offline mutations such as classroom attendance. Do not silently perform risky finance or grade mutations offline.
6. **Role-specific simplicity.** A student, parent, teacher, accountant, and principal should not see the same dashboard with hidden buttons. Each receives a purpose-built home experience.
7. **Multi-campus aware.** Every request and screen must respect organization, campus, academic year, and scope permissions.
8. **Audit-sensitive workflows.** Attendance edits, grade changes, payments, approvals, medical records, and security operations should preserve auditability.

---

# 3. Recommended Flutter Technical Stack

## Core UI

- Flutter Material 3
- Custom ERP design tokens layered on top of `ThemeData`
- Avoid depending on a full replacement UI framework for core screens

## State management

- `flutter_riverpod`
- Optional Riverpod code generation if the team is comfortable maintaining generated code

Use Riverpod for:
- authenticated user/session state
- API-backed query state
- permission state
- active child/campus/academic-year context
- notification state
- local draft state
- dependency injection

## Navigation

- `go_router`
- route guards/redirects for authentication and permissions
- nested navigation shells for role-specific bottom navigation
- deep links for notifications

## Networking

- `dio`

Required Dio capabilities:
- base URL configuration
- authorization interceptor
- refresh-token interceptor
- retry rules only where safe
- normalized API errors
- multipart file upload
- progress callbacks for downloads/uploads
- request cancellation
- environment-specific logging

## Secure persistence

- `flutter_secure_storage` for refresh/access credentials or other secrets that must persist securely
- local database/cache for non-secret structured application data

For offline/query persistence, select one after prototyping:
- Drift/SQLite when relational queries, migrations, and predictable schemas are important
- Isar-like local stores only if the project specifically benefits from their object-storage model and current package compatibility has been verified

## Serialization and immutable models

Recommended:
- `freezed`
- `json_serializable`

Generate typed request/response models from stable API contracts where practical.

## Images

- `cached_network_image`

Use for avatars, logos, student photos, teacher photos, and other remote images with placeholders and fallback initials.

## Push notifications

- Firebase Core
- Firebase Cloud Messaging
- local notification package for foreground display when necessary

## Device integrations

As modules require them:
- camera / image picker
- QR/barcode scanning
- file picker
- permission handler
- biometric/local authentication
- URL launcher
- share functionality

Versions should be pinned after compatibility testing against the project's selected Flutter/Dart SDK rather than copied blindly from documentation.

---

# 4. Repository Architecture

Use feature-first clean architecture without overengineering every screen into excessive layers.

```text
lib/
  app/
    app.dart
    bootstrap.dart
    router/
    theme/
    localization/

  core/
    api/
      api_client.dart
      api_error.dart
      auth_interceptor.dart
      endpoints.dart
    auth/
    permissions/
    storage/
    notifications/
    connectivity/
    logging/
    analytics/
    widgets/
    utils/

  features/
    auth/
      data/
      domain/
      presentation/

    dashboard/
    students/
    guardians/
    attendance/
    timetable/
    homework/
    assignments/
    exams/
    grades/
    fees/
    payments/
    leave/
    announcements/
    messages/
    notifications/
    library/
    transport/
    staff/
    admissions/
    approvals/
    hr/
    medical/
    visitors/
    profile/
    settings/

  shared/
    models/
    widgets/
```

Within a feature:

```text
attendance/
  data/
    attendance_api.dart
    attendance_repository.dart
    attendance_local_store.dart
  domain/
    attendance_entry.dart
    attendance_summary.dart
  presentation/
    controllers/
    pages/
    widgets/
```

Do not introduce repository/use-case abstractions mechanically when they add no value. Keep boundaries where they improve testability, offline synchronization, or business complexity.

---

# 5. Backend/API Readiness Audit

Before building screens, audit existing FastAPI endpoints used by Next.js.

Create an API inventory containing:

- endpoint
- HTTP method
- request DTO
- response DTO
- role/permission requirement
- organization/campus scope
- pagination behavior
- filtering/search support
- file handling
- caching eligibility
- audit requirements
- whether mobile-specific API changes are required

## Critical APIs to confirm

### Authentication
- login
- refresh token
- logout/revoke
- forgot/reset password
- `/me`
- active sessions/devices, if supported

Recommended `/me` response shape:

```json
{
  "id": "user-id",
  "organizationId": "org-id",
  "campusId": "campus-id",
  "roles": ["TEACHER"],
  "permissions": [
    "attendance.read",
    "attendance.create",
    "assignment.create",
    "grade.create"
  ],
  "profile": {},
  "availableCampuses": [],
  "activeAcademicYear": {}
}
```

### Shared mobile APIs
- dashboard summary
- notifications
- announcements
- timetable
- profile
- documents/files
- global/search endpoints where permitted

### Student/Parent
- attendance
- homework/assignments
- grades/results/report cards
- fee balance/history
- leave requests
- transport
- library

### Teacher
- assigned classes/sections
- class roster
- attendance take/edit
- assignments/homework CRUD
- submissions and grading
- exam/marks entry
- teacher timetable

### Administration
- student search/profile
- staff search/profile
- approvals
- admissions pipeline
- monitoring summaries

---

# 6. Authentication and Session Implementation

## Login flow

```text
Launch
  ↓
Read secure session
  ↓
Valid access token? ── yes ──> GET /me
  │
  no
  ↓
Refresh token available?
  │ yes
  ↓
POST refresh
  ↓
GET /me
  ↓
Build permission-aware app shell
```

## Requirements

- Never store credentials in plaintext preferences.
- Access tokens should be short-lived.
- Refresh tokens should be revocable.
- Handle simultaneous expired requests without triggering multiple refresh requests.
- If refresh fails, clear session and return to login.
- Preserve intended deep link and continue after reauthentication where safe.
- Backend remains authoritative even when the UI hides unauthorized actions.

---

# 7. Permission Model

Use capability-based checks rather than hardcoding behavior purely by role.

Examples:

```text
student.read
student.update
attendance.read
attendance.create
attendance.correct
assignment.create
grade.create
grade.finalize
fee.read
payment.create
leave.approve
admission.review
medical.read
transport.manage
```

Flutter helper concept:

```dart
context.permissions.can('attendance.create')
```

This controls rendering only. FastAPI must independently authorize the request.

Role-specific navigation is built from available capabilities.

---

# 8. App Shell and Navigation

## Student

```text
Home | Academics | Tasks | Fees | More
```

## Parent

```text
Home | Children | Academics | Payments | More
```

## Teacher

```text
Home | Classes | Attendance | Tasks | More
```

## Admin/Principal

```text
Dashboard | People | Approvals | Insights | More
```

Use nested navigation so each tab keeps its own navigation history.

Notifications must deep-link into relevant content, for example:

```text
Notification: "New Mathematics assignment"
  → Assignment details
```

or

```text
Notification: "Leave request requires approval"
  → Approval detail
```

---

# 9. Phase-by-Phase Implementation

## Phase 0 — Discovery and API Contract Stabilization

### Deliverables

- role matrix
- permission matrix
- current FastAPI endpoint inventory
- API gaps list
- mobile navigation map
- design tokens
- Flutter repository baseline
- environment configuration
- CI quality checks

### Acceptance criteria

- Each mobile feature maps to an existing or planned FastAPI endpoint.
- Authentication/token strategy is documented.
- Organization/campus isolation is validated.
- No critical screen depends on undocumented backend behavior.

---

## Phase 1 — Application Foundation

Implement:

- Flutter project structure
- Material 3 theme
- light/dark theme support if required
- Dio client
- Riverpod foundation
- go_router
- authentication
- refresh-token behavior
- secure storage
- API error normalization
- role/permission loading
- application shell
- profile
- app settings
- logout
- connectivity state
- common loading/error/empty states

### Acceptance criteria

- Returning users can restore sessions securely.
- Expired access tokens refresh correctly.
- Unauthorized routes are blocked.
- The app can recover from temporary network failure.
- All major shared UI components use centralized tokens.

---

## Phase 2 — Shared Mobile Features

Implement:

- notification center
- push notification registration
- announcements
- timetable
- academic calendar
- file/document viewer
- universal search where permissions allow
- dashboard framework

### Notification backend work

Store device registrations by:

- user ID
- device ID
- FCM token
- platform
- last seen
- active/revoked state

Do not rely only on push delivery. Persist important notifications server-side for the in-app notification center.

---

## Phase 3 — Student Experience

### Home dashboard

Cards/widgets:
- today's classes
- attendance percentage
- pending assignments
- upcoming exams
- recent results
- outstanding fees
- announcements
- upcoming events

### Academics
- timetable
- subjects
- teachers
- academic resources
- homework
- assignment details/submission

### Attendance
- daily status
- monthly calendar
- statistics
- absence history

### Exams/results
- exam schedule
- results
- grades
- report cards
- remarks

### Fees
- fee structure
- payment history
- outstanding balance
- receipts
- online payment initiation where supported

### Other modules
- leave requests
- library
- transport
- profile

---

## Phase 4 — Parent / Guardian Experience

Build on the student feature set using child context.

### Mandatory child switcher

Parent can switch between linked students without signing out.

Active child becomes part of relevant query keys so cached data never leaks between children.

### Parent features
- child overview
- attendance alerts
- homework status
- grades/results
- report cards
- fees/payments/receipts
- leave request creation
- teacher/school communication
- transport status
- child documents

### High-priority push events
- absent/late
- assignment created/due
- result published
- payment due
- payment successful
- leave approved/rejected
- urgent announcement
- transport delay

---

## Phase 5 — Teacher Experience

### Teacher dashboard
- today's classes
- next period
- pending attendance
- submissions to review
- upcoming exams
- quick actions

### Attendance taking

UX requirements:
- load roster quickly
- default all to present where school policy permits
- tap exceptions
- status choices: present, absent, late, excused
- optional remark
- save locally as draft
- submit
- clear sync status

Offline attendance requires:
- locally cached class roster
- local mutation queue
- idempotency key
- conflict handling
- server reconciliation
- visible unsynced state

### Assignments/homework
- create
- edit before lock/due policy
- attach resources
- see submission counts
- inspect submissions
- grade/comment

### Grades/exams
- marks entry
- max-mark validation
- absent state
- draft submission
- finalization
- explicit confirmation before finalization
- server-controlled edit rules after finalization

### Other
- timetable
- class/student view
- leave request
- announcements/messages according to permissions

---

## Phase 6 — Admin, Principal and Organization Owner

Focus mobile on decisions and monitoring.

### Dashboard
- enrollment
- student attendance
- staff attendance
- pending admissions
- pending approvals
- collection today/month
- outstanding fees
- alerts
- upcoming events

### People
- student search
- student profile
- guardian/contact information
- staff search
- staff profile

### Unified approvals inbox

Possible items:
- staff leave
- student leave
- admissions
- fee discounts
- purchase/workflow requests where ERP supports them

Each item includes:
- request type
- requester
- submitted time
- important context
- attachments
- audit history
- approve/reject/request changes actions

### Campus switcher

Organization-level users can select:
- all campuses where aggregation is valid
- one campus

Backend permissions and aggregation rules must enforce scope.

---

## Phase 7 — Finance / Accountant

Implement:

- finance summary
- student fee search
- balance
- fee breakdown
- transaction history
- overdue list
- receipt view/share
- record payment if business policy allows mobile entry

Payment creation must use server-generated transaction identifiers and idempotency protection.

Avoid offline payment mutations.

---

## Phase 8 — HR / Staff

### Staff self-service
- profile
- attendance
- leave balances
- leave application
- payroll summary
- payslips
- announcements

### HR
- staff directory
- attendance monitoring
- leave approvals
- staff documents
- contract summaries

Sensitive payroll data requires explicit permissions and privacy-safe screen behavior.

---

## Phase 9 — Specialized Operational Roles

### Reception
- student/guardian search
- visitor registration
- late entry
- student checkout
- pickup authorization
- emergency contacts

### Library
- barcode scan
- issue/return/renew
- member history
- overdue/fines
- catalog search

### Transport manager
- routes
- buses
- assigned students
- pickup/drop stops
- driver contacts
- route alerts

### Driver/attendant
- assigned route only
- boarded/absent/dropped status
- route stops
- emergency action

### Nurse
- medical profile
- allergies
- conditions
- medication
- visit log
- incidents
- emergency contacts

### Security
- identity lookup
- visitor check-in/out
- pickup verification
- gate-pass handling
- QR scanning

---

# 10. Offline Strategy

Use offline support selectively.

## Cacheable read data

- profile
- timetable
- announcements
- class roster
- selected student summary
- recent homework
- previously opened documents metadata

## Allowed offline drafts/mutations

Good candidate:
- classroom attendance

Possible later:
- teacher notes
- assignment drafts

Avoid by default:
- payment creation
- fee adjustments
- finalized grades
- approval decisions
- medical record changes
- security checkout events unless a carefully designed reconciliation model exists

Every offline mutation record should contain:

```text
localOperationId
entityId
operationType
payload
createdAt
authenticatedUserId
organizationId
campusId
syncStatus
retryCount
lastError
```

Use server-side idempotency to prevent duplicate submission.

---

# 11. Push Notification Architecture

```text
Domain event in FastAPI
       ↓
Notification policy
       ↓
Persist notification
       ↓
Queue push job
       ↓
FCM
       ↓
Android device
       ↓
Deep link to app destination
```

Create notification categories such as:

- ATTENDANCE_ABSENT
- ATTENDANCE_LATE
- ASSIGNMENT_CREATED
- ASSIGNMENT_DUE
- RESULT_PUBLISHED
- FEE_DUE
- PAYMENT_RECEIVED
- LEAVE_APPROVED
- LEAVE_REJECTED
- ANNOUNCEMENT
- TRANSPORT_ALERT
- EMERGENCY

Allow notification preferences only when policy permits. Emergency/system-critical notifications may not be user-disableable in-app depending on school policy and platform rules.

---

# 12. Error Handling Standard

Normalize backend errors into predictable categories:

```text
unauthenticated
forbidden
validation
notFound
conflict
rateLimited
networkUnavailable
timeout
serverFailure
unknown
```

UI behavior:

- validation → inline field errors
- forbidden → explain missing access, not generic failure
- conflict → refresh or show reconciliation UI
- network unavailable → cached content + offline indicator where possible
- server failure → retry action

Never expose raw server stack traces to users.

---

# 13. Performance Requirements

Design toward:

- no full-screen loader for every tab revisit
- cached previously loaded content
- pagination for large lists
- debounced server search
- cancel stale requests
- lazy-load tab content
- prefetch likely next data
- resize/compress image uploads
- use thumbnails rather than full-size files in lists
- avoid rebuilding entire dashboard for one card update
- use stable keys and granular providers

Measure:
- cold start
- warm start
- login-to-dashboard
- tab-switch latency
- API response times
- frame rendering/jank
- crash-free sessions

---

# 14. Security Requirements

- HTTPS only in production
- secure token storage
- backend RBAC on every protected operation
- organization/campus isolation
- avoid logging tokens or sensitive payloads
- redact medical/payroll/financial details from diagnostics
- Android screenshot protection on highly sensitive screens if policy requires it
- automatic session revocation support
- file authorization through protected URLs or signed URLs
- upload validation on server
- audit trail for critical mutations
- dependency/security scanning in CI

Do not implement certificate pinning automatically unless the team has an operational strategy for certificate rotation and outage recovery.

---

# 15. Testing Plan

## Unit tests
- model parsing
- permission evaluation
- API error mapping
- token refresh orchestration
- sync state machine
- data transformations

## Widget tests
- dashboard cards
- attendance roster interactions
- forms/validation
- permission-hidden actions
- empty/loading/error states

## Integration tests
- login
- token refresh
- parent child switching
- teacher attendance submission
- assignment creation
- result viewing
- fee receipt viewing
- leave workflow
- notification deep link

## Backend contract tests
Verify Flutter's assumed request/response payloads against FastAPI schemas.

## Security tests
- cross-campus access attempts
- unauthorized endpoint use
- revoked session
- stale refresh token
- IDOR checks
- protected file access

---

# 16. CI/CD Plan

CI should run:

```text
flutter pub get
flutter analyze
flutter test
format verification
code generation verification if used
Android debug/release build
```

Recommended environments:

- development
- staging/UAT
- production

Each environment gets:
- independent API URL
- independent Firebase project/configuration where practical
- distinct app label/icon treatment for internal builds

Release process:

```text
feature branch
  ↓
PR checks
  ↓
staging build
  ↓
UAT with school users
  ↓
release candidate
  ↓
production signing
  ↓
Play Console staged rollout
```

---

# 17. Analytics and Observability

Track operational product metrics without leaking sensitive school data.

Examples:
- login success/failure category
- screen load duration
- attendance submission success
- API error category
- notification open/deep-link success
- crash information

Do not send student names, grades, medical details, financial details, tokens, or sensitive free-text to analytics/crash systems unless the organization has explicitly reviewed the data handling.

---

# 18. Definition of Done for Every Feature

A feature is not complete until:

- API contract is documented
- authorization is enforced server-side
- loading state exists
- empty state exists
- error state exists
- retry behavior exists where applicable
- accessibility labels exist
- permissions are handled
- analytics/observability is appropriate
- unit/widget tests cover important logic
- dark/light themes are verified if both are enabled
- small and large Android screen layouts are tested
- slow/network-loss behavior is tested
- sensitive data exposure has been reviewed

---

# 19. Suggested Development Order

```text
1. API audit + permissions
2. Flutter foundation
3. Authentication/session
4. App shell/navigation
5. Notifications + announcements + timetable
6. Student experience
7. Parent experience
8. Teacher experience
9. Admin/principal
10. Finance
11. HR/staff
12. Library/reception/transport/security/medical
13. Offline attendance
14. QR/barcode workflows
15. Advanced polish, analytics and performance tuning
```

Student/parent/teacher should be prioritized because they produce the highest everyday mobile usage in most school environments.

---

# 20. Initial Engineering Backlog

## Epic: Mobile Foundation
- Create Flutter project
- Configure environments
- Configure Material 3 theme
- Configure Riverpod
- Configure Dio
- Configure go_router
- Create API error model
- Implement secure session store
- Implement login
- Implement refresh token locking
- Implement `/me`
- Implement permission service
- Build role-aware navigation shell

## Epic: Shared Experience
- Profile
- Announcements
- Notifications
- FCM registration
- Timetable
- Document viewer
- Common search

## Epic: Student
- Student dashboard
- Attendance
- Homework
- Assignments
- Exams
- Results/report cards
- Fees
- Leave
- Library
- Transport

## Epic: Parent
- Child switcher
- Child dashboard
- Attendance
- Assignments
- Results
- Fees/payments
- Leave
- Communication
- Transport notifications

## Epic: Teacher
- Teacher dashboard
- My classes
- Class roster
- Take attendance
- Attendance offline draft/sync
- Create homework
- Create assignment
- Submission review
- Marks entry
- Timetable
- Leave

## Epic: Management
- Admin dashboard
- Principal dashboard
- Campus switcher
- Student/staff search
- Unified approvals
- Admission pipeline summary
- Finance summary

---

# 21. Final Architectural Rule

The mobile app owns presentation, local interaction state, caching, device integration, and carefully defined offline behavior.

FastAPI owns authorization, tenancy, validation, business rules, workflow transitions, calculations, canonical records, audit decisions, and data integrity.

That boundary should remain consistent throughout implementation.
