# School ERP - Complete UI/UX Work Remaining Report

Status: Repository implementation pass complete; release evidence open

Date: 2026-08-12

Scope: Next.js App Router frontend, shared application shell, navigation, dashboards, list and table workflows, forms, entity detail pages, feedback states, accessibility, responsive behavior, perceived performance, and operational productivity.

## 1. Purpose and status

This document started as a forward-looking report of work that still needed to be done. The current checkout now contains the repository-local implementation pass for the safety, shell, retrieval, workflow, status, form, responsive-foundation, and reporting items described below. It is not a claim that authenticated browser, real-device, screen-reader, provider, load, security, backup, or production evidence has been collected.

The implementation now includes:

- A typed route/presentation registry covering all configured module routes, grouped role-aware navigation, duplicate-destination checks, human breadcrumb labels, skip navigation, and semantic current-page/tab state.
- An authoritative route release registry with owner, permission, presentation, and release status metadata. Foundation setup and dedicated workflows remain visible; reserved and generic routes are hidden and reject direct access.
- Generic catch-all workspaces and generic `module_records` mutations are removed from the released surface. Existing legacy rows remain preserved but are not reachable through the catalog API.
- Shared dialog/drawer interaction contracts with focus trapping, focus restoration, Escape handling, body-scroll locking, pending protection, retryable errors, and scoped destructive copy.
- Durable mutation feedback for important payment work, visible campus/session failure states, server-safe API error handling, and idempotent payment retry identity.
- URL-backed retrieval patterns for students, users, admissions, attendance, and fee invoices, with filter summaries, clear actions, and query-preserving pagination.
- Operational list/table semantics, shared loading/error/filtered-empty primitives, central status vocabulary, responsive overflow handling, and role-aware dashboard action queues.
- Grouped student creation, success routing, dependent enrollment fields, accessible field/error associations, entity headers/tabs, and representative role workflows for admissions, attendance, finance, safety, procurement, CMS, facilities, assets, library, integrations, and reports.
- Report scope/freshness summaries, format-specific export actions, reduced-motion/focus foundations, semantic color tokens, and regression tests for navigation, dialogs, destructive workflows, and student creation.

The detailed acceptance criteria remain below as a release checklist. Items that require a real authenticated browser, device, screen reader, provider, production, load, security, or backup environment remain validation activities rather than claims made from source inspection.

The audit is source-led. Authenticated browser, real-user, screen-reader, load, and production deployment evidence still needs to be collected before declaring the product enterprise-ready.

## 2. Product UX outcome

The finished ERP should let every user answer these questions immediately:

1. Where am I?
2. What information am I looking at?
3. What can I do here?
4. What should I do next?

The target experience is an operational SaaS product optimized for repeated work:

- Clarity over decoration.
- Fast retrieval over deep navigation.
- Predictable patterns over page-specific inventions.
- Dense, readable information over excessive whitespace.
- Safe mutations over optimistic ambiguity.
- Role-relevant complexity over exposing the entire ERP to everyone.
- Accessible semantics and keyboard operation as release requirements.

## 3. Priority definitions

### P0 - Critical

Work that can cause destructive mistakes, duplicate financial or operational mutations, serious data confusion, or major accessibility failure. P0 work must be complete before the affected workflow is considered releasable.

### P1 - High impact

Work that affects everyday navigation, retrieval, data entry, staff productivity, or many roles. P1 work should be completed before broad rollout.

### P2 - Medium

Work that improves consistency, scale, discoverability, and maintainability after the core workflows are safe and efficient.

### P3 - Polish

Visual refinement and optional productivity enhancements. P3 work must not delay P0/P1 work.

## 4. P0 work - safety and correctness of interaction

### UX-P0-01 - Complete the destructive-action safety audit

Affected users: Administrators, finance staff, HR, admissions, and anyone with update/delete/archive permissions.

Current risk: The shared confirmation dialog has been improved, but every destructive or irreversible workflow still needs to be checked for consistent use. Potential examples include archive, delete, refund, reverse payment, revoke access, reject admission, remove guardian, close incident, and reset/configuration actions.

Work required:

1. Inventory every destructive action across `app/`, `features/`, and server actions.
2. Replace ad-hoc destructive buttons with the shared confirmation contract.
3. State the specific consequence and the affected entity in the confirmation copy.
4. Prefer archive/soft-delete where business rules allow it.
5. Add pending protection so repeated clicks cannot submit the mutation twice.
6. Keep the dialog open when the mutation fails and show an actionable error.
7. Confirm that backend authorization and atomic mutation rules remain authoritative.

