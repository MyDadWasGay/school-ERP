---
name: school-erp-flutter-ui
description: Guidelines and design context for the School ERP Flutter app UI/UX, including Material 3 usage, design tokens, app layout, role-aware dashboards, and components. Use this whenever implementing or modifying UI in the Flutter app.
---

# School ERP Flutter App — UI/UX and Design Context

## 1. Design Goal

Create a modern, calm, highly usable School ERP Android experience for students, parents, teachers, administrators, principals, finance teams, HR, and operational staff.

The app should feel like a purpose-built school operations product rather than a generic admin dashboard squeezed into a phone.

Primary design qualities:

- clear
- trustworthy
- fast
- friendly without becoming childish
- information-dense only where the role requires it
- easy to scan in seconds
- accessible
- consistent across roles
- optimized for repeated daily workflows

---

# 2. Recommended UI Foundation

## Primary recommendation: Flutter Material 3 + custom ERP design system

Use Flutter's native Material 3 components as the base and apply a custom token layer for brand identity.

Why:

- first-party Flutter integration
- strong Android conventions
- broad component coverage
- theming support
- accessibility foundations
- adaptive layout capabilities
- lower dependency risk than replacing the entire component framework

Use Material 3 primitives for:

- navigation bar
- navigation rail on large devices/tablets
- app bars
- cards
- buttons
- dialogs
- sheets
- menus
- chips
- segmented buttons
- progress indicators
- text fields
- date/time pickers
- snackbars

Official references:
- https://docs.flutter.dev/ui/design/material
- https://m3.material.io/develop/flutter

---

# 3. UI Library Evaluation

## A. Material 3 — RECOMMENDED CORE

**Use:** Yes, as the app foundation.

Strengths:
- maintained alongside Flutter
- Android-native behavior
- excellent theming
- broad controls
- accessibility-friendly foundation
- adaptive/large-screen guidance

Tradeoff:
- default styling can look generic unless a deliberate design-token layer is added

Decision:

> Use Material 3 as the component foundation and create custom School ERP components by composing Material widgets.

---

## B. shadcn_ui for Flutter — OPTIONAL, NOT THE CORE

Package:
- https://pub.dev/packages/shadcn_ui

Strengths:
- polished modern visual language
- customizable components
- useful inspiration for forms, cards, dialogs, command-style interactions and desktop-like surfaces

Tradeoffs:
- creates another design system to reconcile with Material
- version/Flutter SDK requirements should be checked before adoption
- a school Android app benefits from standard Material behavior

Decision:

> Do not make shadcn_ui the global application framework. Consider individual patterns/components only after compatibility and accessibility testing, or use it as visual inspiration while implementing equivalent Material components.

---

## C. shadcn_flutter — OPTIONAL / EVALUATE CAREFULLY

Package:
- https://pub.dev/packages/shadcn_flutter

It provides a cohesive shadcn-inspired ecosystem across Flutter platforms.

Decision:

> Do not adopt simultaneously with Material and shadcn_ui. If the team wants a shadcn-first aesthetic, run a small isolated prototype before committing. For this ERP, Material 3 remains safer as the primary system.

---

# 4. Supporting Packages

These are not full UI systems but improve the application experience.

## Riverpod

https://pub.dev/packages/flutter_riverpod

Use for predictable async UI state, loading/error states, dependency injection, caching coordination, and feature state.

## go_router

https://pub.dev/packages/go_router

Use for declarative navigation, nested role shells, redirects and notification deep links.

## Dio

https://pub.dev/packages/dio

Use for API networking, interceptors, uploads/downloads, cancellation, timeouts, and progress.

## flutter_secure_storage

https://pub.dev/packages/flutter_secure_storage

Use for persistent sensitive credentials/secrets.

## cached_network_image

https://pub.dev/packages/cached_network_image

Use for remote avatars, school logos, student photographs and image placeholders/caching.

## fl_chart — RECOMMENDED DEFAULT CHART LIBRARY

https://pub.dev/packages/fl_chart

Use as the default charting package for ERP dashboards and analytics. It supports the core visualization types needed by this app, including line, bar, pie, scatter and radar charts, while allowing the app to preserve the custom Material 3 design system.

Recommended uses:
- attendance trends
- academic performance trends
- fee collection charts
- admissions trends
- assignment completion
- grade distributions
- compact dashboard visualizations

Wrap the package behind internal ERP chart components rather than importing `fl_chart` directly throughout feature screens.

## syncfusion_flutter_charts — OPTIONAL ADVANCED ALTERNATIVE

https://pub.dev/packages/syncfusion_flutter_charts

Evaluate only when the product requires advanced chart types, sophisticated interactions, large-data visualization, or features that would otherwise require substantial custom work. Validate licensing and commercial-use requirements before adoption. Do not use both chart libraries casually across the app.

