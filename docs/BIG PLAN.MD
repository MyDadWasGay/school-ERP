# Production-Grade School ERP Platform Administration, Multi-Tenant Access Control, Role Dashboards, and System Completion

## 1. Mission

Upgrade the existing School ERP into a secure, production-ready, multi-tenant SaaS platform that can be deployed and operated for multiple schools.

The implementation must introduce:

1. A dedicated global platform administration system.
2. Secure organization-level administration for each school.
3. Individual accounts and role-specific dashboards for teachers, students, parents, guardians, administrators, and staff.
4. Strict tenant isolation across all application layers.
5. Complete account provisioning and onboarding workflows.
6. Production-quality UI and accessibility improvements.
7. Completion or removal of unfinished functionality.
8. Operational controls for deployment, monitoring, backups, auditing, security, and maintenance.
9. Automated tests for all critical authentication, authorization, tenancy, and business workflows.
10. Clear technical documentation for developers and operators.

This is not a prototype, proof of concept, mockup, or demonstration build.

Do not use temporary workarounds, hardcoded credentials, fake data, placeholder APIs, incomplete buttons, insecure authentication shortcuts, or frontend-only permission checks.

Every implemented feature must be suitable for real users and real school data.

---

# 2. Non-Negotiable Production Standards

All implementation decisions must satisfy the following principles:

* Security by default.
* Deny access by default.
* Strict multi-tenant data isolation.
* Server-side authorization for every privileged operation.
* No plaintext credentials or secrets.
* No hidden or undocumented administrative backdoors.
* No hardcoded production configuration.
* No reliance on UI visibility for security.
* No cross-tenant data leakage.
* No destructive database changes without migration and rollback planning.
* No incomplete features presented as finished.
* No mocked production workflows.
* No unhandled exceptions in critical paths.
* No suppression of type, build, lint, or test failures without documented justification.
* No assumption that frontend input is trusted.
* No direct exposure of sensitive internal errors to users.
* No unrestricted platform-admin impersonation.
* No permanent deletion without explicit authorization and retention-policy checks.

Where existing code conflicts with these standards, refactor the affected area rather than preserving unsafe behavior.

---

# 3. Required Repository Audit

Before modifying code, inspect the complete repository.

Document the current:

* Frontend framework and version.
* Backend framework and version.
* Package manager.
* Runtime version.
* Database engine.
* ORM or query layer.
* Migration system.
* Authentication mechanism.
* Session or token strategy.
* User, role, permission, organization, and school models.
* API architecture.
* Existing tenant-scoping logic.
* Middleware.
* Route guards.
* Background-job system.
* File-storage mechanism.
* Email and SMS providers.
* Logging system.
* Monitoring system.
* Error-reporting system.
* Test framework.
* CI/CD configuration.
* Containerization setup.
* Environment-variable handling.
* UI component system.
* Styling system.
* Existing dashboards.
* Existing school-management features.
* Existing account-provisioning flows.
* Existing data import and export tools.

Search the repository for:

```text
TODO
FIXME
HACK
TEMP
mock
placeholder
not implemented
coming soon
hardcoded
console.log
debugger
throw new Error
disabled
sample data
fake data
```

Also inspect for:

* Empty handlers.
* Buttons without working actions.
* Forms that do not submit.
* Static dashboard metrics.
* Unprotected endpoints.
* Missing authorization.
* Missing tenant filters.
* Direct database access from controllers.
* Duplicate role checks.
* Weak password handling.
* Exposed secrets.
* Insecure reset flows.
* Broken routes.
* Dead links.
* Unhandled promise rejections.
* Failing tests.
* Build warnings.
* Type errors.
* Runtime warnings.
* Browser console errors.
* Database queries without pagination.
* N+1 queries.
* Missing database indexes.
* Cross-tenant foreign-key risks.

Produce an implementation plan based on the actual architecture.

Do not assume technologies or generate unrelated boilerplate.

---

# 4. Existing Platform Limitation

The current system requires every user to have an `organizationId`, meaning every account belongs to a specific school.

As a result, the application has no true global administrator who can manage the platform across schools.

Global administrative operations currently require infrastructure-level or database-level intervention.

This must be replaced with a secure platform-administration domain that supports authorized platform operations without weakening school-level tenant boundaries.

---

# 5. Identity and Administrative Domains

Separate platform-level identities from school-scoped identities conceptually and technically.

## 5.1 Platform Administrator

Introduce the role:

```ts
PLATFORM_ADMIN
```

A platform administrator manages the SaaS platform itself.

A platform administrator must not be treated as a normal school user.

## 5.2 School-Scoped Roles

Support at least:

```ts
SCHOOL_ADMIN
TEACHER
STUDENT
PARENT
STAFF
```

Preserve additional existing roles if they are valid.

All school-scoped users must belong to exactly one organization unless the current business model explicitly supports multi-school employment.

Do not introduce cross-school access casually.

If users may belong to multiple schools in the future, use a membership model rather than duplicating identity records.

Example:

```ts
User
Organization
OrganizationMembership
Role
Permission
```

A membership-based model is preferred when one identity may have access to multiple organizations.

---

# 6. Platform Administrator Data Model

Choose the safest architecture after inspecting the current system.

## Option A: Nullable Organization Ownership

Allow `organizationId` to be nullable only for platform-level accounts.

Rules:

* `PLATFORM_ADMIN` must have `organizationId = null`.
* Every school role must have a valid organization membership.
* Database constraints must prevent invalid role and organization combinations.
* Platform APIs must require explicit platform authorization.
* School APIs must require a verified organization context.

## Option B: Separate Platform Identity Model

Create a separate platform identity table when this provides stronger separation or avoids unsafe changes to the school-user model.

Example:

```ts
PlatformAdministrator
PlatformSession
PlatformRole
PlatformAuditLog
```

## Option C: Unified Identity with Memberships

Use a shared identity table plus separate platform permissions and organization memberships.