Primary files: `components/common/confirm-dialog.tsx`, feature action components, finance/refund/payment workflows, user access workflows, admissions transitions, inventory/procurement workflows.

Acceptance criteria:

- Every destructive action has an explicit, scoped consequence message.
- Keyboard users can open, cancel, confirm, and escape the dialog.
- Focus moves into the dialog and returns to the trigger after close.
- A pending mutation disables duplicate confirmation.
- Failure leaves the user in context with a human-readable retry path.
- Tests cover at least archive, refund/reversal, and permission/access removal.

### UX-P0-02 - Make mutation state unambiguous

Affected users: All roles, especially finance and attendance staff.

Current risk: Forms use several different patterns for saving, refreshing, inline messages, and toasts. Some operations can leave users unsure whether the server accepted the action.

Work required:

1. Define one mutation feedback contract: idle, submitting, success, recoverable error, and authorization/session error.
2. Keep the submit control disabled while the mutation is pending.
3. Preserve entered values and field errors on failure.
4. Use durable inline feedback for important mutations; reserve toasts for short-lived confirmations.
5. Ensure server action responses never expose raw database/provider errors.
6. Add a visible error to `components/layout/campus-switcher.tsx` when campus switching fails.
7. Verify sign-out/session-expiry behavior does not silently discard an in-progress task.

Primary files: `components/forms/submit-button.tsx`, `components/common/error-state.tsx`, feature action/form components, `components/layout/campus-switcher.tsx`, `components/layout/user-menu.tsx`.

Acceptance criteria:

- A user can always distinguish saving from saved and failed.
- No important mutation silently fails or silently succeeds.
- An accidental double click creates only one logical mutation.
- Session expiry gives a clear recovery path without displaying technical details.

### UX-P0-03 - Finish modal and overlay accessibility

Affected users: Keyboard and screen-reader users; users on small screens.

Current risk: Confirmation behavior is improved, but there is no common overlay contract for focus trapping, focus restoration, nested overlays, drawers, dropdowns, and future dialogs.

Work required:

1. Add or adopt a reusable dialog/drawer primitive with focus trap and focus restoration.
2. Define whether clicking the backdrop closes each overlay type; do not close critical workflows accidentally.
3. Support Escape consistently, except while an irreversible request is actively pending.
4. Prevent background scroll for every modal/drawer.
5. Ensure nested dialogs are avoided or explicitly managed.
6. Add accessible names and descriptions without adding redundant ARIA.

Acceptance criteria:

- Every overlay is operable with keyboard only.
- Focus never escapes a blocking modal.
- Closing an overlay returns focus to a meaningful trigger.
- Automated accessibility tests cover the shared primitive.

## 5. P1 work - navigation, orientation, and retrieval

### UX-P1-01 - Establish one scalable information architecture

Affected users: All staff roles; highest impact for administrators.

Current issue: The navigation has task-oriented groups now, but the full route inventory, labels, permissions, and route presentation modes are not yet governed from one consistent product map.

Work required:

1. Reconcile `config/nav.ts` with `config/modules.ts` and the actual `app/` routes.
2. Remove duplicate destinations or explain why a destination appears in more than one role context.
3. Use user language rather than internal terms where possible.
4. Keep high-frequency work above rarely used configuration.
5. Define a clear top-level structure such as Overview, Students, Academics, Attendance, Exams, Finance, People, Operations, Reports, and Administration based on user testing.
6. Define parent active states for every nested route.
7. Ensure a user never sees a link they cannot use because of missing permission.
8. Decide whether section collapse is needed after observing real sidebar length; do not add collapse only for visual novelty.

Primary files: `config/nav.ts`, `config/modules.ts`, `components/layout/sidebar.tsx`, `components/layout/mobile-sidebar.tsx`.

Acceptance criteria:

- An administrator can predict the location of common tasks without scanning the entire menu.
- Teacher, parent, student, alumni, finance, and staff views show only relevant work.
- Every visible item has a valid route, permission, label, icon, and active-state rule.
- A route inventory test detects orphaned or duplicate navigation destinations.

### UX-P1-02 - Add reliable page orientation

Affected users: All users on deep routes, especially reception and administrators managing entity records.

Current issue: Page headers now avoid repeated branding, but most routes still do not show a consistent breadcrumb or parent context. Student detail tabs are understandable only after learning the local pattern.

Work required:

1. Create a typed breadcrumb policy for module, collection, entity, and sub-section routes.
2. Use labels from the route registry rather than displaying raw URL segments.
3. For dynamic records, show the entity name when available and a safe loading placeholder otherwise.
4. Add a skip link and ensure the main landmark has a stable name.
5. Mark the current page/tab with semantic state, not only color.
6. Make back/parent navigation predictable without overriding browser history.

