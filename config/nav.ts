import { Activity, BarChart3, BedDouble, BookOpen, Boxes, Building2, CalendarCheck, ClipboardList, CreditCard, FileText, Globe2, GraduationCap, HeartPulse, Home, LayoutDashboard, Library, Megaphone, Package, Plug, Route, Settings, ShieldCheck, ShoppingCart, UserRound, Users, Utensils, type LucideIcon } from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  permission?: string;
  section: string;
  activePrefixes?: string[];
  excludePrefixes?: string[];
};
export type NavGroup = { label: string; items: NavItem[] };

const frequentlyVisitedRoutes = new Set([
  "/dashboard",
  "/students",
  "/attendance/students",
  "/academics/curriculum",
  "/exams/results",
  "/fees/invoices",
  "/hr/employees",
  "/teacher",
  "/parent",
  "/student",
]);

export function shouldPrefetchNavigation(href: string) {
  return frequentlyVisitedRoutes.has(href);
}

export const primaryNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, section: "Overview" },
  { label: "Students", href: "/students", icon: GraduationCap, permission: "students:read", section: "Students & admissions", excludePrefixes: ["/students/import", "/students/new"] },
  { label: "Student Import", href: "/students/import", icon: GraduationCap, permission: "students:import", section: "Students & admissions" },
  { label: "Admissions", href: "/admissions/enquiries", icon: ClipboardList, permission: "admissions:read", section: "Students & admissions", activePrefixes: ["/admissions"], excludePrefixes: ["/admissions/seat-matrix"] },
  { label: "Seat Matrix", href: "/admissions/seat-matrix", icon: ClipboardList, permission: "admissions:read", section: "Students & admissions" },
  { label: "Academics", href: "/academics/curriculum", icon: BookOpen, permission: "academics:read", section: "Academics", activePrefixes: ["/academics"] },
  { label: "Attendance", href: "/attendance/students", icon: CalendarCheck, permission: "attendance:read", section: "Attendance & exams", activePrefixes: ["/attendance"], excludePrefixes: ["/attendance/discipline"] },
  { label: "Discipline & Safety", href: "/attendance/discipline", icon: ShieldCheck, permission: "safety:read", section: "Attendance & exams" },
  { label: "Exams", href: "/exams/results", icon: FileText, permission: "exams:read", section: "Attendance & exams", activePrefixes: ["/exams"] },
  { label: "Fees & Finance", href: "/fees/invoices", icon: CreditCard, permission: "fees:read", section: "Finance", activePrefixes: ["/fees", "/accounts"] },
  { label: "People & HR", href: "/hr/employees", icon: Users, permission: "hr:read", section: "People", activePrefixes: ["/hr", "/payroll"] },
  { label: "Users & Roles", href: "/users", icon: UserRound, permission: "users:read", section: "People", activePrefixes: ["/users"] },
  { label: "Communication", href: "/communication/notices", icon: Megaphone, permission: "communication:read", section: "Operations", activePrefixes: ["/communication"] },
  { label: "Library", href: "/library/catalogue", icon: Library, permission: "library:read", section: "Operations", activePrefixes: ["/library"] },
  { label: "Transport", href: "/transport/routes", icon: Route, permission: "transport:read", section: "Operations", activePrefixes: ["/transport"] },
  { label: "Hostel", href: "/hostel/rooms", icon: BedDouble, permission: "hostel:read", section: "Operations", activePrefixes: ["/hostel"] },
  { label: "Canteen", href: "/canteen/menu", icon: Utensils, permission: "canteen:read", section: "Operations", activePrefixes: ["/canteen"] },
  { label: "Inventory", href: "/inventory/items", icon: Package, permission: "inventory:read", section: "Operations", activePrefixes: ["/inventory"] },
  { label: "Assets", href: "/assets/register", icon: Boxes, permission: "assets:read", section: "Operations", activePrefixes: ["/assets"] },
  { label: "Procurement", href: "/procurement/requisitions", icon: ShoppingCart, permission: "procurement:read", section: "Operations", activePrefixes: ["/procurement"] },
  { label: "Health & Safety", href: "/health/profiles", icon: HeartPulse, permission: "health:read", section: "Safety & community", activePrefixes: ["/health", "/safety"] },
  { label: "Facilities", href: "/facilities/maintenance", icon: Home, permission: "facilities:read", section: "Safety & community", activePrefixes: ["/facilities"] },
  { label: "Activities", href: "/activities/clubs", icon: Activity, permission: "activities:read", section: "Safety & community", activePrefixes: ["/activities"] },
  { label: "Alumni", href: "/alumni/profiles", icon: GraduationCap, permission: "alumni:read", section: "Safety & community", activePrefixes: ["/alumni"] },
  { label: "CMS & Forms", href: "/cms/pages", icon: Globe2, permission: "cms:read", section: "Safety & community", activePrefixes: ["/cms"] },
  { label: "Reports & Analytics", href: "/analytics", icon: BarChart3, permission: "analytics:read", section: "Reports & administration", activePrefixes: ["/analytics", "/reports"] },
  { label: "Integrations", href: "/integrations", icon: Plug, permission: "integrations:read", section: "Reports & administration", activePrefixes: ["/integrations"] },
  { label: "Foundation", href: "/settings/academic-years", icon: Building2, permission: "settings:read", section: "Reports & administration", activePrefixes: ["/settings/academic-years", "/settings/classes", "/settings/sections", "/settings/subjects"] },
  { label: "Audit Logs", href: "/audit-logs", icon: ShieldCheck, permission: "audit_logs:read", section: "Reports & administration", activePrefixes: ["/audit-logs"] },
  { label: "Settings", href: "/settings/permissions", icon: Settings, permission: "settings:read", section: "Reports & administration", activePrefixes: ["/settings/permissions", "/settings/roles", "/settings/access-scopes"] },
];

