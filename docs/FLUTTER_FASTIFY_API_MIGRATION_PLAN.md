# School ERP — Web + Flutter API and Fastify Migration Plan

Status: Fastify/Web parity implemented locally; staging provider validation and Flutter device validation remain external release gates  
Date: 2026-08-09  
Target: One Fastify backend consumed by the Next.js web frontend and Flutter, deployable as a separate Render Web Service

## Implementation update — 2026-08-09

The repository implementation now includes the complete versioned Fastify route boundary under `/api/v1`, API-owned session-cookie authentication with strict origin and CSRF checks, Firebase Bearer support for Flutter, typed browser/server clients, OpenAPI publication, dedicated domain routes, low-risk catalog compatibility routes, encrypted tenant provider configuration, selected-provider adapters, signed webhook handling, idempotent payment/refund behavior, imports/exports/uploads/invitations/jobs, Render service configuration, and removal of the legacy `app/api` handlers.

Local verification is green: API typecheck/tests, application typecheck, lint, the full Vitest suite, production build, config validation, and secret scanning. Flutter client code and device validation are intentionally outside this checkout. Render staging smoke tests, real provider sandbox webhooks, authenticated browser E2E coverage, load/concurrency evidence, backups, and production credentials still require the deployment environment.

## 1. Non-negotiable architecture decision

The repository will use a strangler migration that makes Fastify the single backend for both clients:

```text
Next.js web frontend
  ├── App Router pages using the typed Fastify server client for reads
  ├── browser mutations using the typed Fastify browser client
  └── same-origin `/api/v1` rewrite for cookie-authenticated requests

Flutter mobile frontend
  └── typed client calls to Fastify /api/v1

Fastify API service — the single backend
  └── /api/v1/* stable JSON contract for Next.js web, Flutter and future clients

Fastify owns
  ├── Firebase Authentication / Firebase Admin verification
  ├── shared Drizzle schema and Turso/libSQL database
  ├── shared tenant, campus and permission rules
  └── framework-neutral domain services and business mutations
```

The Next.js web frontend remains deployable as a separate web service while Fastify owns the shared business boundary. Legacy `app/api` handlers and domain Server Actions have been removed or converted into typed API adapters; no Next page performs a direct database write or imports a feature service for its read path.

### 1.1 What “the same API” means

“The same API” means one versioned Fastify endpoint and one set of backend business, validation, tenant, campus and permission rules. The Next.js web frontend and Flutter may have different screens and authentication transport during the transition, but they must not have separate implementations of the same business operation.

- Flutter authenticates with the Firebase client SDK and sends a Firebase ID token on every API request.
- Browser API calls may use the same `Authorization: Bearer` contract.
- Next.js server-rendered requests may use an API-owned secure HttpOnly session cookie after the web-session exchange is migrated. If cookie authentication is used, the API must enforce CSRF protection and an explicit origin policy.
- All transports resolve the same framework-neutral `CurrentUser` and authorization context. The API must never trust an organization, user, role, permission or campus value supplied by either client.

The native/mobile request contract is:

```http
Authorization: Bearer <fresh Firebase ID token>
X-Campus-Id: <optional campus selected by the user>
```

The API must verify credentials server-side, resolve the local ERP user, validate the requested campus against that user’s allowed campuses and enforce permissions from the server. Neither web nor Flutter may send an organization ID as an authority signal.

## 2. Verified current state

The repository is a Next.js 14 web application backed by an independently runnable Fastify service. All current HTTP capabilities are exposed under the versioned `/api/v1` boundary, while the Next.js rewrite keeps browser cookies same-origin.

Evidence:

- `server/api/routes/index.ts` registers the complete domain and operational route groups under `/api/v1`.
- `server/api/auth/bearer-auth.ts` accepts Firebase Bearer tokens or the API-owned secure session cookie; cookie mutations require strict origin and CSRF validation.
- `lib/api-client/server-queries.ts` is the typed server-side page-read adapter, and `lib/api-client/actions.ts` is the typed browser mutation adapter.
- `app/api` contains no remaining route handlers, and Next page code contains no direct feature-service read imports or direct audit/database writes.
- `server/api/openapi.ts` publishes the registered Fastify contract at `/documentation/json` and `/documentation`.
- `render.yaml` defines separate API and worker services with `/health/ready` readiness and fail-closed deployment configuration.