---

# 5. Visual Direction

Avoid the appearance of a traditional ERP with:

- dozens of menu items
- tiny text
- dense tables everywhere
- excessive borders
- too many card colors
- multiple competing button styles
- desktop-style modal forms

Instead use:

- strong hierarchy
- generous but efficient spacing
- clear sections
- task-focused dashboards
- compact summary cards
- bottom sheets for quick mobile actions
- full-page flows for important forms
- lists instead of tables on phones
- clear status chips
- consistent icons
- progressive disclosure

---

# 6. Design Token System

Define tokens centrally rather than hardcoding widget styling.

## Color tokens

Semantic tokens:

```text
color.brand.primary
color.brand.onPrimary
color.surface.canvas
color.surface.card
color.surface.elevated
color.text.primary
color.text.secondary
color.text.disabled
color.border.subtle
color.status.success
color.status.warning
color.status.danger
color.status.info
color.attendance.present
color.attendance.absent
color.attendance.late
color.attendance.excused
```

Do not assign random colors per module.

Status colors must always be paired with text/iconography; never communicate status through color alone.

## Spacing

Use a 4-point grid.

Suggested tokens:

```text
space.1 = 4
space.2 = 8
space.3 = 12
space.4 = 16
space.5 = 20
space.6 = 24
space.8 = 32
space.10 = 40
space.12 = 48
```

Default page horizontal padding: 16–20dp depending on viewport.

## Radius

Suggested:

```text
radius.small = 8
radius.medium = 12
radius.large = 16
radius.xlarge = 24
radius.full = 999
```

Avoid making every container a pill.

## Elevation

Keep elevation subtle.

Prefer:
- surfaces
- borders
- spacing

before heavy shadows.

## Typography

Use a clean sans-serif font supported by the product's localization requirements.

Suggested hierarchy:

```text
Display / rare
Headline Large
Headline Medium
Title Large
Title Medium
Body Large
Body Medium
Body Small
Label Large
Label Medium
```

ERP principle:

> Most information belongs in Body/Label sizes. Large typography is reserved for page titles, key metrics and empty states.

---

# 7. App Layout

## Phone

Use bottom navigation for 4–5 highest-frequency destinations.

Additional modules live in **More** or role-specific secondary screens.

Do not put 9–12 tabs in the bottom bar.

## Tablet / foldable

Use NavigationRail or responsive two-pane layouts where appropriate.

Examples:
- student list on left + student detail on right
- approval list + approval detail
- message list + conversation

---

# 8. Global App Bar

Typical structure:

```text
[School logo / Back]    Page Title        [Search] [Notifications/Profile]
```

Dashboard may use:

```text
Good morning, Aisha
Monday, 17 August

[Campus / Child selector if relevant]
```

Avoid repeating organization/campus information on every card.

---

# 9. Role-Aware Home Screens

## Student dashboard

Prioritize:
1. today's classes
2. pending tasks
3. attendance
4. upcoming exams
5. recent results
6. fees/announcements

Suggested composition:

```text
Greeting + avatar

Today
[Next Class card]

Quick summary
[Attendance] [Tasks] [Fees]

Assignments due
[list]

Upcoming exams
[list]

Announcements
[list]
```

---

## Parent dashboard

Top control:

```text
[ Student photo ] John Smith, Grade 7A  ▼
```

Then:

```text
Today's status
[Present] [Next class / school status]

Needs your attention
[Fee due]
[Leave decision]
[New result]

Academics
[Attendance] [Assignments] [Results]

Recent announcements
```

"Needs your attention" should be prominent because parents use the app to act on exceptions.

---

## Teacher dashboard

Top priority is today's work.

```text
Good morning, Mr. Khan

Next class
[Grade 7A · Mathematics · 9:30]
[Open class]

Quick actions
[Take attendance]
[Create homework]
[Enter marks]

Today
08:00 Grade 8B
09:30 Grade 7A
11:00 Free
...

Pending
[2 attendance sessions]
[11 submissions]
```

Do not lead with generic statistics that teachers cannot act on.

---

## Principal/Admin dashboard

Use KPI cards selectively.

```text
School today
[Students present 93%]
[Staff present 96%]
[Collection ₹...]
[Pending approvals 14]

Requires attention
[5 staff leave requests]
[3 admission reviews]
[Fee overdue alert]

Trends / summaries
```

Management dashboards should make anomalies and pending decisions more visually prominent than normal values.

---

# 10. Card Patterns

Define reusable card types.

## MetricCard

```text
Attendance
93.4%
↑ 1.2% from last month
```

## ActionCard

```text
Take Attendance
Grade 7A · Mathematics
9:30 AM
[Start]
```

## AlertCard

```text
Fee due
₹8,000 due on 20 Aug
[View details]
```