const teacherNav: NavItem[] = [
  { label: "My Dashboard", href: "/teacher", icon: LayoutDashboard, permission: "portals:read", section: "Overview" },
  { label: "My Classes", href: "/students", icon: GraduationCap, permission: "students:read", section: "Teaching" },
  { label: "Attendance", href: "/attendance/students", icon: CalendarCheck, permission: "attendance:read", section: "Teaching" },
  { label: "Timetable", href: "/academics/timetable", icon: CalendarCheck, permission: "academics:read", section: "Teaching" },
  { label: "Lesson Plans", href: "/academics/lesson-plans", icon: BookOpen, permission: "academics:read", section: "Teaching" },
  { label: "Assignments", href: "/academics/assignments", icon: ClipboardList, permission: "academics:read", section: "Teaching" },
  { label: "Marks Entry", href: "/exams/marks", icon: FileText, permission: "exams:read", section: "Teaching" },
  { label: "Communication", href: "/communication/messages", icon: Megaphone, permission: "communication:read", section: "Workspace" },
  { label: "Leave", href: "/attendance/leave", icon: CalendarCheck, permission: "attendance:read", section: "Workspace" },
  { label: "Payslips", href: "/payroll/payslips", icon: CreditCard, permission: "payroll:read", section: "Workspace" },
  { label: "Substitution Duties", href: "/academics/substitutions", icon: Users, permission: "academics:read", section: "Workspace" },
  { label: "Resources", href: "/academics/resources", icon: Library, permission: "academics:read", section: "Workspace" },
];

