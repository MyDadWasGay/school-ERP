import { Activity, BarChart3, BedDouble, BookOpen, Boxes, Building2, CalendarCheck, ClipboardList, CreditCard, FileText, Globe2, GraduationCap, HeartPulse, Home, LayoutDashboard, Library, Megaphone, Package, Plug, Route, Settings, ShieldCheck, ShoppingCart, UserRound, Users, Utensils, type LucideIcon } from "lucide-react";

export type NavItem = { label: string; href: string; icon: LucideIcon; permission?: string };

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
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Students", href: "/students", icon: GraduationCap, permission: "students:read" },
  { label: "Student Import", href: "/students/import", icon: GraduationCap, permission: "students:import" },
  { label: "Admissions", href: "/admissions/enquiries", icon: ClipboardList, permission: "admissions:read" },
  { label: "Seat Matrix", href: "/admissions/seat-matrix", icon: ClipboardList, permission: "admissions:read" },
  { label: "Academics", href: "/academics/curriculum", icon: BookOpen, permission: "academics:read" },
  { label: "Attendance", href: "/attendance/students", icon: CalendarCheck, permission: "attendance:read" },
  { label: "Discipline & Safety", href: "/attendance/discipline", icon: ShieldCheck, permission: "safety:read" },
  { label: "Exams", href: "/exams/results", icon: FileText, permission: "exams:read" },
  { label: "Fees & Finance", href: "/fees/invoices", icon: CreditCard, permission: "fees:read" },
  { label: "People & HR", href: "/hr/employees", icon: Users, permission: "hr:read" },
  { label: "Users & Roles", href: "/users", icon: UserRound, permission: "users:read" },
  { label: "Communication", href: "/communication/notices", icon: Megaphone, permission: "communication:read" },
  { label: "Library", href: "/library/catalogue", icon: Library, permission: "library:read" },
  { label: "Transport", href: "/transport/routes", icon: Route, permission: "transport:read" },
  { label: "Hostel", href: "/hostel/rooms", icon: BedDouble, permission: "hostel:read" },
  { label: "Canteen", href: "/canteen/menu", icon: Utensils, permission: "canteen:read" },
  { label: "Inventory", href: "/inventory/items", icon: Package, permission: "inventory:read" },
  { label: "Assets", href: "/assets/register", icon: Boxes, permission: "assets:read" },
  { label: "Procurement", href: "/procurement/requisitions", icon: ShoppingCart, permission: "procurement:read" },
  { label: "Health & Safety", href: "/health/profiles", icon: HeartPulse, permission: "health:read" },
  { label: "Facilities", href: "/facilities/maintenance", icon: Home, permission: "facilities:read" },
  { label: "Activities", href: "/activities/clubs", icon: Activity, permission: "activities:read" },
  { label: "Alumni", href: "/alumni/profiles", icon: GraduationCap, permission: "alumni:read" },
  { label: "CMS & Forms", href: "/cms/pages", icon: Globe2, permission: "cms:read" },
  { label: "Reports & Analytics", href: "/analytics", icon: BarChart3, permission: "analytics:read" },
  { label: "Integrations", href: "/integrations", icon: Plug, permission: "integrations:read" },
  { label: "Foundation", href: "/settings/academic-years", icon: Building2, permission: "settings:read" },
  { label: "Audit Logs", href: "/audit-logs", icon: ShieldCheck, permission: "audit_logs:read" },
  { label: "Settings", href: "/settings/permissions", icon: Settings, permission: "settings:read" },
];