Primary files: `components/common/page-header.tsx`, new breadcrumb primitive, `components/layout/dashboard-shell.tsx`, student/entity detail routes, `config/modules.ts`.

Acceptance criteria:

- A user can identify module, record, and sub-section context from every deep page.
- Breadcrumb links work on desktop and mobile.
- Dynamic entity names do not expose raw IDs as primary labels.
- Keyboard and screen-reader users can identify the current section.

### UX-P1-03 - Finish the application shell behavior

Affected users: All roles.

Work required:

1. Give the sticky header a concise current-context treatment on mobile, where the page title is currently hidden.
2. Make the organization and campus context persistent and visually clear without consuming excessive header width.
3. Persist theme choice intentionally or remove the toggle until persistence is supported.
4. Add `aria-expanded`, outside-click, Escape, focus restoration, and keyboard navigation to the user menu.
5. Give notifications a meaningful unread state and a destination-specific label.
6. Define behavior for narrow widths where campus switcher, search, and account controls compete.

Primary files: `components/layout/header.tsx`, `components/layout/user-menu.tsx`, `components/layout/org-switcher.tsx`, `components/layout/campus-switcher.tsx`, `components/layout/notifications-menu.tsx`.

Acceptance criteria:

- Header controls remain usable at 390px, 768px, 1024px, and desktop widths.
- Campus-switching success and failure are visible.
- Theme choice survives a page reload if the toggle remains.
- User and notification menus are keyboard accessible and do not remain open after navigation.

### UX-P1-04 - Standardize page-level search and filtering

Affected users: Reception, finance, HR, admissions, administrators, teachers.

Current issue: The student page now has a URL-backed search bar, but other modules mix server query parameters, client-side filtering, hidden filters, and no filters at all.

Work required:

1. Define a typed list-query contract for `search`, page, sort, status, date, class, section, and other domain filters.
2. Use visible `FilterBar` controls on high-volume pages.
3. Preserve active filters in the URL across pagination and refresh.
4. Show active filter chips or a readable filter summary.
5. Provide one visible Clear action whenever filters are active.
6. Debounce only where it improves retrieval; keep Enter/search behavior predictable.
7. Avoid client-only filtering after a server-paginated result.
8. Add a filter reset policy when the campus or role context changes.

Primary files: `components/common/filter-bar.tsx`, `components/common/search-input.tsx`, `components/data-table/data-table-toolbar.tsx`, `components/data-table/server-pagination.tsx`, `features/shared/components/module-overview.tsx`, list pages.

Acceptance criteria:

- A copied URL reproduces the same list view.
- Pagination does not silently discard filters.
- Search results represent the full authorized dataset, not only the current loaded page.
- Empty filtered results explain how to clear or adjust the filter.

### UX-P1-05 - Decide and implement search scope

Affected users: Reception and administrators who retrieve records while speaking with parents/students.

Current issue: The header search is still student-specific even though its placement resembles global search.

Work required:

1. Measure whether users need cross-module search or only a faster student lookup.
2. If student lookup is the priority, label and optimize it as a dedicated lookup with name, admission number, class, and section context.
3. If cross-module search is justified, design a permission-aware command/search surface for students, staff, invoices, admissions, pages, and modules.
4. Add keyboard shortcut behavior only after the search scope and result ranking are defined.
5. Never show records or modules outside the authenticated user's scope.

Acceptance criteria:

- Search scope is obvious before typing.
- Results show entity type and useful context.
- Enter/click navigation is keyboard accessible.
- Search results obey role, organization, campus, and record permissions.

## 6. P1 work - consistent data screens

### UX-P1-06 - Create and migrate to one operational list-page pattern

Affected users: All staff who work with lists.

Target structure:

```text
PageHeader: title, purpose, one primary action
FilterBar: search, common filters, More filters, Clear
Content: table/list with stable loading, empty, and error states
Pagination: total, page, previous, next, preserved query
```

Work required:

1. Define a typed list-page composition using existing primitives.
2. Migrate Students, Admissions, Attendance, Fees, HR, Users, Library, Inventory, and Procurement first.
3. Keep domain-specific controls as slots instead of duplicating page headers or toolbars.
4. Remove cards that provide decoration but no grouping or decision value.
5. Make the primary action singular and obvious.

Acceptance criteria:

- Similar list workflows have the same placement and interaction rules.
- Users can identify title, purpose, primary action, filters, records, and pagination without training for each module.
- Responsive behavior is defined for every list.