Example:

```ts
User
PlatformMembership
OrganizationMembership
```

Prefer this when the application needs one identity to hold both platform and organization access.

## Selection Requirements

The chosen model must:

* Enforce valid ownership at the database level where possible.
* Avoid creating a fake “global school.”
* Avoid special IDs such as `organizationId = 0`.
* Avoid role-name checks scattered throughout the code.
* Support future maintenance.
* Support auditability.
* Avoid ambiguous user scope.
* Prevent privilege escalation.

Document why the selected model is safer for the existing architecture.

---

# 7. Authentication Architecture

Implement production-grade authentication for both platform and school users.

Requirements:

* Strong password hashing using Argon2id or an appropriately configured bcrypt implementation.
* Unique password salts.
* Password-strength requirements.
* Secure account-recovery workflow.
* Expiring password-reset tokens.
* Single-use reset tokens.
* Expiring invitation tokens.
* Session invalidation after password changes.
* Session invalidation after account suspension.
* Session invalidation after role or permission changes when necessary.
* Rate limiting.
* Brute-force protection.
* Login-attempt monitoring.
* Secure cookie configuration where cookie sessions are used.
* CSRF protection where applicable.
* Refresh-token rotation where token authentication is used.
* Token revocation support.
* Device or session management where feasible.
* Email verification.
* Account-status validation during every authentication cycle.
* Organization-status validation for school users.
* Optional MFA architecture for privileged users.
* Mandatory MFA readiness for platform administrators.

Do not expose whether a particular email address exists during password recovery.

Use generic responses such as:

```text
If an eligible account exists, recovery instructions have been sent.
```

---

# 8. Authorization Architecture

Use centralized role-based and permission-based authorization.

Do not place authorization logic only inside frontend components.

Authorization must exist at:

* Route middleware.
* API handlers.
* Controllers.
* Service layer.
* Repository or database access layer.
* Background jobs.
* File-download handlers.
* Export functions.
* WebSocket or real-time channels.
* Administrative actions.

Use a default-deny policy.

Example roles:

```ts
enum UserRole {
  PLATFORM_ADMIN = "PLATFORM_ADMIN",
  SCHOOL_ADMIN = "SCHOOL_ADMIN",
  TEACHER = "TEACHER",
  STUDENT = "STUDENT",
  PARENT = "PARENT",
  STAFF = "STAFF"
}
```

Example permissions:

```ts
enum Permission {
  ORGANIZATION_CREATE = "ORGANIZATION_CREATE",
  ORGANIZATION_VIEW = "ORGANIZATION_VIEW",
  ORGANIZATION_UPDATE = "ORGANIZATION_UPDATE",
  ORGANIZATION_SUSPEND = "ORGANIZATION_SUSPEND",
  ORGANIZATION_ARCHIVE = "ORGANIZATION_ARCHIVE",
  ORGANIZATION_DELETE = "ORGANIZATION_DELETE",

  USER_CREATE = "USER_CREATE",
  USER_VIEW = "USER_VIEW",
  USER_UPDATE = "USER_UPDATE",
  USER_DISABLE = "USER_DISABLE",
  USER_RESET_PASSWORD = "USER_RESET_PASSWORD",

  STUDENT_VIEW = "STUDENT_VIEW",
  STUDENT_MANAGE = "STUDENT_MANAGE",
  TEACHER_VIEW = "TEACHER_VIEW",
  TEACHER_MANAGE = "TEACHER_MANAGE",

  ATTENDANCE_VIEW = "ATTENDANCE_VIEW",
  ATTENDANCE_MARK = "ATTENDANCE_MARK",

  FEES_VIEW = "FEES_VIEW",
  FEES_MANAGE = "FEES_MANAGE",

  EXAMS_VIEW = "EXAMS_VIEW",
  EXAMS_MANAGE = "EXAMS_MANAGE",

  INTEGRATIONS_VIEW = "INTEGRATIONS_VIEW",
  INTEGRATIONS_MANAGE = "INTEGRATIONS_MANAGE",

  AUDIT_LOG_VIEW = "AUDIT_LOG_VIEW"
}
```

Use policy functions such as:

```ts
canManageUser(actor, target)
canAccessStudent(actor, student)
canManageOrganization(actor, organization)
canViewFinancialRecord(actor, record)
```

Avoid duplicated inline expressions such as:

```ts
if (user.role === "ADMIN")
```

when the operation requires more detailed permission and ownership checks.

---

# 9. Multi-Tenant Isolation

Tenant isolation is a critical security boundary.

Every school-owned entity must have a verified organization relationship.

Review at least:

* Users.
* Memberships.
* Teachers.
* Students.
* Parents.
* Guardians.
* Classes.
* Sections.
* Subjects.
* Academic years.
* Attendance.
* Assignments.
* Submissions.
* Exams.
* Results.
* Grades.
* Fee structures.
* Invoices.
* Payments.
* Payroll.
* Leave.
* Timetables.
* Announcements.
* Messages.
* Documents.
* Library records.
* Inventory.
* Transport.
* Admissions.
* Staff records.
* Notifications.
* Audit logs.

Requirements:

* Every school-scoped read must include a verified tenant scope.
* Every school-scoped write must derive tenant scope from the authenticated context.
* Client-provided `organizationId` must never determine authorization.
* Cross-tenant joins must be rejected.
* Cross-tenant foreign-key relationships must be prevented.
* Unique constraints must be tenant-aware.
* Exports must be tenant-scoped.
* Bulk imports must be tenant-scoped.
* File paths or object-storage keys must be tenant-isolated.
* Cache keys must include tenant identity.
* Job payloads must include validated tenant context.
* Logs must include tenant metadata without exposing sensitive data.
* Search indexes must maintain tenant boundaries.
* Real-time subscriptions must enforce tenant access.

Prefer centralized enforcement through one or more of:

* Request-scoped tenant context.
* Repository abstractions.
* ORM middleware.
* Query builders that require tenant scope.
* Database row-level security.
* Database policies.
* Tenant-aware service methods.

Do not depend solely on developers remembering to add:

```ts
where: { organizationId }
```

to every query.

Add automated tests that intentionally attempt cross-tenant access.

---

# 10. Platform Administration Portal

Create a dedicated platform administration area.

Suggested routes:

```text
/platform/login
/platform
/platform/organizations
/platform/organizations/:organizationId
/platform/integrations
/platform/features
/platform/audit-logs
/platform/system-health
/platform/settings
```

Platform routes must be isolated from school routes.

## 10.1 Platform Overview

Display accurate, server-derived metrics:

* Total organizations.
* Active organizations.
* Suspended organizations.
* Archived organizations.
* Total users.
* Active users.
* Teachers.
* Students.
* Parents.
* Staff.
* Recent organization creation.
* Failed integration jobs.
* Authentication anomalies.
* Background-job failures.
* Storage usage where supported.
* Email and SMS delivery status.
* System-health alerts.

Do not calculate production metrics from unbounded frontend queries.

Use aggregate queries, reporting tables, or background-generated summaries where appropriate.

---

# 11. School Lifecycle Management

The platform administrator must be able to:

* Create a school.
* Configure its initial settings.
* Create or invite its first school administrator.
* View school details.
* Update school details.
* Activate a school.
* Suspend a school.
* Archive a school.
* Restore an archived school where policy allows.
* Schedule permanent deletion.
* Cancel scheduled deletion.
* Review deletion impact.
* Manage enabled modules.
* Manage subscription or plan settings.
* Review integration status.
* Review recent activity.
* Review storage or usage information.
* Review user counts.
* Review audit history.

Suggested school fields:

* Display name.
* Legal name.
* Unique slug.
* Internal code.
* Status.
* Primary email.
* Primary phone.
* Address.
* Country.
* Time zone.
* Locale.
* Currency.
* Academic-year settings.
* Subscription plan.
* Enabled modules.
* Branding.
* Logo.
* Data-retention policy.
* Created timestamp.
* Updated timestamp.
* Last active timestamp.
* Suspension reason.
* Archive timestamp.
* Deletion-scheduled timestamp.

## School Statuses

Use explicit statuses:

```ts
enum OrganizationStatus {
  PROVISIONING = "PROVISIONING",
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  ARCHIVED = "ARCHIVED",
  DELETION_SCHEDULED = "DELETION_SCHEDULED"
}
```

Define permitted transitions.

For example:

```text
PROVISIONING -> ACTIVE
ACTIVE -> SUSPENDED
SUSPENDED -> ACTIVE
ACTIVE -> ARCHIVED
SUSPENDED -> ARCHIVED
ARCHIVED -> ACTIVE
ARCHIVED -> DELETION_SCHEDULED
DELETION_SCHEDULED -> ARCHIVED
```

Do not allow arbitrary status changes.

---

# 12. Destructive Operations and Data Retention

Do not implement immediate school deletion as a normal UI action.

Use a controlled lifecycle:

1. Suspend access.
2. Archive the school.
3. Apply retention period.
4. Schedule deletion.
5. Require privileged confirmation.
6. Run asynchronous deletion.
7. Verify deletion.
8. Produce a deletion audit record.

Permanent deletion must:

* Require explicit platform permission.
* Require reauthentication or elevated confirmation.
* Display impact summary.
* Respect regulatory and contractual retention.
* Remove or anonymize related data safely.
* Remove tenant files.
* Remove search-index records.
* Revoke sessions and tokens.
* Stop background jobs.
* Prevent partial deletion.
* Be idempotent.
* Support retry.
* Produce operational logs.
* Produce an immutable audit event.

Consider a typed confirmation phrase such as the school slug.

Do not rely on a simple browser confirmation dialog.

---

# 13. Global Integration Management

Provide secure global integration configuration for:

* Transactional email.
* SMS.
* Payment gateways.
* File storage.
* Push notifications.
* Video conferencing.
* Identity providers.
* SSO.
* Analytics.
* Monitoring.
* Error tracking.
* Backups.
* Webhooks.

Requirements:

* Store secrets outside source control.
* Encrypt stored secrets.
* Mask secrets after creation.
* Never return complete secrets through APIs.
* Validate credentials.
* Provide connection testing.
* Track test timestamp.
* Track integration status.
* Track last failure.
* Track failure reason safely.
* Support key rotation.
* Record audit history.
* Separate global defaults from organization overrides.
* Validate webhook signatures.
* Apply webhook replay protection.
* Implement idempotency for webhook processing.
* Apply retry and dead-letter behavior for failed jobs.

Do not execute slow connection tests synchronously when they could exceed normal request timeouts.

Use background jobs where appropriate.

---

# 14. Feature Flags and Module Entitlements

Implement feature availability through a centralized system.

Support:

* Global feature flags.
* Plan-based entitlements.
* Organization-level overrides.
* Gradual rollout where supported.
* Emergency disable switches.
* Experimental features.
* Maintenance mode.
* Module dependencies.

Example modules:

```text
ATTENDANCE
FEES
EXAMS
ASSIGNMENTS
LIBRARY
TRANSPORT
PAYROLL
INVENTORY
ADMISSIONS
MESSAGING
VIDEO_CLASSES
```

Feature access must be enforced:

* In navigation.
* In frontend routes.
* In backend routes.
* In services.
* In jobs.
* In exports.
* In integrations.

Do not use frontend visibility as the only feature-control mechanism.

Define precedence rules, for example:

```text
Emergency global disable
-> organization override
-> subscription entitlement
-> global default
```

Document the final precedence model.

---

# 15. School Administration

Each school must have a secure organization-administration area.

A school administrator must only manage data in their school.

Required capabilities:

* Create and invite users.
* View users.
* Edit users.
* Disable users.
* Restore users.
* Reset user access.
* Revoke sessions.
* Assign roles.
* Assign permissions where allowed.
* Manage classes.
* Manage sections.
* Manage subjects.
* Manage teacher assignments.
* Manage student enrollment.
* Manage parent relationships.
* Manage academic years.
* Manage announcements.
* Manage school settings.
* Review school audit logs.
* Import users.
* Export authorized data.

A school administrator must not be able to:

* Access another school.
* Create platform administrators.
* Modify global settings.
* Enable unlicensed modules.
* Read global secrets.
* Bypass retention policies.
* alter platform audit logs.

---

# 16. User Account Provisioning

Teachers, students, parents, guardians, administrators, and staff require individual accounts.

Do not use shared accounts.

Do not use one generic account per role.

## 16.1 Preferred Invitation Workflow

1. School administrator enters user details.
2. Server validates role and tenant scope.
3. Server creates a pending account or membership.
4. Server creates a cryptographically secure invitation token.
5. Store only a hash of the token.
6. Apply an expiration timestamp.
7. Send the invitation through the configured channel.
8. User opens the invitation.
9. User verifies their identity where required.
10. User creates a password.
11. Password is hashed securely.
12. Invitation is marked as consumed.
13. Existing sessions tied to the invitation are invalidated.
14. Account becomes active.
15. Audit events are written.

## 16.2 Temporary Password Fallback

Use only when required by business policy.

Requirements:

* Generate a cryptographically secure temporary password.
* Display it once.
* Never store it in plaintext.
* Force password change on first login.
* Expire the temporary credential.
* Rate-limit login attempts.
* Record credential issuance.
* Allow revocation before use.

Do not allow administrators to retrieve the existing password.

They may only reset access.

---

# 17. User State Model

Use explicit account states.

Example:

```ts
enum UserStatus {
  INVITED = "INVITED",
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  LOCKED = "LOCKED",
  DISABLED = "DISABLED",
  ARCHIVED = "ARCHIVED"
}
```

Define valid transitions.

Authentication must validate:

* User state.
* Organization state.
* Invitation state.
* Session state.
* Password-reset requirements.
* MFA requirements.
* Role validity.

Do not represent all states using only an `isActive` Boolean.

---

# 18. Parent, Guardian, and Student Relationships

Support a many-to-many relationship.

One parent or guardian may be linked to multiple students.

One student may have multiple parents or guardians.

Example model:

```ts
StudentGuardianRelationship {
  id: string;
  organizationId: string;
  studentId: string;
  guardianUserId: string;
  relationshipType: RelationshipType;
  isPrimary: boolean;
  canPickup: boolean;
  receivesAcademicUpdates: boolean;
  receivesFinancialUpdates: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

Possible relationship types:

```ts
MOTHER
FATHER
LEGAL_GUARDIAN
GRANDPARENT
EMERGENCY_CONTACT
OTHER
```

Requirements:

* Both records must belong to the same organization.
* Duplicate active relationships must be prevented.
* Parents must only access linked students.
* Permission may vary by relationship.
* Financial and academic visibility may be configured separately.
* Relationship removal must be audited.
* Relationship changes must invalidate affected authorization caches.

---

# 19. Teacher Assignment Model

Support assignment by:

* Academic year.
* Class.
* Section.
* Subject.
* Term.
* Role type.
* Effective date range.

Example:

```ts
TeacherAssignment {
  id: string;
  organizationId: string;
  teacherId: string;
  academicYearId: string;
  classId: string;
  sectionId?: string;
  subjectId?: string;
  assignmentType: AssignmentType;
  startsAt: Date;
  endsAt?: Date;
}
```

Possible assignment types:

```ts
SUBJECT_TEACHER
CLASS_TEACHER
HOMEROOM_TEACHER
SUBSTITUTE
COORDINATOR
```

Teachers must only access students and records allowed by their current assignment and permissions.

Expired assignments must not continue granting access.

---

# 20. Role-Based Dashboards

Every role must receive a dedicated dashboard.

All metrics must come from authorized server queries.

Do not use hardcoded counts.

Do not fetch entire tables to calculate simple counts in the browser.

Each dashboard must include:

* Loading state.
* Empty state.
* Error state.
* Partial-data behavior.
* Permission-aware components.
* Responsive layout.
* Accessible navigation.
* Correct time-zone handling.
* Server-side authorization.
* Cache strategy appropriate for sensitive data.
* Pagination or limits for recent activity.
* Clear links to source modules.

---

# 21. Platform Administrator Dashboard

Include:

* Organization counts by status.
* User counts by role.
* New organizations.
* Organization activity.
* Integration health.
* Job failures.
* Authentication alerts.
* Storage usage.
* Notification delivery statistics.
* Platform announcements.
* Recent privileged actions.
* Pending deletion workflows.
* System-health indicators.

Quick actions:

* Create organization.
* Invite platform administrator.
* Suspend organization.
* Configure integration.
* Manage feature flag.
* Review audit logs.
* Review failed jobs.

All sensitive actions must require authorization and auditing.

---

# 22. School Administrator Dashboard

Include:

* Students.
* Teachers.
* Parents.
* Staff.
* Classes.
* Sections.
* Attendance.
* Fees.
* Upcoming exams.
* Pending admissions.
* Recent user invitations.
* Failed onboarding attempts.
* School announcements.
* Operational alerts.
* Recent administrative actions.

Quick actions:

* Invite student.
* Invite teacher.
* Invite parent.
* Invite staff member.
* Create class.
* Create section.
* Record fee.
* Publish announcement.
* Configure academic year.
* Import users.

---

# 23. Teacher Dashboard

Include:

* Active assignments.
* Today’s timetable.
* Classes requiring attendance.
* Assignments awaiting review.
* Upcoming exams.
* Recent student submissions.
* Announcements.
* Leave status.
* Messages.
* Performance summaries that respect permissions.

Quick actions:

* Mark attendance.
* Create assignment.
* Review submissions.
* Enter grades.
* Upload learning material.
* Publish class announcement.
* Request leave.

Teacher authorization must be based on active assignments and explicit permissions.

---

# 24. Student Dashboard

Include:

* Timetable.
* Attendance.
* Assignments.
* Submission status.
* Grades.
* Exams.
* Results.
* Fee status.
* Receipts.
* Announcements.
* Study material.
* Library status.
* Transport information.
* Profile information.

Students must only access their own records.

Student identifiers supplied through URLs must be validated against the authenticated identity.

---

# 25. Parent or Guardian Dashboard

Include:

* Linked student selector.
* Attendance.
* Grades.
* Results.
* Assignments.
* Exam schedule.
* Fee status.
* Payment history.
* Receipts.
* Announcements.
* Transport status.
* Teacher communication.
* Student leave requests where supported.

Data visibility must follow guardian relationship permissions.

Do not assume every linked guardian can view financial or academic data.

---

# 26. Staff Dashboard

Staff access must be permission-driven.

Possible modules:

* Admissions.
* Reception.
* Fees.
* Payroll.
* Library.
* Transport.
* Inventory.
* Attendance.
* HR.
* Leave.
* Support.
* Communication.

Do not grant full school-administrator access to all staff.

---

# 27. UI Reference Review

Review the UI references located at:

```text
D:\My own projects\SCHOOL ERP V2\docs\ui\
```

Also check the repository-relative path:

```text
docs/ui/
```

Use the references to understand:

* Layout.
* Information hierarchy.
* Navigation.
* Typography.
* Cards.
* Tables.
* Forms.
* Filters.
* Charts.
* Color usage.
* Spacing.
* Responsive behavior.
* Empty states.
* Modal patterns.

Do not copy screenshots as static HTML.

Convert useful patterns into reusable components aligned with the existing design system.

Report missing or inaccessible reference files.

---

# 28. Production UI Requirements

Improve the interface across the entire application.

## Sidebar

Provide:

* SVG icons.
* Consistent icon sizing.
* Active states.
* Hover states.
* Focus states.
* Keyboard navigation.
* Collapsed state.
* Tooltips.
* Mobile drawer.
* Role-aware navigation.
* Permission-aware navigation.
* Feature-aware navigation.
* Logical grouping.
* Screen-reader labels.

## Dashboard Quick Access

Each quick-access item must contain:

* SVG icon or illustration.
* Title.
* Description.
* Optional metric or status.
* Accessible click target.
* Authorized route.
* Loading behavior where required.
* Hover and focus feedback.

Do not show unauthorized actions.

## Forms

Provide:

* Clear labels.
* Required-field indicators.
* Inline validation.
* Server validation.
* Accessible errors.
* Submission state.
* Duplicate-submit protection.
* Success feedback.
* Failure recovery.
* Unsaved-change protection where appropriate.

## Tables

Provide:

* Server-side pagination where data may grow.
* Sorting.
* Filtering.
* Search.
* Empty state.
* Loading state.
* Error state.
* Column visibility where useful.
* Accessible headers.
* Mobile behavior.
* Export only where authorized.

## Accessibility

Target WCAG 2.1 AA where practical.

Include:

* Keyboard support.
* Semantic HTML.
* Focus visibility.
* Color contrast.
* Accessible labels.
* Dialog focus trapping.
* Escape-key support.
* Screen-reader status announcements.
* Reduced-motion support.
* Accessible validation errors.

---

# 29. API Design Requirements

Use consistent API conventions.

Each endpoint must include:

* Authentication.
* Authorization.
* Tenant validation.
* Input validation.
* Structured errors.
* Request IDs.
* Audit events where required.
* Safe logging.
* Pagination where required.
* Idempotency where required.
* Transaction boundaries where required.

Example response:

```ts
type ApiResponse<T> = {
  data: T;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    requestId?: string;
  };
};
```

Example error:

```ts
type ApiError = {
  code: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
  requestId: string;
};
```

Do not expose:

* Stack traces.
* SQL.
* Database names.
* Internal file paths.
* Secret values.
* Authentication tokens.
* Provider credentials.

---

# 30. Validation

Use schema-based validation.

Validate at both:

* Client level for usability.
* Server level for security and correctness.

Validate:

* Email addresses.
* Phone numbers.
* Password policies.
* Roles.
* Permissions.
* Organization ownership.
* Entity identifiers.
* Dates.
* Date ranges.
* Currency values.
* Numeric limits.
* File types.
* File sizes.
* Relationship integrity.
* Duplicate records.
* Status transitions.
* Destructive confirmations.
* Import rows.
* Webhook payloads.
* Integration configuration.

Do not trust TypeScript types as runtime validation.

---

# 31. Database Migrations

All schema changes must use versioned migrations.

Migrations must:

* Preserve existing data.
* Avoid table locks where possible.
* Include required indexes.
* Include foreign keys.
* Include unique constraints.
* Include check constraints where supported.
* Be backward compatible during rollout where possible.
* Support rolling deployment when architecture requires it.
* Include rollback strategy.
* Be tested against a representative database.
* Avoid irreversible data loss.

For large production tables, use safe migration patterns:

1. Add nullable column.
2. Backfill in batches.
3. Add index.
4. Update application code.
5. Add constraints.
6. Remove obsolete fields later.

Do not combine high-risk schema changes and destructive data removal in one migration.

---

# 32. Transactions and Data Integrity

Use database transactions for multi-step operations such as:

* Creating a school and initial administrator.
* Creating a user and membership.
* Accepting an invitation.
* Linking guardians.
* Assigning teachers.
* Recording payments.
* Publishing results.
* Archiving organizations.
* Scheduling deletion.
* Changing plan entitlements.

Transactions must prevent partial state.

Use idempotency keys for external-payment and webhook workflows.

Use optimistic concurrency or version checks where concurrent updates may overwrite important records.

---

# 33. Audit Logging

Create immutable audit logs for sensitive actions.

Record:

* Authentication events.
* Password resets.
* Account invitations.
* Account suspensions.
* Role changes.
* Permission changes.
* Organization creation.
* Organization suspension.
* Organization archiving.
* Deletion scheduling.
* Integration changes.
* Feature-flag changes.
* Data exports.
* Impersonation or support access.
* Sensitive record access where required.
* Payment-related changes.
* Bulk imports.

Audit fields should include:

```ts
type AuditLog = {
  id: string;
  actorId?: string;
  actorType: string;
  actorRole?: string;
  organizationId?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  requestId: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
};
```

Do not store passwords, tokens, full payment data, or secrets in audit metadata.

Audit records must not be editable through normal application APIs.

---

# 34. Controlled Support Access

If platform administrators require access to troubleshoot a school, implement controlled support access.

Requirements:

* Explicit permission.
* Stated reason.
* Time-limited access.
* Visible support banner.
* Full audit logging.
* Original platform identity retained.
* No credential sharing.
* No silent identity replacement.
* Ability to revoke access.
* Optional organization approval where policy requires it.
* Prohibition on sensitive operations unless separately authorized.

Prefer scoped support context over unrestricted impersonation.

---

# 35. Logging and Observability

Implement structured logging.

Each request log should include, where appropriate:

* Timestamp.
* Log level.
* Request ID.
* Route.
* Method.
* Status.
* Duration.
* Actor ID.
* Organization ID.
* Error code.
* Job ID.
* Integration name.

Do not log:

* Passwords.
* Tokens.
* Cookies.
* Authorization headers.
* Secret keys.
* Full payment-card information.
* Sensitive student records unnecessarily.

Implement:

* Central error tracking.
* Metrics.
* Health checks.
* Readiness checks.
* Liveness checks.
* Background-job monitoring.
* Integration-failure alerts.
* Database-pool monitoring.
* Authentication anomaly monitoring.
* Slow-query visibility.

Suggested health endpoints:

```text
/health/live
/health/ready
```

Do not expose internal diagnostics publicly.

---

# 36. Background Jobs

Use background jobs for:

* Email invitations.
* SMS delivery.
* Bulk imports.
* Bulk exports.
* Organization deletion.
* Large reports.
* Integration synchronization.
* Notification fan-out.
* File processing.
* Data retention.
* Search indexing.
* Backup verification.

Jobs must support:

* Retry policy.
* Exponential backoff.
* Maximum attempts.
* Dead-letter handling.
* Idempotency.
* Tenant scope.
* Job status.
* Failure logging.
* Operational visibility.

Do not perform large destructive or import operations in a standard HTTP request.

---

# 37. File and Document Security

For uploaded files:

* Validate MIME type.
* Validate extension.
* Validate file size.
* Generate safe file names.
* Scan for malware if infrastructure supports it.
* Store outside the public application directory.
* Use signed URLs.
* Apply tenant-scoped paths.
* Apply access checks before download.
* Set expiration on temporary URLs.
* Prevent path traversal.
* Prevent executable upload where not required.
* Strip unsafe metadata where appropriate.

Do not expose permanent public URLs for private student or staff documents.

---

# 38. Privacy and Sensitive Data

Treat student, parent, academic, attendance, financial, health, and staff data as sensitive.

Apply:

* Least-privilege access.
* Field-level restrictions where necessary.
* Encryption in transit.
* Encryption at rest where supported.
* Data-retention policies.
* Export auditing.
* Deletion and anonymization workflows.
* Secure backups.
* Restricted operational access.
* Redaction in logs.
* Safe production support practices.

Do not use real production data in local development or automated tests.

Use anonymized or synthetic fixtures.

---

# 39. Backup and Recovery

Define and implement operational support for:

* Automated database backups.
* Encrypted backup storage.
* Retention period.
* Off-site storage where applicable.
* Point-in-time recovery where supported.
* File-storage backups.
* Backup access control.
* Backup audit logs.
* Backup verification.
* Restore testing.

Document:

* Recovery Point Objective.
* Recovery Time Objective.
* Restore procedure.
* Backup verification schedule.
* Responsible operational role.

A backup process is incomplete unless restoration has been tested.

---

# 40. Configuration Management

Use environment-based configuration.

Validate required environment variables at startup.

Separate:

* Development.
* Test.
* Staging.
* Production.

Do not silently use development defaults in production.

Classify configuration into:

* Public configuration.
* Private configuration.
* Secrets.
* Optional integrations.
* Required infrastructure values.

Examples:

```env
DATABASE_URL=
SESSION_SECRET=
APP_BASE_URL=
EMAIL_PROVIDER=
EMAIL_API_KEY=
SMS_PROVIDER=
SMS_API_KEY=
STORAGE_PROVIDER=
STORAGE_BUCKET=
ENCRYPTION_KEY=
ERROR_TRACKING_DSN=
```

Do not commit real values.

Provide:

```text
.env.example
```

with descriptions but no secrets.

---

# 41. Deployment Readiness

Ensure the application supports reproducible deployment.

Review and improve:

* Docker configuration.
* Build scripts.
* Production start scripts.
* Migration execution.
* Health checks.
* Graceful shutdown.
* Database connection pooling.
* Reverse-proxy configuration.
* Static asset delivery.
* File-storage configuration.
* Environment validation.
* Secure headers.
* HTTPS assumptions.
* CORS configuration.
* Trusted proxy settings.
* Runtime memory limits.
* Job-worker deployment.
* Cron or scheduled tasks.

The application must fail fast when required production configuration is missing.

---

# 42. CI/CD Requirements

Create or update a CI pipeline that runs:

```text
dependency installation
format check
lint
type check
unit tests
integration tests
production build
migration validation
security scanning
```

Where supported, also run:

* End-to-end tests.
* Dependency vulnerability audit.
* Secret scanning.
* Container image scanning.
* License compliance checks.
* Database migration test.
* Accessibility checks.

A merge must fail when critical checks fail.

Do not allow deployment from an untested branch.

---

# 43. Testing Requirements

## Unit Tests

Cover:

* Role evaluation.
* Permission evaluation.
* Tenant-context extraction.
* Tenant query helpers.
* Invitation tokens.
* Password resets.
* Status transitions.
* Feature entitlements.
* Validation schemas.
* Audit-event creation.
* Guardian access rules.
* Teacher assignment access.
* Sensitive-field redaction.

## Integration Tests

Cover:

* Platform administrator authentication.
* School creation.
* Initial school administrator invitation.
* School activation.
* School suspension.
* School-user creation.
* Parent-student linking.
* Teacher assignment.
* Session invalidation.
* Password recovery.
* Permission updates.
* Feature entitlement enforcement.
* Audit logging.
* File access.
* Cross-tenant rejection.
* Disabled-account rejection.
* Suspended-school rejection.

## End-to-End Tests

Cover:

1. Platform administrator signs in with MFA-ready flow.
2. Platform administrator creates a school.
3. Platform administrator invites the first school administrator.
4. School administrator accepts invitation.
5. School administrator configures the school.
6. School administrator invites a teacher.
7. School administrator invites a student.
8. School administrator invites a parent.
9. Parent is linked to student.
10. Teacher is assigned to class and subject.
11. Teacher signs in.
12. Student signs in.
13. Parent signs in.
14. Each role sees the correct dashboard.
15. Each role is blocked from unauthorized pages.
16. A user from one school cannot access another school.
17. Suspended users lose access.
18. Suspended schools lose access.
19. Audit events are recorded.
20. Sessions terminate correctly after logout and suspension.

## Security Tests

Include:

* Horizontal privilege escalation.
* Vertical privilege escalation.
* Cross-tenant identifier substitution.
* Expired token reuse.
* Used-token reuse.
* Session fixation.
* CSRF where relevant.
* Rate-limit behavior.
* File-access bypass.
* Export authorization.
* Feature-flag bypass.
* Role-change session invalidation.
* SQL-injection resistance.
* XSS handling.

---

# 44. Performance Requirements

Review critical queries and pages.

Implement:

* Pagination.
* Appropriate indexes.
* Query limits.
* Aggregate queries.
* N+1 prevention.
* Batch loading.
* Lazy loading.
* Code splitting.
* Image optimization.
* Caching with tenant-safe keys.
* Background report generation.
* Request timeouts.
* Database timeouts.
* Integration timeouts.
* Circuit-breaker or retry patterns where appropriate.

Do not cache authorization decisions without a clear invalidation strategy.

Do not cache sensitive cross-tenant responses under shared keys.

Establish measurable targets where feasible:

* Reasonable dashboard response time.
* Bounded list queries.
* Bounded memory use for imports and exports.
* Controlled background-job concurrency.
* Acceptable production bundle size.

---

# 45. Incomplete Feature Remediation

Inventory all incomplete features.

Classify each as:

```text
CRITICAL
HIGH
MEDIUM
LOW
REMOVE
DEFER
```

For each feature, determine whether to:

* Complete it.
* Repair it.
* Secure it.
* Remove it.
* Hide it behind a disabled feature flag.
* Document it as deferred.

Do not leave visible navigation to incomplete production features.

Do not display “Coming Soon” for functionality that is presented as available in the deployed product.

A completed feature must include:

* Database support.
* Backend logic.
* Authorization.
* Validation.
* Frontend integration.
* Loading state.
* Empty state.
* Error state.
* Tests.
* Audit handling where required.
* Documentation.

---

# 46. Implementation Sequence

## Phase 1: Audit and Risk Assessment

* Map the architecture.
* Identify tenant risks.
* Identify authorization gaps.
* Identify schema risks.
* Identify incomplete features.
* Review UI references.
* Review deployment architecture.
* Review test coverage.

## Phase 2: Identity and Tenant Foundation

* Finalize identity model.
* Add platform administrator domain.
* Add organization membership model if required.
* Add centralized authorization.
* Add tenant context.
* Add database constraints.
* Add audit infrastructure.
* Add session invalidation.

## Phase 3: Authentication and Onboarding

* Implement invitations.
* Implement account activation.
* Implement password reset.
* Implement verification.
* Implement account states.
* Implement privileged-user MFA readiness.
* Add rate limiting.
* Add session management.

## Phase 4: Platform Administration

* Platform dashboard.
* Organization lifecycle.
* Integrations.
* Feature flags.
* Plans and entitlements.
* Audit logs.
* System health.
* Controlled support access.

## Phase 5: School Administration

* User lifecycle.
* Classes.
* Sections.
* Subjects.
* Teacher assignments.
* Student enrollment.
* Parent relationships.
* Academic-year configuration.
* School settings.

## Phase 6: Role Dashboards

* Platform administrator.
* School administrator.
* Teacher.
* Student.
* Parent.
* Staff.

## Phase 7: UI System

* Reusable layout.
* Sidebar.
* Quick access.
* Tables.
* Forms.
* Dialogs.
* Feedback states.
* Accessibility.
* Responsive behavior.

## Phase 8: Operational Readiness

* Logging.
* Monitoring.
* Health checks.
* Background jobs.
* Backups.
* Restore documentation.
* Configuration validation.
* Deployment scripts.
* CI/CD.

## Phase 9: Verification

* Run migrations.
* Seed non-production test data.
* Run format check.
* Run lint.
* Run type check.
* Run unit tests.
* Run integration tests.
* Run end-to-end tests.
* Run production build.
* Run security tests.
* Test deployment.
* Test backup restoration.
* Test rollback plan.

---

# 47. Required Production Deliverables

## Source Code

Complete, integrated, reviewed implementation.

## Database Migrations

Versioned migrations with rollout and rollback notes.

## Seed and Bootstrap Tools

Secure tools for creating the first platform administrator.

Do not hardcode credentials.

## Environment Documentation

Document all required and optional variables.

## Deployment Documentation

Include:

* Prerequisites.
* Build.
* Migration.
* Deployment.
* Worker deployment.
* Health verification.
* Rollback.
* Secret rotation.
* Backup.
* Restore.

## Architecture Documentation

Include:

* Identity model.
* Tenant model.
* Authorization model.
* Session model.
* Organization lifecycle.
* Audit architecture.
* Integration architecture.
* Background-job architecture.
* File-security architecture.

## Operations Runbook

Include:

* User lockout.
* School suspension.
* Failed migration.
* Failed integration.
* Job backlog.
* Database outage.
* Storage outage.
* Email outage.
* Secret rotation.
* Suspected data breach.
* Organization deletion.
* Backup restore.

## Test Report

List:

* Commands executed.
* Passed tests.
* Failed tests.
* Coverage.
* Known gaps.
* Security tests performed.

## Feature Inventory

List:

* Completed features.
* Removed features.
* Disabled features.
* Deferred features.
* Known limitations.

---

# 48. Definition of Production Ready

The system is production ready only when:

* Platform administrators have a secure administration portal.
* School administrators can securely manage their organization.
* Teachers, students, parents, and staff have individual accounts.
* Account invitation and recovery workflows are complete.
* Tenant isolation is enforced and tested.
* All privileged actions are server-authorized.
* Role and permission logic is centralized.
* Organization lifecycle operations are controlled.
* Destructive operations use safe workflows.
* Audit logs exist for sensitive actions.
* Integration secrets are protected.
* UI routes match backend authorization.
* Dashboards use real authorized data.
* No critical feature depends on mocked data.
* No critical navigation item is broken.
* No major button is non-functional.
* Loading, empty, success, and error states exist.
* Accessibility fundamentals are implemented.
* Production configuration is validated.
* Database migrations are safe.
* Backups are configured.
* Restore procedures are tested.
* Monitoring is configured.
* Health checks are available.
* Background jobs are observable.
* CI checks pass.
* Type checking passes.
* Linting passes.
* Production build passes.
* Critical unit tests pass.
* Critical integration tests pass.
* Critical end-to-end tests pass.
* Security isolation tests pass.
* No plaintext credentials exist.
* No secrets are committed.
* No critical errors remain in server or browser logs.
* Deployment and rollback procedures are documented.
* Remaining risks are explicitly documented and accepted.

---

# 49. Coding Assistant Execution Rules

While performing this work:

* Inspect before editing.
* Follow the existing architecture unless it is unsafe.
* Prefer incremental migration over a complete rewrite.
* Reuse valid components and services.
* Refactor unsafe duplication.
* Keep domain logic outside UI components.
* Keep database logic outside presentation code.
* Use strongly typed contracts.
* Avoid `any`.
* Avoid unsafe casts.
* Avoid broad authorization roles when permissions are required.
* Avoid client-controlled tenant context.
* Avoid unbounded queries.
* Avoid synchronous long-running operations.
* Avoid hidden failure handling.
* Avoid swallowing exceptions.
* Avoid logging sensitive data.
* Avoid adding dependencies without justification.
* Avoid introducing incompatible framework patterns.
* Avoid pseudocode in committed source files.
* Avoid placeholder production code.
* Avoid undocumented architectural changes.

For each major implementation:

1. Inspect related models and flows.
2. Identify security boundaries.
3. Update the database safely.
4. Add backend validation.
5. Add backend authorization.
6. Add tenant enforcement.
7. Add service logic.
8. Add UI.
9. Add error and loading states.
10. Add tests.
11. Update documentation.
12. Run verification commands.

When requirements conflict with the current schema, choose the safer maintainable design and explain the migration.

Do not claim completion without running the relevant checks.

---

# 50. Required Final Response

After implementation, provide:

## Executive Summary

Explain what was completed and whether the system meets the production-readiness definition.

## Architecture Decisions

Describe:

* Identity model.
* Tenant model.
* Authorization model.
* Platform-admin isolation.
* Session model.
* Audit model.

## Database Changes

List:

* Tables.
* Columns.
* Relationships.
* Constraints.
* Indexes.
* Migrations.
* Backfills.
* Rollback considerations.

## Backend Changes

List:

* APIs.
* Services.
* Middleware.
* Policies.
* Jobs.
* Integrations.
* Error handling.

## Frontend Changes

List:

* Dashboards.
* Routes.
* Navigation.
* Forms.
* Tables.
* Accessibility changes.
* Responsive changes.

## Security Controls

List:

* Authentication protections.
* Authorization protections.
* Tenant isolation.
* Secret handling.
* Audit logging.
* Rate limiting.
* Session invalidation.
* File security.

## Operations and Deployment

List:

* Environment configuration.
* Deployment process.
* Health checks.
* Monitoring.
* Logging.
* Backups.
* Restore procedure.
* Rollback procedure.

## Verification Results

Report actual command results:

```bash
<format command>
<lint command>
<type-check command>
<unit-test command>
<integration-test command>
<end-to-end-test command>
<production-build command>
```

Do not invent successful results.

## Security Test Results

Report all authorization and tenant-isolation tests.

## Files Changed

Group by:

* Database.
* Backend.
* Frontend.
* Tests.
* Infrastructure.
* Documentation.

## Remaining Risks

For each unresolved risk, include:

* Severity.
* Description.
* Affected users.
* Security or operational impact.
* Required remediation.
* Whether deployment should be blocked.

## Deployment Decision

End with one of:

```text
READY FOR PRODUCTION
```

```text
READY FOR STAGING, NOT READY FOR PRODUCTION
```

```text
NOT READY FOR DEPLOYMENT
```

Base this decision only on completed implementation and verified results.