const teacherNav: NavItem[] = [
  { label: "My Dashboard", href: "/teacher", icon: LayoutDashboard, permission: "portals:read" },
  { label: "My Classes", href: "/students", icon: GraduationCap, permission: "students:read" },
  { label: "Attendance", href: "/attendance/students", icon: CalendarCheck, permission: "attendance:read" },
  { label: "Timetable", href: "/academics/timetable", icon: CalendarCheck, permission: "academics:read" },
  { label: "Lesson Plans", href: "/academics/lesson-plans", icon: BookOpen, permission: "academics:read" },
  { label: "Assignments", href: "/academics/assignments", icon: ClipboardList, permission: "academics:read" },
  { label: "Marks Entry", href: "/exams/marks", icon: FileText, permission: "exams:read" },
  { label: "Communication", href: "/communication/messages", icon: Megaphone, permission: "communication:read" },
  { label: "Leave", href: "/attendance/leave", icon: CalendarCheck, permission: "attendance:read" },
  { label: "Payslips", href: "/payroll/payslips", icon: CreditCard, permission: "payroll:read" },
  { label: "Substitution Duties", href: "/academics/substitutions", icon: Users, permission: "academics:read" },
  { label: "Resources", href: "/academics/resources", icon: Library, permission: "academics:read" },
];

const parentNav: NavItem[] = [
  { label: "Dashboard", href: "/parent", icon: LayoutDashboard, permission: "portals:read" },
  { label: "Children", href: "/students", icon: GraduationCap, permission: "students:read" },
  { label: "Attendance", href: "/attendance/students", icon: CalendarCheck, permission: "attendance:read" },
  { label: "Homework", href: "/academics/assignments", icon: BookOpen, permission: "academics:read" },
  { label: "Results", href: "/exams/results", icon: FileText, permission: "exams:read" },
  { label: "Fees & Receipts", href: "/fees/receipts", icon: CreditCard, permission: "fees:read" },
  { label: "Timetable", href: "/academics/timetable", icon: CalendarCheck, permission: "academics:read" },
  { label: "Transport", href: "/transport/routes", icon: Route, permission: "transport:read" },
  { label: "Leave", href: "/attendance/leave", icon: ClipboardList, permission: "attendance:read" },
  { label: "PTM", href: "/communication/ptm", icon: Users, permission: "communication:read" },
  { label: "Notices", href: "/communication/notices", icon: Megaphone, permission: "communication:read" },
  { label: "Documents", href: "/students", icon: FileText, permission: "documents:read" },
];

const studentNav: NavItem[] = [
  { label: "Dashboard", href: "/student", icon: LayoutDashboard, permission: "portals:read" },
  { label: "Profile", href: "/students", icon: UserRound, permission: "students:read" },
  { label: "Timetable", href: "/academics/timetable", icon: CalendarCheck, permission: "academics:read" },
  { label: "Assignments", href: "/academics/assignments", icon: ClipboardList, permission: "academics:read" },
  { label: "Resources", href: "/academics/resources", icon: Library, permission: "academics:read" },
  { label: "Attendance", href: "/attendance/students", icon: CalendarCheck, permission: "attendance:read" },
  { label: "Exams", href: "/exams/planning", icon: FileText, permission: "exams:read" },
  { label: "Results", href: "/exams/results", icon: BarChart3, permission: "exams:read" },
  { label: "Certificates", href: "/certificates", icon: FileText, permission: "students:read" },
  { label: "Activities", href: "/activities/clubs", icon: Activity, permission: "activities:read" },
  { label: "Notices", href: "/communication/notices", icon: Megaphone, permission: "communication:read" },
];

const alumniNav: NavItem[] = [
  { label: "Dashboard", href: "/alumni/profiles", icon: LayoutDashboard, permission: "alumni:read" },
  { label: "Alumni Directory", href: "/alumni/profiles", icon: GraduationCap, permission: "alumni:read" },
  { label: "Events", href: "/alumni/events", icon: CalendarCheck, permission: "alumni:read" },
  { label: "Mentorship", href: "/alumni/mentorship", icon: Users, permission: "alumni:read" },
  { label: "Jobs", href: "/alumni/jobs", icon: ClipboardList, permission: "alumni:read" },
];

export function navigationForRole(role: string) {
  if (role === "teacher") return teacherNav;
  if (role === "parent") return parentNav;
  if (role === "student") return studentNav;
  if (role === "alumni") return alumniNav;
  return primaryNav;
}
