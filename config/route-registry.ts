import { modules } from "./modules";

export type RoutePresentation = "dedicated" | "catalog" | "planned";

export type RouteDefinition = {
  path: string;
  label: string;
  description?: string;
  parent?: string;
  presentation: RoutePresentation;
};

const sectionLabels: Record<string, string> = {
  academics: "Academics",
  accounts: "Accounts",
  activities: "Activities",
  admissions: "Admissions",
  alumni: "Alumni",
  analytics: "Analytics",
  assets: "Assets",
  attendance: "Attendance",
  audit: "Audit logs",
  campuses: "Campuses",
  canteen: "Canteen",
  certificates: "Certificates",
  cms: "CMS",
  communication: "Communication",
  dashboard: "Dashboard",
  exams: "Exams",
  facilities: "Facilities",
  fees: "Fees & finance",
  health: "Health",
  hostel: "Hostel",
  hr: "HR",
  integrations: "Integrations",
  inventory: "Inventory",
  library: "Library",
  organizations: "Organizations",
  payroll: "Payroll",
  parent: "Family portal",
  procurement: "Procurement",
  reports: "Reports",
  safety: "Safety",
  settings: "Settings",
  student: "Student portal",
  students: "Students",
  teacher: "Teacher portal",
  transport: "Transport",
  users: "Users & roles",
};

const segmentLabels: Record<string, string> = {
  "academic-years": "Academic years",
  allocations: "Allocations",
  applications: "Applications",
  assignments: "Assignments",
  "attendance": "Attendance",
  "audit-logs": "Audit logs",
  beds: "Beds",
  bookings: "Bookings",
  classes: "Classes",
  catalogue: "Catalogue",
  certificates: "Certificates",
  "chart-of-accounts": "Chart of accounts",
  clinic: "Clinic visits",
  "clinic-visits": "Clinic visits",
  complaints: "Complaints",
  configuration: "Fee configuration",
  corrections: "Corrections",
  curriculum: "Curriculum",
  depreciation: "Depreciation",
  defaulters: "Defaulters",
  discipline: "Discipline",
  documents: "Documents",
  donations: "Donations",
  "digital-resources": "Digital resources",
  employees: "Employees",
  enquiries: "Enquiries",
  evacuation: "Evacuation",
  expenses: "Expenses",
  events: "Events",
  forms: "Forms",
  "goods-receipts": "Goods receipts",
  incidents: "Incidents",
  invoices: "Invoices",
  "issue-return": "Issue & return",
  jobs: "Jobs",
  "lesson-plans": "Lesson plans",
  ledger: "Ledger",
  "medical": "Medical profile",
  memberships: "Memberships",
  menu: "Menu",
  messages: "Messages",
  notices: "Notices",
  notifications: "Notifications",
  "online-tests": "Online tests",
  organizations: "Organizations",
  pages: "Pages",
  parent: "Family portal",
  payments: "Payments",
  payslips: "Payslips",
  planning: "Planning",
  profiles: "Profiles",
  procurement: "Procurement",
  "purchase-orders": "Purchase orders",
  "question-bank": "Question bank",
  receipts: "Receipts",
  reconciliation: "Reconciliation",
  refunds: "Refunds",
  reports: "Reports",
  requisitions: "Requisitions",
  reservations: "Reservations",
  resources: "Resources",
  results: "Results",
  rooms: "Rooms",
  routes: "Routes",
  schedules: "Schedules",
  sections: "Sections",
  "seat-matrix": "Seat matrix",
  settings: "Settings",
  "stock-movements": "Stock movements",
  students: "Students",
  subjects: "Subjects",
  substitutions: "Substitution duties",
  suppliers: "Suppliers",
  timetable: "Timetable",
  transactions: "Transactions",
  transport: "Transport",
  users: "Users",
  vehicles: "Vehicles",
  visitors: "Visitors",
  webhooks: "Webhooks",
};