## PersonCard

```text
[avatar] Aisha Rahman
         Grade 7A · #1034
         Present today
```

## TimelineCard

For:
- admission history
- approval history
- payments
- leave workflow

Do not create unique card styling for every module.

---

# 11. Status Components

Create one standard `StatusChip` component.

Examples:

```text
Present
Absent
Late
Excused
Pending
Approved
Rejected
Paid
Partially Paid
Overdue
Submitted
Draft
Finalized
```

Each status has:
- semantic color
- label
- optional icon
- accessibility text

---

# 12. Lists Instead of Desktop Tables

On phone, transform tables into structured cards/list rows.

Desktop:

```text
Name | Roll | Status | Remark
```

Mobile:

```text
Aisha Rahman                         Present
Roll 12 · Admission #1034
Remark: —
```

For dense administrative data, provide:
- search
- filter chips
- sorting
- grouped sections
- drill-down detail

instead of horizontal scrolling wherever possible.

---

# 13. Search Pattern

Search must feel immediate.

Use:

```text
[ Search students, admission number, guardian... ]
```

Features:
- debounce requests
- recent searches where privacy policy permits
- filter button
- highlighted matching information
- role-specific search scope

Search should not expose records the user cannot access.

---

# 14. Filter Pattern

Use compact chips for common filters:

```text
[All] [Pending] [Approved] [Rejected]
```

For complex filtering use a modal bottom sheet:

```text
Filter
Class
Section
Date range
Status

[Reset]             [Apply]
```

Always show when filters are active.

---

# 15. Form Design

Forms should be vertically structured and divided into logical sections.

Do not place a 25-field web form on one continuous mobile page without grouping.

Example:

```text
Request Leave

Dates
[Start date]
[End date]

Details
[Leave type]
[Reason]

Attachment
[Add file]

                     [Submit request]
```

Requirements:
- field labels remain visible
- errors appear near the field
- required fields are clear
- keyboard type matches data
- date fields use pickers
- unsaved changes are protected
- main submit action remains easy to find

---

# 16. Attendance UX — Teacher Critical Flow

This should be one of the best-designed flows in the product.

## Screen structure

```text
Grade 7A · Mathematics
17 Aug 2026 · 32 students

[Mark all Present]

Search student

Aisha Rahman
[P] [A] [L] [E]

Rahul Shah
[P] [A] [L] [E]

...

30 Present · 1 Absent · 1 Late
[Save / Submit Attendance]
```

Use large tap targets.

Selecting an exception should be fast.

Do not require opening a dropdown for each student.

Provide:
- unsaved indicator
- offline indicator
- sync state
- confirmation after submission

---

# 17. Marks Entry UX

Avoid a spreadsheet replica on phones.

Use a sequential/list approach:

```text
Mathematics Midterm
Maximum marks: 100

Aisha Rahman
[ 88 ] / 100

Rahul Shah
[ 74 ] / 100

...

[Save draft]     [Review & finalize]
```

Useful features:
- numeric keyboard
- next-field keyboard action
- inline max validation
- absent toggle
- progress count
- auto-save draft where safe

Finalization should show a review screen and explicit confirmation.

---

# 18. Fees UX

Parent/student fee screens must answer four questions immediately:

1. How much is due?
2. When is it due?
3. What has already been paid?
4. What action can I take?

Recommended hierarchy:

```text
Outstanding balance
₹12,500
Due 25 Aug
[Pay now]

Fee breakdown
Tuition                 ₹8,000
Transport               ₹3,000
Activity                 ₹1,500

Payment history
12 Jul   ₹10,000     Paid
12 Jun   ₹10,000     Paid
```

Do not hide the due amount inside a large table.

---

# 19. Results UX

Result summary:

```text
Term 1 Examination
Overall: 86%
Grade: A

Mathematics        91 / 100
Science            88 / 100
English            79 / 100

Teacher remark
"..."

[View report card]
```

Raw marks, grades and teacher remarks remain the primary information. Charts are secondary and should only be added when they reveal a trend, comparison, distribution or relationship that is harder to understand from numbers alone.

---

# 20. Data Visualization, Charts & Analytics Design System

Charts must help a user answer a specific operational or academic question. Do not add charts merely to make dashboards look sophisticated.

The design priority is:

```text
Decision / question
      ↓
Key KPI / raw number
      ↓
Comparison or trend
      ↓
Chart only when it improves understanding
      ↓
Drill-down to underlying records
```

A chart must never be the only way to access an important value. Every important visualization should expose its current value, totals, percentages or summary in text.

## 20.1 Default Flutter chart implementation

Use `fl_chart` as the default visualization package.

Package:
- https://pub.dev/packages/fl_chart

Create an internal abstraction so feature modules do not depend directly on library-specific styling and configuration.