### UX-P1-07 - Make tables productive for high-volume work

Affected users: Finance, HR, attendance, admissions, administrators.

Current issue: The shared table has baseline semantics, but many routes render bespoke tables or card lists. Sorting, bulk selection, row actions, sticky context, and mobile column prioritization are inconsistent.

Work required:

1. Migrate high-volume tables to `DataTable` or a justified domain-specific extension.
2. Define column alignment and numeric/date formatting rules.
3. Add sorting only to columns users actually sort by.
4. Add bulk selection/actions for fee collection, attendance correction, admissions review, and imports where the server contract supports atomic bulk operations.
5. Keep the most common row action visible; move secondary actions to an overflow menu.
6. Add sticky headers only where long scrolling makes them useful.
7. Define mobile behavior per table: horizontal scroll, priority columns, or card conversion.
8. Add table captions, column scopes, row focus, and meaningful empty states everywhere.

Primary files: `components/data-table/`, high-volume route pages, feature list components, server pagination/query contracts.

Acceptance criteria:

- A finance user can find, filter, inspect, and act on a record without losing context.
- Row actions do not create accidental-click hotspots.
- Keyboard users can reach every action.
- Mobile users can identify the primary columns without unusable shrinkage.

### UX-P1-08 - Normalize empty, loading, and error states

Affected users: All roles, especially first-time users and users on slow networks.

Current issue: Shared primitives exist, but many routes still repeat generic `No ... found` text or expose no retry affordance. Only some routes use stable loading skeletons.

Work required:

1. Replace repeated empty paragraphs with `EmptyState` using reason, next step, and action.
2. Distinguish no records from no records matching filters and unauthorized access.
3. Add page-specific skeleton layouts that match the final content shape.
4. Add retry to recoverable data failures.
5. Keep the page header and filters visible while content loads or fails.
6. Add `aria-busy`, live-region behavior, and non-color status where appropriate.
7. Ensure raw exception names, database codes, and provider errors never reach the main UI.

Primary files: `components/common/loading-state.tsx`, `components/common/error-state.tsx`, `components/common/empty-state.tsx`, route `loading.tsx`/`error.tsx` files, repeated inline states.

Acceptance criteria:

- Every major dataset has loading, empty, filtered-empty, error, and retry behavior.
- Layout does not jump materially between loading and loaded states.
- A user always knows the next safe action.

## 7. P1 work - forms and entity workflows

### UX-P1-09 - Establish accessible form foundations

Affected users: All roles; especially keyboard, screen-reader, and mobile users.

Current issue: Labels and controls are not uniformly associated. Server errors are not consistently linked to fields. Required/optional conventions and save feedback vary by feature.

Work required:

1. Extend shared form fields to generate stable control IDs.
2. Set `htmlFor` on every visible label.
3. Associate field errors with `aria-describedby` and invalid state.
4. Define required/optional copy and validation timing.
5. Use semantic input types for dates, email, phone, currency, and numeric values.
6. Preserve entered values after recoverable server errors.
7. Add unsaved-change behavior only for forms where navigation can cause meaningful data loss.
8. Ensure cancel/reset actions have explicit type and clear scope.
9. Audit native select, checkbox, upload, date, and textarea behavior on touch devices.

Primary files: `components/forms/`, `components/ui/label.tsx`, `components/ui/input.tsx`, upload fields, all feature forms.

Acceptance criteria:

- Every field has a programmatic name, label, value, required state, and error association.
- Keyboard focus order follows task order.
- Validation messages explain how to fix the problem.
- Form submit state is visible and duplicate submission is prevented.

### UX-P1-10 - Refactor student creation into a task-oriented form

Affected users: Administrators and admissions/reception staff.

Current issue: The form is now on its dedicated page, but it remains a flat grid containing identity, enrollment, contact, and optional guardian information.

Work required:

1. Group fields into Personal information, Enrollment, Contact, Guardian, and Additional information.
2. Make the minimum creation path obvious and keep optional sections collapsed or progressive.
3. Explain which fields are required to create a student versus required to enroll one.
4. Preserve campus -> academic year -> class -> section dependencies without resetting unrelated fields.
5. Add a clear success destination: stay on the list, open the new profile, or create another.
6. Test guardian add/remove behavior and error restoration.
7. Add stable field IDs and screen-reader error descriptions.

Primary files: `app/(dashboard)/students/new/page.tsx`, `features/students/components/student-create-form.tsx`, student schema/actions.

Acceptance criteria:

- A receptionist can create a basic student without understanding every optional field.
- An administrator can complete enrollment without searching for dependent options.
- The form is usable at 390px width without horizontal scrolling.
- Success and failure outcomes are unambiguous.