const dedicatedPaths = new Set([
  "/students",
  "/students/new",
  "/students/import",
  "/students/[id]",
  "/admissions/applications",
  "/admissions/approvals",
  "/admissions/enquiries",
  "/attendance/students",
  "/attendance/corrections",
  "/fees/invoices",
  "/fees/payments",
  "/fees/refunds",
  "/hr/employees",
  "/users",
  "/users/[id]",
  "/reports",
]);

const plannedPaths = new Set([
  "/admissions/tests",
  "/admissions/reports",
  "/analytics/admissions",
  "/analytics/attendance",
  "/analytics/finance",
  "/analytics/academics",
  "/analytics/operations",
  "/data-quality",
  "/alerts",
  "/certificates",
  "/communication/ptm",
  "/settings/access-scopes",
  "/settings/permissions",
  "/settings/roles",
  "/reports/scheduled",
]);

export const configuredRoutePaths = Array.from(new Set(modules.flatMap((module) => module.routes)));

function normalizePath(pathname: string) {
  const value = pathname.split("?")[0]?.replace(/\/+$/, "") || "/";
  return value.startsWith("/") ? value : `/${value}`;
}

function readableSegment(segment: string) {
  return segmentLabels[segment] ?? sectionLabels[segment] ?? segment.replaceAll("-", " ").replace(/\b\w/g, (value) => value.toUpperCase());
}

function looksLikeIdentifier(segment: string) {
  return /^\[[^\]]+\]$/.test(segment) || segment.length > 20 || /^[a-z]+[_-][a-z0-9_-]+$/i.test(segment) || /^[0-9]+$/.test(segment);
}

export function routeLabelForPath(pathname: string) {
  const path = normalizePath(pathname);
  if (path === "/") return "Home";
  const segments = path.split("/").filter(Boolean);
  const last = segments.at(-1) ?? "workspace";
  if (looksLikeIdentifier(last)) return segments.length > 1 ? `${readableSegment(segments.at(-2) ?? "record")} profile` : "Record profile";
  return readableSegment(last);
}

export function routeDescriptionForPath(pathname: string) {
  const path = normalizePath(pathname);
  if (path.startsWith("/students/")) return "Review the authorized student record and related history.";
  if (path.startsWith("/fees/")) return "Review campus-scoped fee and payment operations.";
  if (path.startsWith("/attendance/")) return "Complete and review attendance work for the current scope.";
  return undefined;
}

export function breadcrumbsForPath(pathname: string) {
  const path = normalizePath(pathname);
  if (path === "/" || path === "/dashboard") return [];
  const segments = path.split("/").filter(Boolean);
  const crumbs: Array<{ label: string; href?: string }> = [];
  let href = "";
  segments.forEach((segment, index) => {
    href += `/${segment}`;
    const isLast = index === segments.length - 1;
    const isIdentifier = looksLikeIdentifier(segment);
    const label = isIdentifier
      ? index > 0
        ? `${readableSegment(segments[index - 1] ?? "record")} profile`
        : "Record profile"
      : readableSegment(segment);
    crumbs.push({
      label,
      href: isLast || isIdentifier ? undefined : href,
    });
  });
  return crumbs;
}

export function routePresentationForPath(pathname: string): RoutePresentation {
  const path = normalizePath(pathname);
  if (dedicatedPaths.has(path)) return "dedicated";
  if (plannedPaths.has(path)) return "planned";
  if (path.startsWith("/students/") && path.split("/").length >= 3) return "dedicated";
  return "catalog";
}

export function routePathForPattern(pathname: string) {
  const path = normalizePath(pathname);
  if (path.startsWith("/students/") && path.split("/").length >= 3) return "/students/[id]";
  if (path.startsWith("/users/") && path.split("/").length >= 3) return "/users/[id]";
  return path;
}

export const routeDefinitions: RouteDefinition[] = configuredRoutePaths.map((path) => ({
  path,
  label: routeLabelForPath(path),
  description: routeDescriptionForPath(path),
  parent: path.includes("/") ? path.slice(0, path.lastIndexOf("/")) || "/" : undefined,
  presentation: routePresentationForPath(path),
}));