Suggested reusable components:

```text
ErpChartCard
ErpLineChart
ErpBarChart
ErpStackedBarChart
ErpDonutChart
ErpSparkline
ErpProgressMetric
ErpChartLegend
ErpChartTooltip
ErpChartEmptyState
ErpChartSkeleton
ErpAnalyticsPeriodSelector
ErpMetricTrend
```

If advanced enterprise visualization is later required, evaluate `syncfusion_flutter_charts` separately. Do not mix visualization libraries on a screen or feature without a documented reason.

## 20.2 Chart selection rules

### Line chart

Use when the main question is **how something changes over time**.

Good ERP examples:
- student attendance percentage by month
- class attendance trend over the academic year
- student exam performance across terms
- monthly fee collection
- admission/application trends
- library circulation over time

Do not use a line chart for unrelated categories such as subjects with no meaningful order.

### Vertical bar chart

Use for comparison between a manageable number of categories.

Good examples:
- marks by subject
- attendance by class
- fee collection by campus
- applications by admission stage
- students by grade

On narrow phones, avoid cramming many categories into vertical bars. Prefer horizontal bars, aggregation or a drill-down screen.

### Horizontal bar chart

Prefer when category labels are long or ranking is important.

Examples:
- outstanding fees by class
- subject performance ranking
- classes with highest absence rate
- departments by staff count

Sort deliberately when ranking matters.

### Stacked bar chart

Use when both total volume and composition matter.

Examples:
- Present / Absent / Late / Excused by month
- Paid / Pending / Overdue fees by grade
- Submitted / Pending / Late assignments by class

Avoid stacks with too many categories. Four segments should generally be treated as an upper practical limit on mobile.

### Donut chart

Use only for simple part-to-whole relationships with very few categories.

Good examples:
- Paid vs Outstanding
- Present vs Absent when a compact summary is useful
- admission pipeline composition when categories are limited

Always show the total or primary percentage in the center or directly next to the chart.

Do not use donut/pie charts for precise comparison across many slices. Use bars instead.

### Pie chart

Avoid by default. Prefer donut or bar charts because they are usually easier to scan and label on mobile. Use a pie only when there is a clear design reason and no more than a few categories.

### Sparkline

Use inside a KPI card only to communicate a small recent trend.

Example:

```text
Attendance
94.2%   ↑ 1.8%
▁▂▃▃▄▅▆▇
vs previous month
```

A sparkline never replaces the visible metric or change label.

### Progress / radial indicator

Use for a single bounded progress value.

Examples:
- 92% attendance
- 76% syllabus completed
- 68% fee target collected
- 21 / 30 assignments submitted

For simple values, a linear progress bar is often clearer than a circular gauge.

### Heatmap / calendar intensity view

Use carefully for dense temporal patterns such as:
- student attendance calendar
- class absence patterns
- activity/usage by day

Every cell must remain tappable and must expose its exact value/status in text. Never rely on intensity/color alone.

### Distribution chart

Use bars/histograms for:
- grade distribution
- marks bands
- attendance bands

Example:

```text
90–100   ██████  8
80–89    ███████████ 14
70–79    ███████  9
60–69    ███  4
<60      ██  2
```

This is more useful to teachers/principals than a decorative average-only chart.

## 20.3 Charts that should usually be avoided

Do not use these by default in the School ERP mobile app:
- 3D charts
- exploded pie charts
- gauges resembling speedometers for ordinary percentages
- radar charts unless a validated academic use case truly benefits from them
- charts with gradients solely for decoration
- charts with more series than users can reasonably distinguish
- dual Y-axis charts unless the relationship is essential and clearly explained
- animations that delay access to values

Never distort axes or truncate scales in a way that exaggerates differences.

## 20.4 Dashboard hierarchy

Analytics screens should generally use this hierarchy:

```text
Page title + active context
Period selector / filters

KPI cards

Primary trend chart

Important comparisons

Exceptions / alerts

Detailed records or View all
```

Example principal dashboard:

```text
School Overview                     This month ▾

[2,438 Students] [93.8% Attendance]
[₹18.4L Collected] [42 Pending Approvals]

Attendance trend
[ line chart ]
93.8% this month · +1.2% vs last month

Fee collection
[ bar / line chart ]
₹18.4L collected of ₹21.0L due

Attention required
• Grade 8B attendance below 85%
• ₹3.2L overdue more than 30 days

[View attendance details] [View finance]
```

## 20.5 Role-specific analytics

### Principal / School Admin

Prioritize organization health and exceptions:
- attendance trend
- attendance by grade/class
- student enrollment trend
- admission funnel
- fee collected vs due
- overdue fees by grade
- academic performance by grade
- grade distribution
- staff attendance
- pending approvals
- critical operational alerts