### UX-P1-11 - Create a reusable entity detail pattern

Affected users: Administrators, reception, teachers, finance staff.

Current issue: Student detail has many tabs and domain data, but lacks a consistent breadcrumb, strong summary, tab semantics, and a reusable pattern for other entities.

Work required:

1. Define `EntityHeader` with name, stable identifier, key status, class/role, contact, and primary action.
2. Define a labelled entity navigation pattern for Overview, Academic, Attendance, Fees, Documents, Guardians, Activity, and other applicable sections.
3. Show only relevant tabs for the current permission and entity state.
4. Use human labels rather than raw route tokens such as `timeline` or `medical` without context.
5. Add a consistent back-to-list action and preserve list search/filter state where practical.
6. Apply the pattern to students first, then teachers/employees, admissions, invoices, and transport records.

Primary files: student detail route, new `components/common/entity-header.tsx`, new entity-tabs primitive, detail pages.

Acceptance criteria:

- A user can identify the record and its most important state before reading tabs.
- Current tab is announced semantically and visually.
- Deep links open the correct tab and preserve authorization behavior.
- The pattern works for long names and narrow screens.

## 8. P1 work - role dashboards and workflow efficiency

### UX-P1-12 - Replace generic dashboard content with role-aware action surfaces

Affected users: Administrators, teachers, parents, students.

Current issue: The management dashboard mixes operational KPIs with a technical `Tenant boundary` metric and displays a static empty action queue. Portal redirects exist, but dashboard actions need stronger role-specific prioritization.

Work required:

1. Define dashboard goals per role.
2. Administrator: pending approvals, attendance exceptions, fee collection, admissions, alerts, and recent activity.
3. Teacher: today's timetable, assigned classes, attendance to complete, marks/tasks due, and notices.
4. Accountant: today's collections, unpaid/overdue invoices, pending reconciliation, refunds, and receipt actions.
5. Reception: student lookup, admissions queue, today's visitors, quick-create actions, and outstanding requests.
6. Parent/student: next timetable item, attendance, assignments, fees/receipts, notices, and simple support paths.
7. Remove technical assurance cards from operational dashboards; place them in administration/observability.
8. Make every alert/card either actionable or clearly informational.

Primary files: `app/(dashboard)/dashboard/page.tsx`, portal dashboard components, dashboard API contracts, `components/charts/`.

Acceptance criteria:

- Each role sees a small set of relevant next actions.
- An empty action queue explains why it is empty and offers useful navigation.
- No dashboard card is present only to fill space.
- Dashboard data and links are permission-scoped and campus-scoped.

### UX-P1-13 - Optimize the highest-frequency workflows

#### Attendance

Target flow: Select class/section -> select date/period -> mark attendance -> review exceptions -> save -> confirm result.

Work required: Reduce context switches, retain class/date context, support keyboard movement through students, clearly distinguish unmarked from absent, and provide correction/history access without leaving the workflow.

Acceptance: A teacher can complete a normal class attendance session without navigating through unrelated modules or losing the selected class/date.

#### Fee collection

Target flow: Search student -> see outstanding balance -> record payment -> confirm provider/ledger state -> issue receipt.

Work required: Make student identity and outstanding amount prominent, keep payment method and amount validation together, show provider/pending/failed states, and make receipt access immediate after success.

Acceptance: Finance staff can complete a payment with one retrieval step and one clear confirmation path; failures do not look like success.

#### Admissions

Target flow: Search enquiry/application -> inspect completeness -> review -> approve/reject with reason -> see next state.

Work required: Make missing documents and next action visible, avoid separate pages for information needed in the decision, and confirm irreversible transitions.

Acceptance: A reviewer can understand application state and required action without opening multiple unrelated modules.

#### Reception/student lookup

Work required: Optimize search by name/admission number, show class/section/status context, keep recent search state, and make contact/profile/fee actions reachable from the result.

Acceptance: A receptionist can identify the correct student quickly while speaking with a parent.

### UX-P1-14 - Make generic catalog routes honest and scalable

Affected users: Users of academic setup, operations, configuration, reports, and less mature modules.

Current status: Completed for the released surface. The route registry now owns route ownership, permission, presentation, and release status. Dedicated pages remain available, while reserved/planned routes, generic catalog routes, and generic integration fallbacks are hidden from navigation and return not-found on direct access.

Repository implementation:

1. Added an explicit route presentation/release registry with owner and permission metadata.
2. Removed generic catch-all rendering and the `module_records` fallback mutation path.
3. Kept the Foundation academic setup pages and dedicated analytics/report workflows released.
4. Added regression coverage for hidden navigation, direct route rejection, breadcrumb labels, and the catalog boundary.