The remaining release gates are environment-bound: Render staging smoke tests, real provider sandbox webhooks, authenticated browser E2E, load/concurrency evidence, backup/restore verification, and Flutter device validation.

## 3. Target repository layout

```text
server/api/
  app.ts                         # single Fastify backend composition root; no domain logic
  index.ts                       # Render/local process entrypoint
  auth/
    bearer-auth.ts               # Firebase Bearer verification and CurrentUser resolution
  plugins/
    request-context.ts           # request ID, auth context and common hooks
  routes/
    health.routes.ts             # liveness/readiness
    meta.routes.ts               # API version/capabilities
    me.routes.ts                 # authenticated identity and allowed campuses
    index.ts                     # /api/v1 route registration
  errors.ts                      # stable JSON error mapping

lib/auth/user-context.ts         # framework-neutral tenant/user/permission resolver
lib/api-client/                  # typed Next.js server/browser client for /api/v1 (target)
tsconfig.api.json                # API typecheck/build boundary
docs/FLUTTER_FASTIFY_API_MIGRATION_PLAN.md
```

New API code must not import `next/server`, `next/cache`, React components, App Router pages, `cookies()` or the `server-only` package. After a web slice is migrated, its Next.js UI/API client must not perform the business mutation through a Server Action or direct database call. If a domain service imports Next-only modules, extract its database/business logic into a neutral service before using it from Fastify.

## 4. API contract rules

Every `/api/v1` endpoint must follow these rules:

1. Use JSON for requests and responses unless the endpoint explicitly returns CSV/file bytes.
2. Return a stable envelope:

   ```json
   {
     "data": {},
     "meta": { "requestId": "..." }
   }
   ```

3. Return errors in this shape:

   ```json
   {
     "error": {
       "code": "VALIDATION_ERROR",
       "message": "Readable explanation",
       "requestId": "...",
       "fields": {}
     }
   }
   ```

4. Validate every body, query and path parameter with Zod or a Fastify-compatible schema before calling a service.
5. Never trust `organizationId`, `userId`, role, permission or campus scope supplied by the web frontend or Flutter.
6. Use `X-Campus-Id` only as a requested context; verify it against the authenticated user’s `availableCampuses`.
7. Use explicit pagination limits. No mobile list endpoint may return an unbounded table scan.
8. Use idempotency keys for payments, refunds, imports and other retryable writes.
9. Keep all money in integer minor units and preserve the existing finance validation/ledger boundary.
10. Record request IDs and audit mutations without logging Firebase tokens, API secrets, health data or payment details.
11. Version breaking changes under `/api/v2`; do not silently change `/api/v1` response fields.
12. Document every released endpoint with an OpenAPI contract before either the web frontend or Flutter consumes it.

## 5. Implementation phases

### Phase 0 — Foundation and client compatibility

Deliverables:

- Fastify dependencies and API scripts.
- `server/api` composition root and Render-compatible process entrypoint.
- Neutral shared user-context resolver used by both web guards and Fastify authentication.
- Firebase Bearer authentication for Fastify, with the auth boundary designed for both web and Flutter.
- `GET /health/live`, `GET /health/ready`, `GET /api/v1` and authenticated `GET /api/v1/me`.
- Fastify tests for boot, health, missing bearer token, invalid configuration and response envelopes.
- Architecture comments with the `CLIENT_API_CONTRACT` marker in the API composition root, bearer-auth module, shared user context and existing web session adapter. The comments must explicitly preserve Flutter compatibility.

Exit criteria:

- `npm.cmd run api:typecheck` passes.
- `npm.cmd run api:test` passes.
- `GET /health/live` works without a database or Firebase secret.
- `GET /health/ready` returns non-ready rather than falsely reporting a healthy database when configuration is missing.
- A valid Firebase user can call `/api/v1/me`; an invalid, unverified, inactive or cross-campus request is rejected.
- Existing `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd test` and `npm.cmd run build` remain green.

### Phase 1 — API security, web authentication and contract tooling

Deliverables:

- Request ID hook and structured Fastify logging.
- Helmet/security headers, explicit CORS allow-list and rate limits.
- A documented web authentication transition: keep the current Next.js cookie flow only as compatibility code, then issue or forward an API-recognized credential to Fastify. Do not create a second web-only business API.
- If the web uses an API-owned session cookie, add `Secure`, `HttpOnly`, `SameSite` and CSRF/origin protections. If the web uses Bearer requests, define the SSR token-forwarding and browser token-refresh behavior before cutover.
- Shared error mapper for `AppError`, Zod errors, authentication errors and unexpected failures.
- OpenAPI generation and a checked-in API contract review process.
- Test fixtures for two organizations, multiple campuses and every supported role.
- Bearer/cookie-auth tests for tenant isolation, campus switching, permission denial, revoked/inactive users and expired Firebase credentials.

Exit criteria:

- Every protected route has an authentication and permission test.
- No endpoint accepts client-supplied tenant identity as authorization.
- Error responses do not expose SQL, Firebase credentials, provider secrets or stack traces.
- The web and Flutter clients receive the same authorization result for the same user and requested resource.

### Phase 2 — Shared web + Flutter MVP vertical slices

Implement each vertical slice once in Fastify, including schema validation, authorization, database behavior, audit rows and API tests. Then consume that same endpoint from both the Next.js web frontend and Flutter; do not implement a web Server Action and a separate Flutter route for the same operation. Recommended order:

1. `GET /api/v1/me` and campus context.
2. Parent/student portal snapshot and linked-student selection.
3. Student profile, guardians, documents and certificates.
4. Attendance read, leave request and permitted attendance actions.
5. Fees/invoices, payment creation, webhook reconciliation and receipts.
6. Published exam results.
7. Notifications and read state.
8. Upload signatures and document metadata.

Shared MVP endpoints (implementation status is recorded below the table):

| Area          | Endpoint                              | Required server rule                                                                                                                                                                   |
| ------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity      | `GET /api/v1/me`                      | Return the authenticated user, role, organization, campuses and safe permissions to both clients.                                                                                      |
| Campus        | `GET /api/v1/me/campuses`             | Return only campuses already authorized for the user.                                                                                                                                  |
| Portal        | `GET /api/v1/portal/summary`          | Resolve linked/assigned students on the server; never accept an arbitrary student list.                                                                                                |
| Students      | `GET /api/v1/students/:id`            | Apply permitted-student and tenant/campus scope before returning data.                                                                                                                 |
| Attendance    | `GET /api/v1/students/:id/attendance` | Limit history and enforce linked/assigned scope.                                                                                                                                       |
| Leave         | `POST /api/v1/leave-requests`         | Validate dates, requester identity and permission on the server.                                                                                                                       |
| Fees          | `GET /api/v1/students/:id/invoices`   | Return only invoices for an authorized student.                                                                                                                                        |
| Payments      | `POST /api/v1/payments`               | Record an authorized staff collection in minor units with an idempotency key and invoice/student ownership checks; online payment intent/provider settlement remains a provider slice. |
| Razorpay      | `POST /api/v1/payments/razorpay/orders` | Create or resume one authorized provider order for an INR invoice and expose only Checkout-safe public data. |
| Razorpay      | `POST /api/v1/payments/razorpay/verify` | Verify Checkout HMAC, fetch the provider payment, require captured status and exact order/amount/currency parity, then post once. |
| Refunds       | `POST /api/v1/payments/refunds`       | Reserve refundable value idempotently; send online refunds to Razorpay and reverse the ERP ledger only after provider-processed status. |
| Results       | `GET /api/v1/students/:id/results`    | Return published results only for a permitted student.                                                                                                                                 |
| Notifications | `GET /api/v1/notifications`           | Return only the authenticated recipient’s notifications.                                                                                                                               |
| Uploads       | `POST /api/v1/uploads/signature`      | Enforce entity scope, file policy and sensitive-health permission for both clients.                                                                                                    |
| Documents     | `POST /api/v1/documents`              | Verify provider metadata and tenant/entity scope before persisting a document row.                                                                                                     |
| Documents     | `GET /api/v1/students/:id/documents`  | Return a bounded active-document list for an authorized student.                                                                                                                       |

Implemented on 2026-08-09: identity, campus, portal, student profile, bounded student attendance, bounded student invoices, published-only student results, recipient-only notifications, scoped leave submission, notification read state, idempotent authorized payment recording, scoped upload signatures, verified document metadata and bounded student-document listing. Razorpay now supplies tenant-encrypted configuration, Checkout order creation, server-side signature and captured-payment verification, raw-body webhook reconciliation, idempotent receipt/ledger posting, provider-backed refunds and processed-refund ledger finalization. Live-account settlement and staging webhook evidence remain deployment gates.

