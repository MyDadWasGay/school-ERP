# School ERP Android app

This Flutter app is an Android client of the same Fastify `/api/v1` service used by the Next.js web frontend. Firebase provides identity; the API remains authoritative for roles, permissions, organization scope, campus scope, student access, and business rules.

## Local setup

1. Start the shared API from the repository root:

   ```powershell
   npm.cmd run api:dev
   ```

2. Copy `config/app_config.example.json` to `config/app_config.local.json` and fill in the public Firebase Android application identifiers. The local file is ignored by Git. Do not place Firebase Admin credentials, database tokens, signing passwords, or other server secrets here.

3. Start an Android emulator and run:

   ```powershell
   flutter run --dart-define-from-file=config/app_config.local.json
   ```

Use a 64-bit Java 17 JDK for Gradle. On this workstation the verified JDK is
`C:\Program Files\ojdkbuild\java-17-openjdk-17.0.3.0.6-1`; set `JAVA_HOME` to
that directory before Android builds if the shell defaults to the 32-bit Java 8
runtime.

The emulator reaches the host API through `http://10.0.2.2:3001/api/v1`. For a physical device, set `ERP_API_BASE_URL` to an HTTPS staging URL or a reachable development host. Production configuration is rejected unless the API URL uses HTTPS.

## Verification

```powershell
dart format --output=none --set-exit-if-changed lib test
flutter analyze
flutter test
flutter build apk --debug --dart-define-from-file=config/app_config.local.json
```

The app intentionally has no iOS project. Firebase ID tokens are sent as `Authorization: Bearer`, and an authorized active campus is sent as `X-Campus-Id`.

## Implemented mobile workflows

- Role-aware dashboards for student, parent, teacher, and staff accounts.
- Student/parent attendance, results, fees, linked-child switching, and scoped document metadata with secure-link copy.
- Published announcements and role-targeted messages, notification center, timetable records, assignment list, and leave request/status workflows.
- Teacher attendance for assigned students (date selection, search, status selection, save, mark-all-present, and scoped offline draft/sync) and assignment creation with server-validated class, subject, teacher, and due date.
- Exam results and planning, marks entry, server-controlled workflow transitions, and result publication for authorized staff.
- Admissions approvals, application creation/review, seat capacity, follow-ups, assessments, front-desk enquiries, permission-scoped student/staff search, and student profile history/actions.
- Finance invoices, payment collection with idempotency keys, refunds, fee setup, accounting ledger/expenses/donations, HR/payroll runs and payslips, and staff attendance.
- Student create/edit, guardian/enrollment actions, sensitive medical updates, and certificate issuance where the API permission allows them.
- Librarian catalogue/copy/resource, issue/renew/return, and reservation actions; transport-manager route, vehicle, document, stop, and allocation workspaces.
- Asset register/assignments/maintenance/depreciation plus inventory, procurement, facilities, hostel, and canteen back-office workflows.
- Campus, academic setup, and scoped user access administration; exam planning, question bank, and report-card generation.
- Campus switching, Firebase session restoration, mobile logout/revocation, loading/empty/error/retry states, and responsive Material 3 navigation.

The API calls above are shared with the web application; Flutter does not maintain a second business-rule or authorization implementation. Assignment visibility, notice audience/status, student links, teacher class scope, and campus scope are enforced by Fastify.