Primary files: `config/route-registry.ts`, `config/nav.ts`, `server/api/routes/catalog.routes.ts`, and the catch-all route boundary.

Acceptance criteria:

- Users can tell whether a page is a released domain workflow or an unavailable reserved route.
- Titles and entity labels are user-facing and meaningful.
- High-volume/financial/scheduling workflows are not represented only by generic records.

## 9. P1 work - responsive and accessibility completion

### UX-P1-15 - Complete the responsive behavior matrix

Required viewports: 390px phone, 768px tablet, 1024px compact desktop, 1440px desktop.

Work required:

1. Test sidebar/drawer, header, campus switcher, page header, filters, tables, tabs, forms, dialogs, uploads, and charts at each width.
2. Define whether each dense table scrolls, prioritizes columns, or becomes cards.
3. Ensure buttons and row actions remain reachable without overlapping or clipping.
4. Prevent long labels and entity names from breaking layout.
5. Ensure forms use one-column layouts where scanning and touch entry require it.
6. Test landscape phone and browser zoom to 200%.
7. Verify sticky header/sidebar layers do not obscure content or dialog focus.

Acceptance criteria:

- No horizontal page overflow outside intentionally scrollable data regions.
- No primary action is hidden at mobile widths.
- Tables and tabs have an explicit narrow-screen strategy.
- Touch targets and focus indicators remain usable.

### UX-P1-16 - Establish a practical WCAG 2.1 AA baseline

Work required:

1. Add keyboard-only journeys for navigation, search, filters, forms, tables, tabs, menus, dialogs, uploads, and pagination.
2. Add automated axe checks for shared shell/primitives and representative pages.
3. Verify color contrast for primary, muted, warning, success, destructive, disabled, and focus states.
4. Remove icon-only controls without accessible names.
5. Associate labels, descriptions, field errors, table headers, live status, and dialog content.
6. Add reduced-motion behavior if motion is introduced.
7. Test screen-reader announcements for loading, errors, success, filters, and current navigation.
8. Add a visible skip link and confirm landmark structure.

Acceptance criteria:

- No critical or serious automated accessibility violations on the shared shell and representative workflows.
- Core workflows are completable without a mouse.
- Color is never the only status signal.
- Accessibility regressions are included in CI for changed shared components.

## 10. P2 work - consistency, scale, and maintainability

### UX-P2-01 - Centralize status vocabulary

Work required:

1. Define typed status registries for students, attendance, fees, admissions, exams, HR, transport, safety, inventory, and communication.
2. Map internal values to human labels and semantic variants.
3. Add text and optional icons where they improve scanning; never rely on color alone.
4. Standardize capitalization, dates, currency, empty values, and status ordering.
5. Use the shared status component in tables, cards, profile headers, and transitions.

Primary files: `components/common/status-badge.tsx`, feature status maps, table/card pages.

### UX-P2-02 - Migrate bespoke cards, tables, and empty states

Work required:

1. Inventory repeated `rounded border p-*` list/card patterns.
2. Decide which are genuine cards, list rows, or tables.
3. Replace repeated page headers, toolbar layouts, action buttons, and empty paragraphs with shared primitives.
4. Keep domain-specific presentation when it materially improves comprehension.
5. Do not abstract one-off layouts prematurely.

Acceptance: Similar workflows look and behave similarly without forcing unrelated domains into one generic UI.

### UX-P2-03 - Improve form grouping and progressive disclosure beyond Students

Priority modules: admissions applications, user access, employee/HR, fees/configuration, transport allocation, health/safety, procurement, and CMS.

Work required:

1. Identify required minimum path and optional detail for each form.
2. Group by task rather than database table.
3. Use sections or accordions where they reduce scanning; use steps only when earlier decisions control later data.
4. Keep review/submit controls visible and consistent.
5. Add draft/unsaved behavior only when required by the workflow.

### UX-P2-04 - Define design tokens and density rules

Current foundation: `app/globals.css`, `tailwind.config.ts`, and shared UI components exist, but route-level spacing, borders, radii, status colors, and typography still vary.

Work required:

1. Define semantic tokens for background, foreground, muted, border, primary, success, warning, destructive, and focus.
2. Define density tiers for operational tables, forms, cards, and dashboards.
3. Define heading, body, metadata, helper, and error typography.
4. Normalize page padding, card padding, field gaps, table cell padding, and action spacing.
5. Verify dark mode contrast and component states before expanding theme use.