### Phase 3 — Next.js web client migration

Migrate the web frontend to the shared Fastify API one vertical slice at a time:

- Create a typed Next.js API client for `/api/v1` with the same DTOs and error envelope used by Flutter.
- Migrate reads first, then mutations, keeping the existing Server Action as a temporary fallback only while the Fastify endpoint is under verification.
- Make authenticated SSR requests forward the approved API credential and preserve request IDs in server logs.
- Make browser requests obey the API CORS policy. If cookie authentication is selected, enforce CSRF protection; do not rely on a hidden UI button for security.
- Remove direct business writes from migrated Server Actions and page code. The web UI may render and orchestrate, but Fastify owns authorization, validation, transactions and audit writes.
- Add web integration/E2E coverage for every migrated workflow before deleting its legacy action.

Web migration exit criteria:

- A web user can sign in and call the shared Fastify API using the documented web credential flow.
- A migrated web page does not import or call the legacy Server Action for that workflow.
- SSR, browser navigation, refresh, logout and expired-session behavior are covered.
- The web and Flutter clients receive the same response/error semantics for the same endpoint.
- No migrated web path trusts `organizationId`, `userId`, role, permission or campus scope from browser input.

### Phase 4 — Flutter client integration

Flutter must provide:

- Firebase Auth sign-in and automatic ID-token refresh.
- An API client with base URL configuration per environment.
- `Authorization` and `X-Campus-Id` headers on every request.
- Typed DTOs generated or reviewed from the same OpenAPI contract used by the web client.
- Retry only for safe/idempotent requests or requests carrying an idempotency key.
- Explicit handling for `401`, `403`, `409`, `422`, `429` and `503`.
- Offline read caching only for structural or safe-to-cache data; never cache authorization, payment, attendance completion or session state as authoritative.
- Request IDs in crash/support reports, excluding tokens and personal data.

### Phase 5 — Staff/admin and operational slices

Migrate only after the mobile MVP has production-like tests:

- Admissions and enrollment.
- Teacher attendance marking and correction approval.
- Exam planning, marks entry and result publication.
- Finance administration and refunds.
- HR/payroll.
- Library, transport, hostel, inventory/procurement and facilities.
- Communication providers and integration status.
- Reports/exports with explicit privacy permissions.

The existing audit findings remain release gates. Generic `moduleRecords` routes must not be relabeled as complete mobile APIs.

### Phase 6 — Render deployment

Create a separate Render Web Service for Fastify:

- Build command: `npm ci && npm run api:typecheck && npm run api:test`.
- Start command: `npm run api:start`.
- Bind host: `0.0.0.0`.
- Bind port: Render’s `PORT` environment variable.
- Health check: `/health/ready`.
- Database: existing Turso/libSQL URL and token.
- Authentication: Firebase Admin project ID, client email and private key.
- Secrets: encryption and internal job secrets supplied through Render environment settings only.
- CORS: explicit production Next.js web origin(s) and any Flutter web origin; native Flutter does not require browser CORS, but the server must not use `*` when credentials or sensitive data are involved.
- Worker jobs: deploy separately or use a separately supervised process; do not hide long-running workers inside request handlers.

Render is not production approval by itself. Before release, verify migrations, backup/restore, rate limits, provider webhooks, logs, alerts, concurrency invariants and authenticated Flutter smoke journeys.

### Phase 7 — Deprecation and ownership

After each vertical slice has parity in both clients:

1. Mark the old web-only path as retained, migrated or deprecated.
2. Keep the domain service and authorization tests shared.
3. Remove duplicate logic only after web and Flutter regression suites pass.
4. Publish a versioned deprecation date and migration note for every replaced endpoint.
5. Never delete the Next.js API route and its tests solely because the Fastify route exists.

## 6. Required code-comment convention

Every new or migrated API boundary must contain a durable comment with this marker:

```ts
/**
 * CLIENT_API_CONTRACT:
 * This route is part of the versioned Fastify API consumed by the Next.js web
 * frontend and Flutter. Keep authentication, tenant/campus scope, validation,
 * error shape and idempotency behavior stable. Do not replace it with a
 * web-only Server Action.
 */
```