const parentNav: NavItem[] = [
  { label: "Dashboard", href: "/parent", icon: LayoutDashboard, permission: "portals:read", section: "Overview" },
  { label: "Children", href: "/students", icon: GraduationCap, permission: "students:read", section: "Children" },
  { label: "Attendance", href: "/attendance/students", icon: CalendarCheck, permission: "attendance:read", section: "Children" },
  { label: "Homework", href: "/academics/assignments", icon: BookOpen, permission: "academics:read", section: "Learning" },
  { label: "Results", href: "/exams/results", icon: FileText, permission: "exams:read", section: "Learning" },
  { label: "Fees & Receipts", href: "/fees/receipts", icon: CreditCard, permission: "fees:read", section: "Learning" },
  { label: "Timetable", href: "/academics/timetable", icon: CalendarCheck, permission: "academics:read", section: "Learning" },
  { label: "Transport", href: "/transport/routes", icon: Route, permission: "transport:read", section: "Services" },
  { label: "Leave", href: "/attendance/leave", icon: ClipboardList, permission: "attendance:read", section: "Services" },
  { label: "PTM", href: "/communication/ptm", icon: Users, permission: "communication:read", section: "Services" },
  { label: "Notices", href: "/communication/notices", icon: Megaphone, permission: "communication:read", section: "Services" },
  { label: "Documents", href: "/students", icon: FileText, permission: "documents:read", section: "Children" },
];

const studentNav: NavItem[] = [
  { label: "Dashboard", href: "/student", icon: LayoutDashboard, permission: "portals:read", section: "Overview" },
  { label: "Profile", href: "/students", icon: UserRound, permission: "students:read", section: "My learning" },
  { label: "Timetable", href: "/academics/timetable", icon: CalendarCheck, permission: "academics:read", section: "My learning" },
  { label: "Assignments", href: "/academics/assignments", icon: ClipboardList, permission: "academics:read", section: "My learning" },
  { label: "Resources", href: "/academics/resources", icon: Library, permission: "academics:read", section: "My learning" },
  { label: "Attendance", href: "/attendance/students", icon: CalendarCheck, permission: "attendance:read", section: "My learning" },
  { label: "Exams", href: "/exams/planning", icon: FileText, permission: "exams:read", section: "My learning" },
  { label: "Results", href: "/exams/results", icon: BarChart3, permission: "exams:read", section: "My learning" },
  { label: "Certificates", href: "/certificates", icon: FileText, permission: "students:read", section: "My learning" },
  { label: "Activities", href: "/activities/clubs", icon: Activity, permission: "activities:read", section: "Community" },
  { label: "Notices", href: "/communication/notices", icon: Megaphone, permission: "communication:read", section: "Community" },
];

const alumniNav: NavItem[] = [
  { label: "Dashboard", href: "/alumni/profiles", icon: LayoutDashboard, permission: "alumni:read", section: "Overview" },
  { label: "Alumni Directory", href: "/alumni/profiles", icon: GraduationCap, permission: "alumni:read", section: "Alumni" },
  { label: "Events", href: "/alumni/events", icon: CalendarCheck, permission: "alumni:read", section: "Alumni" },
  { label: "Mentorship", href: "/alumni/mentorship", icon: Users, permission: "alumni:read", section: "Alumni" },
  { label: "Jobs", href: "/alumni/jobs", icon: ClipboardList, permission: "alumni:read", section: "Alumni" },
];

function groupNavigation(items: NavItem[]): NavGroup[] {
  const groups = new Map<string, NavItem[]>();
  for (const item of items) {
    const group = groups.get(item.section) ?? [];
    group.push(item);
    groups.set(item.section, group);
  }
  return Array.from(groups, ([label, groupedItems]) => ({ label, items: groupedItems }));
}

export function navigationForRole(role: string): NavGroup[] {
  if (role === "teacher") return groupNavigation(teacherNav);
  if (role === "parent") return groupNavigation(parentNav);
  if (role === "student") return groupNavigation(studentNav);
  if (role === "alumni") return groupNavigation(alumniNav);
  return groupNavigation(primaryNav);
}

export function isNavigationItemActive(pathname: string, item: NavItem) {
  const matches = item.activePrefixes ?? [item.href];
  if (item.excludePrefixes?.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) return false;
  return matches.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