Acceptance: New UI can be built from tokens without inventing arbitrary values, while existing brand identity is preserved.

### UX-P2-05 - Improve report and export workflows

Affected users: Finance, administrators, HR, and operations.

Work required:

1. Show selected report scope, filters, row count, and data freshness.
2. Give exports a pending/success/failure state and prevent duplicate downloads.
3. Make CSV/Excel/PDF action labels and format consequences clear.
4. Provide an actionable empty state when no rows match.
5. Preserve report filters in the URL.
6. Add background/queued delivery when exports are too large for synchronous interaction.

Primary files: reports workspace, export routes, report definitions, list/filter primitives.

### UX-P2-06 - Improve perceived performance without overstating offline capability

Work required:

1. Keep server components for data fetching and client components only for interaction.
2. Remove unnecessary option/data requests from list pages, following the student-page correction.
3. Add Suspense/loading boundaries to slow, independently useful sections.
4. Avoid loading large datasets when server pagination or scoped options suffice.
5. Audit repeated icon/component imports and client bundle size.
6. Measure route transition time, first contentful content, table render cost, and layout shift.
7. Add caching/revalidation only where freshness and authorization semantics are explicit.
8. Treat connectivity awareness and limited cache fallback separately from full offline write support.

Acceptance: Performance improvements preserve tenant scope, freshness, mutation authority, and clear pending state.

## 11. P3 work - polish after core work is proven

### UX-P3-01 - Motion and transition system

Only after usability testing:

- Add short transitions for drawers, dropdowns, and lightweight state changes.
- Respect `prefers-reduced-motion`.
- Avoid animation on every card or route transition.
- Never delay repetitive operational work for decoration.

### UX-P3-02 - Optional productivity enhancements

Consider only after measuring repeated work:

- Recent students/entities.
- Saved filters or table views.
- Keyboard shortcuts for finance and attendance.
- Command palette for navigation.
- Copy-to-clipboard for IDs and payment references.
- Bulk import/export shortcuts.

Each feature needs a discoverability, permission, mobile, and support strategy before implementation.

### UX-P3-03 - Visual refinement

- Normalize icon families and icon meaning.
- Refine border/shadow use so cards communicate grouping rather than decoration.
- Tune table density and row hover/focus states.
- Improve chart legends, axis labels, empty chart states, and color contrast.
- Review dark mode, print styles, and report/receipt layouts.

## 12. Role-specific completion checklist

### School administrator

- Can reach Students, Admissions, Attendance, Fees, Reports, and Settings predictably.
- Can see pending actions rather than vanity metrics.
- Can understand current campus and permission context.
- Can complete create/edit/archive workflows with safe confirmation and feedback.

### Teacher

- Sees only relevant teaching and portal tasks.
- Can complete attendance in the target four-step flow.
- Can reach timetable, classes, marks, lesson plans, assignments, and notices without administrative noise.
- Can use the workflow on a phone/tablet.

### Accountant/finance staff

- Can search/filter students and invoices quickly.
- Can see amount, balance, payment state, and receipt action in one context.
- Can use dense tables, keyboard navigation, safe confirmations, and bulk operations where supported.
- Never sees pending provider work as completed payment.

### Reception staff

- Can find a student by name/admission number with class and status context.
- Can reach profile, contact, fee, admission, and quick actions without deep navigation.
- Can operate the lookup while interacting with a parent.

### Parent/student

- Sees simple terminology and only linked/authorized records.
- Can use the portal on a phone.
- Can find timetable, attendance, assignments, results, fees/receipts, and notices quickly.
- Never encounters administrative configuration or technical implementation terms.

## 13. Implementation phases and dependencies

```text
P0 safety and mutation feedback
        |
        v
shared shell + route/permission inventory
        |
        v
list/search/filter/table contracts
        |
        +--> forms and entity detail
        |
        v
role dashboards + attendance/fees/admissions workflows
        |
        v
responsive/accessibility/performance evidence
        |
        v
P2 consistency and P3 polish
```

### Phase A - Safety baseline

- Complete UX-P0-01 through UX-P0-03.
- Add focused mutation and accessibility tests.
- Do not broaden visual redesign while destructive behavior is unresolved.

### Phase B - Navigation and shell

- Complete UX-P1-01 through UX-P1-03.
- Reconcile routes, permissions, labels, active states, mobile behavior, and breadcrumbs.

### Phase C - Retrieval and data screens

- Complete UX-P1-04 through UX-P1-08.
- Migrate Students, Attendance, Fees, Admissions, HR, and Users first.

### Phase D - Forms and entity workflows