Do not overwhelm this dashboard with every available metric. Start with 4–6 high-value KPIs and a small number of primary visualizations.

### Organization Owner / Multi-campus Admin

Prioritize comparisons:
- campus enrollment
- attendance by campus
- fee collection by campus
- outstanding fees by campus
- admissions by campus
- academic performance comparison

Always expose the active campus scope:

```text
All Campuses ▾
```

Changing this context must update every metric and chart consistently.

### Teacher

Prioritize actionable class information:
- class attendance trend
- subject average
- marks/grade distribution
- assignment completion
- students below an attendance threshold
- students showing meaningful academic decline

The teacher should be able to tap a chart element and reach the relevant student/class records.

### Class Teacher

Include:
- class attendance trend
- monthly absence pattern
- class academic average
- subject comparison
- homework completion
- students needing attention

### Student

Keep analytics personal and understandable:
- attendance percentage and trend
- term performance
- subject marks comparison
- assignment completion

Avoid rankings unless school policy explicitly supports showing them and the educational value is clear.

### Parent / Guardian

Keep analytics child-specific:
- child's attendance trend
- subject performance
- exam performance across terms
- assignment completion
- fee/payment status

The child's name/avatar/context must stay visible when a parent can switch children.

### Finance / Accountant

Prioritize money movement and collection risk:
- collection today
- collection this month
- collection trend
- collected vs due
- outstanding amount
- overdue aging
- outstanding fees by class/campus
- payment method breakdown
- recent large/exception transactions where appropriate

Currency values must be formatted consistently and abbreviated only when doing so cannot create ambiguity.

### Admissions

Prioritize funnel health:
- inquiries
- applications
- review/interview counts
- offers/acceptances
- enrollments
- conversion rate
- applications over time
- applications by grade/campus

Funnel stage counts should remain tappable and lead to filtered application lists.

### HR

Useful analytics include:
- staff attendance
- leave by type/status
- leave trends
- headcount by department
- contract/renewal alerts

Avoid exposing sensitive compensation analytics outside explicitly authorized roles.

### Library

Useful analytics include:
- active loans
- overdue books
- books issued over time
- most borrowed categories/titles

### Transport

Useful analytics include:
- students assigned per route
- route capacity utilization
- boarding exceptions
- recurrent delays when tracking data exists

## 20.6 KPI card rules

A KPI card should contain only what is necessary:

```text
Attendance
93.8%
↑ 1.2% vs last month
```

or:

```text
Outstanding fees
₹3.24L
128 students
```

Rules:
- metric first
- short unambiguous label
- optional comparison
- optional compact sparkline
- optional status icon
- no large illustration inside analytics KPI cards
- card should be tappable when a detail screen exists
- comparison text must state its baseline (`vs last month`, `vs previous term`)

Never show an unexplained green/red arrow.

For some metrics, higher is bad. Example: absence and overdue balance. Semantic change direction must reflect the metric meaning rather than assuming upward is positive.

## 20.7 Time-period controls

Charts with temporal data must clearly show the selected period.

Common options:

```text
7 days | 30 days | Term | Academic year
```

or:

```text
Aug 2026 ▾
```

Do not reset the user's period/filter every time the widget rebuilds.

For school-specific analytics, prefer academic-year/term semantics over arbitrary calendar ranges when appropriate.

## 20.8 Chart interaction on phones

Touch interactions must be forgiving.

Recommended behavior:
- tap or drag across a line to expose a tooltip
- tap a bar/segment to select it
- selected item receives a clear non-color-only state
- tooltip displays exact value + label + relevant date/category
- tapping a meaningful selected item may expose a `View details` action
- horizontal scrolling is allowed only when preserving readable categories is better than compressing them
- do not require pinch zoom for ordinary ERP dashboards

Minimum touch target guidance for interactive chart controls should follow the rest of the app's accessibility target sizing. Invisible tiny chart points must not be the only tappable target.

Example tooltip:

```text
September 2026
Attendance: 94.6%
Present: 1,984
Absent: 112
```

## 20.9 Phone, tablet and large-screen behavior

### Phone

- one primary chart per row
- typical chart card height around 220–300dp depending on content
- prioritize 4–8 visible categories
- move legends below the visualization when needed
- use drill-down instead of squeezing labels

### Tablet

Charts may use a 2-column analytics grid when there is enough width.

Example:

```text
┌────────────────────┬────────────────────┐
│ Attendance trend   │ Fee collection     │
├────────────────────┼────────────────────┤
│ Grade comparison   │ Overdue fees       │
└────────────────────┴────────────────────┘
```

Do not simply stretch a phone chart to full tablet width when a more informative composition is available.

## 20.10 Axes and labels

Axes must optimize comprehension rather than show every possible tick.

