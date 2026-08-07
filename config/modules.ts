export type ModuleDefinition = {
  key: string;
  label: string;
  description: string;
  permission: string;
  routes: string[];
};

export const modules: ModuleDefinition[] = [
  { key: "foundation", label: "Foundation", description: "Organizations, campuses, academic setup and access", permission: "settings:read", routes: ["/organizations", "/campuses", "/settings/academic-years", "/settings/classes", "/settings/sections", "/settings/subjects", "/settings/roles", "/settings/permissions", "/settings/access-scopes"] },
  { key: "admissions", label: "Admissions", description: "Enquiries, applications, approvals and seat planning", permission: "admissions:read", routes: ["/admissions/enquiries", "/admissions/applications", "/admissions/tests", "/admissions/approvals", "/admissions/seat-matrix", "/admissions/reports"] },
  { key: "students", label: "Students", description: "Student master, guardians, enrollment and certificates", permission: "students:read", routes: [
    "/students", "/students/new", "/students/[id]", "/students/[id]/profile", "/students/[id]/guardians",
    "/students/[id]/documents", "/students/[id]/enrollment", "/students/[id]/timeline",
    "/students/[id]/attendance", "/students/[id]/fees", "/students/[id]/results", "/certificates",
  ] },
  { key: "academics", label: "Academics", description: "Curriculum, teaching plans, timetable and assignments", permission: "academics:read", routes: ["/academics/curriculum", "/academics/lesson-plans", "/academics/teacher-allocation", "/academics/timetable", "/academics/substitutions", "/academics/assignments", "/academics/resources"] },
  { key: "attendance", label: "Attendance & Care", description: "Student and staff attendance, leave and discipline", permission: "attendance:read", routes: ["/attendance/students", "/attendance/staff", "/attendance/leave", "/attendance/corrections", "/attendance/discipline", "/attendance/wellbeing", "/attendance/reports"] },
  { key: "exams", label: "Exams", description: "Exam planning, marks, results and report cards", permission: "exams:read", routes: ["/exams/planning", "/exams/schedules", "/exams/marks", "/exams/results", "/exams/report-cards", "/exams/question-bank", "/exams/online-tests"] },
  { key: "finance", label: "Finance", description: "Fees, collections, accounts and payroll", permission: "fees:read", routes: ["/fees/configuration", "/fees/invoices", "/fees/payments", "/fees/receipts", "/fees/refunds", "/fees/defaulters", "/accounts/chart-of-accounts", "/accounts/ledger", "/accounts/expenses", "/accounts/reconciliation", "/accounts/reports", "/accounts/donations"] },
  { key: "people", label: "People & HR", description: "Employees, recruitment, performance and payroll", permission: "hr:read", routes: ["/users", "/users/[id]", "/hr/employees", "/hr/recruitment", "/hr/documents", "/hr/performance", "/hr/training", "/payroll/structures", "/payroll/runs", "/payroll/payslips"] },
  { key: "portals", label: "Portals", description: "Role-specific teacher, parent and student workspaces", permission: "portals:read", routes: ["/teacher", "/parent", "/student"] },
  { key: "operations", label: "Operations", description: "Communication, library, transport, hostel and inventory", permission: "operations:read", routes: [
    "/communication/messages", "/communication/templates", "/communication/notices", "/communication/events", "/communication/ptm", "/communication/logs", "/communication/notifications",
    "/library/catalogue", "/library/copies", "/library/issue-return", "/library/reservations", "/library/fines", "/library/digital-resources", "/library/reports",
    "/transport/routes", "/transport/stops", "/transport/vehicles", "/transport/drivers", "/transport/allocations", "/transport/trips", "/transport/incidents", "/transport/reports",
    "/hostel/buildings", "/hostel/rooms", "/hostel/beds", "/hostel/allotments", "/hostel/visitors", "/hostel/outpasses", "/hostel/attendance", "/hostel/reports",
    "/canteen/menu", "/canteen/meal-plans", "/canteen/transactions", "/canteen/reports",
    "/inventory/items", "/inventory/stock-locations", "/inventory/stock-movements", "/inventory/suppliers", "/inventory/reports",
    "/assets/register", "/assets/assignments", "/assets/maintenance", "/assets/depreciation",
    "/procurement/requisitions", "/procurement/purchase-orders", "/procurement/goods-receipts", "/procurement/vendors",
  ] },
  { key: "safety", label: "Safety & Wellbeing", description: "Health, visitors, incidents and facility service", permission: "health:read", routes: [
    "/health/profiles", "/health/clinic-visits", "/health/medications", "/health/screenings",
    "/safety/visitors", "/safety/gate-passes", "/safety/incidents", "/safety/evacuation",
    "/facilities/bookings", "/facilities/maintenance", "/facilities/complaints",
  ] },
  { key: "community", label: "Community", description: "Activities, sports, alumni and public engagement", permission: "activities:read", routes: [
    "/activities/houses", "/activities/clubs", "/activities/sports", "/activities/competitions", "/activities/achievements",
    "/alumni/profiles", "/alumni/events", "/alumni/mentorship", "/alumni/jobs", "/alumni/donations",
    "/cms/pages", "/cms/media", "/cms/news", "/cms/galleries", "/cms/forms", "/cms/submissions", "/cms/settings",
  ] },
  { key: "insights", label: "Reports & Insights", description: "Analytics, reports, alerts and data quality", permission: "reports:read", routes: ["/analytics", "/analytics/admissions", "/analytics/attendance", "/analytics/finance", "/analytics/academics", "/analytics/operations", "/reports", "/reports/scheduled", "/alerts", "/data-quality"] },
  { key: "integrations", label: "Integrations", description: "Provider adapters, webhooks, jobs and API keys", permission: "integrations:read", routes: ["/integrations", "/integrations/jobs", "/integrations/payment", "/integrations/notifications", "/integrations/hardware", "/integrations/webhooks", "/integrations/logs", "/settings/api-keys"] },
];

export function moduleForRoute(pathname: string) {
  return modules.find((module) => module.routes.some((route) => pathname.startsWith(route)));
}

export function isConfiguredRoute(pathname: string) {
  return modules.some((module) => module.routes.includes(pathname));
}

export function permissionForPath(pathname: string) {
  const segment = pathname.split("/").filter(Boolean)[0] ?? "dashboard";
  const permissionModule = {
    dashboard: "analytics",
    organizations: "organizations",
    campuses: "campuses",
    users: "users",
    settings: "settings",
    admissions: "admissions",
    students: "students",
    certificates: "students",
    academics: "academics",
    attendance: "attendance",
    exams: "exams",
    fees: "fees",
    accounts: "accounts",
    hr: "hr",
    payroll: "payroll",
    teacher: "portals",
    parent: "portals",
    student: "portals",
    communication: "communication",
    library: "library",
    transport: "transport",
    hostel: "hostel",
    canteen: "canteen",
    inventory: "inventory",
    assets: "assets",
    procurement: "procurement",
    health: "health",
    safety: "safety",
    facilities: "facilities",
    activities: "activities",
    alumni: "alumni",
    cms: "cms",
    reports: "reports",
    analytics: "analytics",
    alerts: "alerts",
    "data-quality": "data_quality",
    integrations: "integrations",
    "audit-logs": "audit_logs",
  }[segment] ?? moduleForRoute(pathname)?.key ?? "settings";
  return `${permissionModule}:read`;
}