- Complete UX-P1-09 through UX-P1-11.
- Start with student creation/detail, then apply the proven pattern to other high-volume entities.

### Phase E - Role productivity

- Complete UX-P1-12 through UX-P1-14.
- Use real workflow observation to prioritize attendance, fee collection, admissions, and lookup.

### Phase F - Release evidence and scale

- Complete UX-P1-15 and UX-P1-16.
- Begin P2 token/consistency/performance work.
- Defer P3 polish until core workflows pass evidence gates.

## 14. Validation and release gates

### Static and automated gates

- `npm.cmd run typecheck` passes.
- `npm.cmd run lint` passes.
- `npm.cmd run test` completes within an agreed limit with no unreviewed failures.
- `npm.cmd run build` passes on the final tree.
- Shared component tests cover navigation, buttons, dialogs, tables, form fields, loading/error/empty states.
- Axe or equivalent accessibility checks pass on shared shell and representative pages.

### Authenticated browser journeys

Run with real role fixtures and representative tenant/campus data:

1. Administrator: login -> navigate grouped sidebar -> search student -> open profile -> create student -> return to list.
2. Reception: search student -> verify class/status -> open contact/profile action.
3. Teacher: open dashboard -> select class/date -> mark attendance -> save -> recover from validation error.
4. Finance: search invoice -> record payment -> handle pending/failure -> open receipt.
5. Admissions: inspect application -> verify missing information -> approve/reject with reason.
6. User admin: invite/edit access -> confirm permission change -> verify restricted navigation.
7. Destructive action: open confirmation -> keyboard cancel/escape -> confirm pending -> simulate failure -> retry.

### Responsive matrix

Run every journey at 390px, 768px, 1024px, and 1440px, including browser zoom at 200%.

### Accessibility matrix

- Keyboard-only navigation.
- Screen reader on at least one desktop and one mobile platform.
- Focus visibility and focus restoration.
- Contrast and non-color status.
- Reduced motion.
- Form error announcement.
- Table navigation and horizontal scroll.

### Production-readiness boundary

Local typecheck, lint, unit tests, and build prove repository-local behavior only. They do not prove authenticated provider behavior, deployment configuration, production data, load, backup/restore, security review, or real-device usability. Those remain separate release gates.

## 15. Definition of done for the UX backlog

The UX backlog is complete only when:

- P0 issues have no open safety or duplicate-mutation findings.
- P1 workflows have consistent navigation, orientation, search/filter, form, table, feedback, and responsive behavior.
- Each role completes its checklist using authenticated browser evidence.
- Shared components have automated regression and accessibility coverage.
- High-frequency generic routes have been intentionally retained or graduated to dedicated workflows.
- Dashboard content is actionable and role-appropriate.
- Performance and layout stability have measured budgets.
- Remaining P2/P3 items are explicitly accepted as non-blocking rather than silently forgotten.

## 16. Repository implementation status and local evidence

The following source-level areas are implemented in this checkout and should be retained as the working contract:

- `config/nav.ts` and `config/route-registry.ts`: grouped navigation metadata, role filtering, active-prefix rules, route labels, breadcrumbs, route presentation modes, and inventory tests.
- `components/layout/`: permission-filtered desktop/mobile navigation, header context, campus failure feedback, theme persistence, notification state, menu keyboard behavior, skip link, and main landmark.
- `components/common/` and `components/data-table/`: confirmation dialogs, mutation feedback, loading/error/empty states, field errors, filter summaries, table captions/scopes, and query-preserving pagination.
- `features/shared/`: reserved catalog definitions remain data-preserving server infrastructure; no generic workspace or `module_records` mutation is released.
- Students, admissions, attendance, fees, HR/users, library, inventory, procurement, safety, facilities, assets, CMS/community, integrations, and reports: representative list, form, status, confirmation, feedback, and empty-state migrations.
- `tests/unit/confirm-dialog.test.tsx`, `tests/unit/destructive-workflows.test.tsx`, `tests/unit/nav.test.ts`, and existing student-form coverage: regression coverage for shared interaction contracts.

Current local evidence for the implementation pass:

- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd run test`: passed, 44 files and 149 tests.
- `npm.cmd run build`: passed; all 123 routes generated.
- `npm.cmd run test:e2e`: passed 3 unauthenticated smoke tests; 6 authenticated tests are gated on an operator-provided staging storage state.

Still-open release evidence is intentionally separate: authenticated role journeys, 390/768/1024/1440px browser checks, 200% zoom, screen-reader validation, axe/automated browser accessibility checks, real-device interaction, provider behavior, production configuration, load, security, backup/restore, and deployment verification. Local gates do not establish those conditions.