Use additional markers where appropriate:

- `CLIENT_API_AUTH` — Bearer, API-cookie, CSRF and token-refresh assumptions for both clients.
- `CLIENT_API_SCOPE` — tenant, campus, linked-student and role boundaries.
- `CLIENT_API_MONEY` — minor-unit and idempotency requirements.
- `CLIENT_API_MIGRATION` — compatibility code that can be removed only after web and Flutter parity.
- `FLUTTER_API_*` may be retained as a more specific secondary marker when a rule is Flutter-specific, but it must not imply that the web client is outside the contract.

Comments must explain the contract and safety boundary, not restate obvious syntax. Any future LLM or developer adding an endpoint must update this plan, the OpenAPI contract, the typed web client, the Flutter DTO/client and the API tests in the same change.

## 7. Definition of done for the full migration

- Fastify runs independently from Next.js and is deployable on Render.
- Next.js web and Flutter use the same documented `/api/v1` endpoints for migrated features.
- All migrated endpoints use a documented Fastify authentication transport and server-side RBAC/tenant/campus scope. Flutter uses Firebase Bearer authentication; web cookie/Bearer compatibility must resolve the same user context.
- All migrated request/response contracts are typed, versioned and documented.
- No migrated web workflow performs its business mutation through a Server Action or direct database call.
- Critical money, attendance, exam, health, document and authorization paths have integration and concurrency tests.
- Provider/webhook retries and idempotency are tested.
- Authenticated Flutter smoke tests cover parent, student, teacher and admin journeys in a staging environment.
- Authenticated web smoke tests cover the equivalent migrated journeys, including SSR, refresh, logout and expired-session behavior.
- Web regression tests remain green until the corresponding web workflow is intentionally retired.
- No unresolved Critical/High audit finding is hidden by a generic route or an API stub.

## 8. Current implementation progress

Implemented locally in this repository on 2026-08-09:

- Independent Fastify composition root, versioned `/api/v1` route boundary, Render-compatible entrypoint, worker process, readiness/liveness probes and same-origin Next rewrite.
- Firebase Bearer authentication for Flutter/external clients and API-owned secure session-cookie authentication for Next SSR/browser requests, including logout, expiry/revocation handling, strict origin checks and CSRF protection.
- Typed server/browser API clients carrying campus scope, idempotency keys, stable error envelopes and consistent auth/provider/rate-limit handling.
- Dedicated Fastify routes for identity, campuses, users, platform administration, invitations, students, admissions, guardians, health, attendance, leave, academics, exams, results, notifications, fees, payments, refunds, accounting, payroll, imports, exports, uploads, library, transport, hostel, inventory, procurement, facilities, safety, canteen, activities, alumni, CMS, reports, jobs and webhooks.
- High-invariant workflows use dedicated routes and Zod schemas; only low-risk records retain the typed catalog compatibility path.
- All current Next page reads use `lib/api-client/server-queries.ts`; all current browser mutations use the typed API action adapter. No `app/api` handlers, `use server` domain actions, direct Next business writes or page-level feature-service reads remain.
- OpenAPI publication for the registered Fastify routes, stable request IDs/envelopes, tenant/campus authorization, audit events, pagination limits and idempotent payment/refund/webhook behavior.
- Encrypted tenant provider configuration plus fail-closed adapters/health reporting for Firebase/FCM, Turso/libSQL, Cloudinary, Razorpay, Resend, Twilio, Google Calendar, Moodle, Traccar and signed hardware-attendance webhooks.
- Local gates passed: `api:check`, application typecheck, lint, 38 Vitest files/124 tests, production build, config validation and secret scanning.

External release gates still required:

- Render staging smoke tests with deployment secret-manager credentials and two-organization role coverage.
- Provider sandbox contract/webhook tests, reconciliation and dead-letter verification for every selected provider.
- Authenticated browser E2E for login/session refresh/logout/expiry/campus switching and representative migrated workflows.
- Load/concurrency tests for payments, refunds, imports, attendance, allocations, exam publication and webhook retries, plus backup/restore evidence.
- Flutter client implementation, generated/reviewed DTOs and device validation; Flutter remains intentionally outside this checkout.
