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

The emulator reaches the host API through `http://10.0.2.2:3001/api/v1`. For a physical device, set `ERP_API_BASE_URL` to the reachable Fastify API origin or its full `/api/v1` URL; do not use the Next.js web host. The app adds `/api/v1` when only an origin is supplied, but the recommended production value is the complete URL, for example `https://api.example.com/api/v1`. Production configuration is rejected unless the API URL uses HTTPS.

## Android package, signing, and installation

The Android application ID (package name) is `com.thinkschool.app`.
Keep it unchanged when configuring Firebase or updating an installed build; it
is the identity Android uses to install and update this app.

Release builds use an upload keystore. The keystore and `android/key.properties`
are intentionally ignored by Git.

If the local upload keystore has not been created yet, use a Java 17 `keytool`
and keep the resulting file in a private backup location:

```powershell
$env:JAVA_HOME = 'C:\Program Files\ojdkbuild\java-17-openjdk-17.0.3.0.6-1'
& "$env:JAVA_HOME\bin\keytool.exe" -genkeypair -v `
  -keystore android/app/upload-keystore.jks `
  -storetype JKS `
  -keyalg RSA `
  -keysize 2048 `
  -validity 10000 `
  -alias school-erp-upload
```

Copy `android/key.properties.example` to `android/key.properties` and fill in
the keystore and key passwords. For the documented layout, keep
`storeFile=upload-keystore.jks`; that path is relative to `android/app`.

With `config/app_config.local.json` populated, build and install the signed
APK on a connected device or emulator:

```powershell
$env:JAVA_HOME = 'C:\Program Files\ojdkbuild\java-17-openjdk-17.0.3.0.6-1'
flutter clean
flutter pub get
flutter build apk --release --dart-define-from-file=config/app_config.local.json
adb install -r build/app/outputs/flutter-apk/app-release.apk
```

If a debug-signed copy is already installed, uninstall that development copy
once before installing the release-signed APK; do not uninstall a production
install unless its local data can be discarded.

The Play Store artifact is an app bundle:

```powershell
flutter build appbundle --release --dart-define-from-file=config/app_config.local.json
```

It is written to `build/app/outputs/bundle/release/app-release.aab`. Back up
the upload keystore and both passwords; losing them prevents future updates
signed with the same upload identity.

## GitHub Actions Android artifacts

`.github/workflows/flutter-android.yml` runs Flutter checks on pull requests
and creates signed release artifacts on pushes to `main`, `v*` tags, or a
manual dispatch. The signed release job uses the GitHub `Production`
environment. Add these environment secrets under
Repository Settings -> Environments -> Production before running a release
build:

- `ANDROID_KEYSTORE_BASE64`: base64 of `android/app/upload-keystore.jks`.
- `ANDROID_KEYSTORE_PASSWORD`: keystore password.
- `ANDROID_KEY_ALIAS`: `school-erp-upload` (or the alias you chose).
- `ANDROID_KEY_PASSWORD`: private-key password.

The release job also requires these `Production` environment Variables so the
installed app has its production runtime configuration:

- `ERP_API_BASE_URL` (must point to the Fastify API; use an HTTPS URL ending in `/api/v1`, for example `https://api.example.com/api/v1`).
- `ERP_FIREBASE_API_KEY`.
- `ERP_FIREBASE_APP_ID`.
- `ERP_FIREBASE_MESSAGING_SENDER_ID`.
- `ERP_FIREBASE_PROJECT_ID`.

The workflow exposes the APK and AAB under the same GitHub Actions artifact,
along with SHA-256 checksums. Pull requests intentionally do not use signing
secrets; they run an unsigned/debug Android build plus the Flutter checks.

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