Rules:
- use concise dates (`5 Aug`, `Sep`, `Term 2`)
- label units (`%`, `₹`, students)
- avoid unnecessary decimal precision
- use locale-aware number/currency formatting
- prevent overlapping labels
- abbreviate thousands/lakhs/millions consistently according to product locale policy
- expose exact values through tooltip or accompanying text
- do not rotate every label vertically unless unavoidable

If using abbreviated currency:

```text
₹1.2L
₹18.4L
```

The drill-down/detail view should expose exact values.

## 20.11 Legends

Legends must use both color and text.

Example:

```text
● Present  93.8%
▲ Late      2.4%
■ Absent    3.8%
```

Icons/shapes are optional but useful where users may have difficulty distinguishing color categories.

Avoid detached legends that force users to repeatedly look back and forth across the screen. Direct labels are preferable when they remain readable.

## 20.12 Semantic colors

Reuse the application's semantic status tokens where appropriate:

```text
color.attendance.present
color.attendance.absent
color.attendance.late
color.attendance.excused
color.status.success
color.status.warning
color.status.danger
color.status.info
```

For neutral comparison series, create chart-specific palette tokens instead of inventing colors inside widgets:

```text
color.chart.series1
color.chart.series2
color.chart.series3
color.chart.series4
color.chart.grid
color.chart.axis
color.chart.tooltipSurface
```

Chart colors must meet theme contrast expectations and work in light/dark mode.

## 20.13 Accessibility

Every meaningful chart needs a semantic/text alternative.

Examples:
- visible KPI summary
- accessible description
- table/list alternative on a detail screen
- screen-reader label summarizing the trend

A screen reader should receive useful meaning such as:

```text
Attendance trend for August through December.
Attendance increased from 89 percent in August to 94 percent in December.
```

not:

```text
chart image
```

Do not rely on:
- red vs green alone
- subtle shade differences
- tiny points
- hover interactions

All critical analytics must remain understandable without perceiving the chart colors.

## 20.14 Loading state

Do not render fake/random chart data while loading.

Use a stable skeleton approximating the final card:

```text
┌───────────────────────────────┐
│ Attendance trend             │
│ ███████                      │
│                               │
│       ▒▒▒▒▒▒▒▒▒▒▒▒           │
│    ▒▒▒▒                       │
│ ▒▒▒                           │
└───────────────────────────────┘
```

Avoid loaders that make the whole dashboard jump when data arrives.

## 20.15 Empty state

Distinguish "zero" from "no data."

Examples:

```text
No attendance data yet
Attendance analytics will appear after attendance is recorded.
```

versus a legitimate value:

```text
Outstanding fees
₹0
All dues are cleared.
```

Never show an empty coordinate grid with no explanation.

## 20.16 Error and stale-data state

A chart failure should not necessarily break the whole dashboard.

Example:

```text
Attendance trend unavailable
Last updated 8:42 AM
[Retry]
```

If cached data is displayed while offline or after refresh failure, label it clearly:

```text
Showing saved data · Updated yesterday 4:15 PM
```

## 20.17 Partial data and provisional values

School data is often incomplete during the day or before result finalization.

Examples:
- today's attendance is only 72% submitted
- marks are still drafts
- current-month fee collection is still in progress

Expose this context rather than presenting partial data as final:

```text
Today's attendance
91.2%
27 of 36 sections submitted
```

Do not compare incomplete current periods against complete historical periods without explicitly communicating the mismatch.

## 20.18 Chart animation

Use subtle entrance/update animation only when it helps users understand change.

Rules:
- short and non-blocking
- no bouncing or decorative motion
- respect reduced-motion/accessibility preferences where available
- avoid replaying animation on minor parent widget rebuilds
- value must remain readable immediately

## 20.19 Drill-down behavior

Analytics should connect to operational data.

Examples:

```text
Tap "Grade 8 — 82% attendance"
        ↓
Grade 8 Attendance
        ↓
Sections / students below threshold
```

```text
Tap "₹3.2L overdue"
        ↓
Outstanding Fees
        ↓
Filtered student/account list
```

Preserve chart filters and active context when navigating to drill-down screens.

## 20.20 Privacy and permissions for analytics

Charts must obey the same backend-driven authorization as detail screens.

Never assume aggregated data is automatically safe to expose. Examples:
- staff salary/payroll analytics
- individual student rankings
- health data
- disciplinary data
- sensitive demographic breakdowns

FastAPI must authorize the underlying analytics endpoint. Hiding a chart in Flutter is not sufficient access control.

## 20.21 Analytics API contract guidance

Do not make Flutter reconstruct complex business analytics from large raw datasets when FastAPI can return a purpose-built aggregation.

Prefer endpoints conceptually like:

```text
GET /api/v1/analytics/attendance/overview?campusId=...&period=...
GET /api/v1/analytics/finance/collections?period=...
GET /api/v1/analytics/academics/class-performance?classId=...&termId=...
```

