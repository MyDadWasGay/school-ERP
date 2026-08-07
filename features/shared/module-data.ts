type ModuleMetadata = { title: string; description: string; entityLabel: string };

const defaults: Record<string, ModuleMetadata> = {
  admissions: { title: "Admissions workspace", description: "Track the pipeline from first enquiry through verified, approved admission.", entityLabel: "enquiry" },
  academics: { title: "Academic management", description: "Coordinate curriculum, teaching plans, allocations and learning evidence.", entityLabel: "plan" },
  attendance: { title: "Attendance & care", description: "Mark daily attendance, process corrections and surface early wellbeing signals.", entityLabel: "attendance session" },
  exams: { title: "Examination & assessment", description: "Plan exams, validate marks and publish results through an auditable workflow.", entityLabel: "exam" },
  finance: { title: "Fees & accounts", description: "Manage fee structures, collection, receipts, ledgers and financial controls.", entityLabel: "invoice" },
  people: { title: "People & HR", description: "Keep employee records, payroll inputs and access provisioning in one place.", entityLabel: "employee" },
  operations: { title: "Operations hub", description: "Coordinate communication, library, transport, residence and stock operations.", entityLabel: "workflow" },
  safety: { title: "Safety & wellbeing", description: "Protect sensitive health records and keep visitor, incident and facilities workflows accountable.", entityLabel: "case" },
  community: { title: "Community & engagement", description: "Connect houses, activities, alumni and public-facing school content.", entityLabel: "activity" },
  insights: { title: "Reports & insights", description: "Turn scoped operational data into dashboards, exports, alerts and decisions.", entityLabel: "report" },
  integrations: { title: "Integrations & automation", description: "Configure provider adapters, monitor webhooks and operate safe retry workflows.", entityLabel: "integration" },
  foundation: { title: "Foundation & settings", description: "Configure tenant structure, campuses, academic years, classes, sections and permissions.", entityLabel: "setting" },
};

export function getModuleData(segment: string): ModuleMetadata {
  return defaults[segment] ?? {
    title: `${segment.replaceAll("-", " ")} workspace`,
    description: "A scoped, audited workflow surface for your school team.",
    entityLabel: "record",
  };
}