An analytics response should include enough metadata for correct display:

```json
{
  "metric": {
    "value": 93.8,
    "unit": "percent",
    "comparison": {
      "value": 1.2,
      "direction": "up",
      "baseline": "previous_month"
    }
  },
  "series": [
    {"label": "Apr", "value": 91.1},
    {"label": "May", "value": 92.2},
    {"label": "Jun", "value": 93.8}
  ],
  "updatedAt": "2026-08-15T08:42:00+05:30",
  "isPartial": false
}
```

The backend remains the source of truth for:
- aggregation
- school-specific business rules
- permission scoping
- currency/financial meaning
- academic-year boundaries
- finalized vs provisional data

Flutter remains responsible for presentation and interaction.

## 20.22 Analytics design acceptance checklist

Before shipping a chart, verify:

- the chart answers a defined user question
- a raw KPI/summary is visible
- chart type matches the data relationship
- units and period are explicit
- labels are readable on a small Android device
- exact values are accessible through text or interaction
- loading state exists
- empty state exists
- error state exists
- offline/stale state is handled where applicable
- partial/provisional data is labeled
- dark mode is tested
- color is not the sole encoding
- screen readers receive useful meaning
- tap targets are usable
- chart filters survive drill-down/back navigation when appropriate
- backend permissions are enforced
- performance is acceptable with realistic data volumes

---

# 21. Approval UX

Unified approval item:

```text
Staff Leave Request             Pending

Aisha Khan · Science Teacher
18–20 Aug · 3 days
Medical leave

[View details]
```

Detail page:

```text
Request details
Attachments
Leave balance
Previous approvals / context
Audit timeline

[Reject]                 [Approve]
```

Rejection should request a reason when policy requires it.

Destructive/irreversible decisions need confirmation.

---

# 22. Notifications UX

Notification center groups logically:

```text
Today
• John was marked absent
• Mathematics assignment posted

Yesterday
• Fee payment received
```

Notification row includes:
- category icon
- short title
- concise context
- timestamp
- unread state

Tap deep-links to the actual object, not a generic homepage.

Avoid push messages containing excessive sensitive information on the lock screen. Let users/school policy control notification privacy where appropriate.

---

# 23. Loading UX

Avoid blocking spinners whenever possible.

Use:
- skeleton cards on initial load
- small inline progress indicators for individual actions
- cached data during background refresh
- pull-to-refresh when intuitive

Do not blank an entire dashboard because one API card is updating.

---

# 24. Empty States

Every collection screen needs a meaningful empty state.

Bad:

```text
No data
```

Better:

```text
No assignments due
You're all caught up.
```

Teacher:

```text
No submissions to review
New student submissions will appear here.
```

Admin:

```text
No pending approvals
There are no requests requiring your action.
```

---

# 25. Error States

Provide human-readable errors and a recovery action.

```text
Couldn't load attendance
Check your connection and try again.

[Retry]
```

For permission failures:

```text
You don't have access to edit these marks.
Contact your school administrator if this seems incorrect.
```

Do not show raw HTTP messages.

---

# 26. Offline UX

Offline should always be visible when it affects data freshness.

Example teacher attendance:

```text
Offline
Attendance will sync when your connection returns.
```

Status states:

```text
Saved locally
Syncing
Synced
Sync failed
```

Never imply a mutation reached the server when it has only been stored locally.

---

# 27. Child / Campus Context Switching

## Parent child switcher

Persist active child locally for convenience, but always scope cached query data by child ID.

UI:

```text
John Smith
Grade 7A                         ▼
```

Bottom sheet:

```text
Switch child

[avatar] John Smith   Grade 7A ✓
[avatar] Sara Smith   Grade 4B
```

## Campus switcher

For authorized organization users:

```text
North Campus ▼
```

Do not show a switcher if the user only has access to one context.

---

# 28. Accessibility

Minimum expectations:

- sufficient contrast
- scalable text
- 48dp-class comfortable touch targets for primary controls
- semantic labels for icons
- screen-reader-friendly status content
- focus order
- avoid color-only meaning
- support font scaling without clipping
- accessible form error descriptions

Test key flows with Android accessibility tools.

---

# 29. Motion

Use motion sparingly.

Good uses:
- tab/page transitions
- expanding details
- success confirmation
- loading placeholders
- small state changes

Avoid:
- decorative motion on every card
- long entrance animations
- animations that delay attendance or marks entry

Operational users value speed over spectacle.

---

# 30. Iconography

Use one icon family consistently—prefer Material Symbols/Flutter's Material icon ecosystem unless the product has a deliberate alternative.

Never mix several icon packs merely to find a slightly different glyph.

Common concepts:

```text
Home
Calendar
Attendance
Assignment
Grade
Payments
Notifications
Person
School
Bus
Library
Medical
Security
Approvals
Settings
```

Icons should accompany, not replace, important labels in primary navigation.

---

# 31. Dark Mode

If dark mode is implemented:

- generate it through semantic tokens
- maintain status contrast
- avoid pure black for every background unless intentionally chosen
- test charts, PDFs, images and input fields

If delivery scope is tight, a polished light theme is better than an unfinished dark theme. Architect tokens so dark mode can be added cleanly.

---

# 32. Localization

Design all components for translated strings from the beginning.

Avoid fixed widths for text labels.

Support:
- pluralization
- date formats
- time formats
- number formats
- currency formats
- RTL if target schools require it

Do not concatenate translated strings in code.

---

# 33. Suggested Reusable Component Library

Build these app-level components on Material 3:

```text
ErpAppScaffold
ErpTopBar
ErpBottomNavigation
ErpNavigationRail
ErpSectionHeader
ErpMetricCard
ErpChartCard
ErpLineChart
ErpBarChart
ErpStackedBarChart
ErpDonutChart
ErpSparkline
ErpChartLegend
ErpChartTooltip
ErpAnalyticsPeriodSelector
ErpActionCard
ErpAlertCard
ErpPersonTile
ErpStatusChip
ErpEmptyState
ErpErrorState
ErpSkeleton
ErpSearchField
ErpFilterBar
ErpFilterSheet
ErpDateField
ErpFileAttachmentTile
ErpAvatar
ErpAmount
ErpTimeline
ErpNotificationTile
ErpPermissionGate
ErpOfflineBanner
ErpSyncIndicator
ErpPrimaryButton
ErpSecondaryButton
ErpDestructiveButton
ErpConfirmDialog
```

This internal component layer creates visual consistency without locking the project into a large external UI framework.

---

# 34. Recommended Design System Decision

## Adopt

**Material 3** as the core visual/component system.

## Add

- custom School ERP theme tokens
- custom reusable ERP widgets
- Riverpod for UI/data state
- go_router for navigation/deep links
- cached_network_image for remote media
- fl_chart through internal ERP visualization components for charts and analytics

## Evaluate, don't depend on initially

- shadcn_ui
- shadcn_flutter

These may inspire certain visual patterns but should not be mixed indiscriminately with Material.

---

# 35. Design Rules for the Code LLM / Flutter Team

When implementing any new screen:

1. Start from the user's role and the task they came to complete.
2. Use existing ERP components before inventing another widget style.
3. Keep the primary action visually obvious.
4. Keep secondary actions out of the primary visual path.
5. Use server-driven permissions.
6. Provide loading, empty, error and offline states.
7. Prefer lists/cards to horizontally scrolling tables on phones.
8. Use bottom sheets for compact choices and quick filters.
9. Use full pages for complex or consequential workflows.
10. Avoid unnecessary dialogs.
11. Preserve active child/campus context visibly where it matters.
12. Never expose backend error text directly.
13. Optimize for one-handed use in common teacher/parent workflows.
14. Never use color alone for attendance/payment/approval status.
15. Test all screens with long names and translated content.
16. Never add a chart without a defined user question or decision it supports.
17. Keep raw KPIs visible even when a chart is present.
18. Use the chart-selection rules from Section 20 instead of choosing chart types decoratively.
19. Build analytics using the shared `Erp*Chart` components, not direct package styling in feature screens.
20. Provide loading, empty, error, stale, partial-data and accessibility behavior for every important visualization.
21. Preserve backend authorization and active child/campus/class context for analytics.

---

# 36. Example Screen Style

A typical page should feel like:

```text
┌─────────────────────────────────────┐
│ ←  Attendance                 ⋮     │
│                                     │
│ Grade 7A                            │
│ Mathematics · Today, 9:30 AM        │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 32 students                    │ │
│ │ 30 Present · 1 Absent · 1 Late │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [ Mark all present ]                │
│                                     │
│ 🔍 Search student                   │
│                                     │
│ Aisha Rahman                        │
│ [Present] [Absent] [Late] [Excused] │
│                                     │
│ Rahul Shah                          │
│ [Present] [Absent] [Late] [Excused] │
│                                     │
│ ...                                 │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │        Submit Attendance        │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

The visual hierarchy should make the user's task obvious without explanation.

---

# 37. Final UI Direction

The best design for this School ERP is **not** a flashy UI kit. It is a coherent Material 3-based system with excellent role-specific information architecture, carefully designed high-frequency workflows, strong permission awareness, consistent status language, fast loading behavior, and a small internal library of reusable ERP components.

Prioritize teacher attendance, parent child monitoring, student academics, fee clarity, notifications, and admin approvals. These flows will define whether the mobile app feels genuinely useful or merely like a companion to the website.

