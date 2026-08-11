import { and, count, desc, eq, like, ne, or } from "drizzle-orm";
import { type AnySQLiteTable } from "drizzle-orm/sqlite-core";
import { getDb } from "@/db/client";
import {
  applicationAssessments,
  admissions,
  assetDepreciationEntries,
  assetMaintenanceTickets,
  cmsMedia,
  digitalResources,
  drivers,
  evacuationRollCalls,
  facilityComplaints,
  facilityMaintenanceTickets,
  forms,
  healthScreenings,
  hostelAttendance,
  hostelBuildings,
  hostelOutpasses,
  hostelVisitors,
  inventoryCategories,
  employeeDocuments,
  jobApplicants,
  libraryFines,
  libraryReservations,
  mealPlans,
  messageTemplates,
  onlineTests,
  purchaseRequisitions,
  reportDefinitions,
  scheduledReports,
  salaryStructures,
  securityIncidents,
  sportsFixtures,
  staffAttendanceRecords,
  stockLocations,
  supportTickets,
  staffAppraisals,
  trainingEvents,
  transportIncidents,
  transportTrips,
  visitorLogs,
  wellbeingRecords,
  medicationLogs,
  gatePasses,
} from "@/db/schema";
import type { CurrentUser } from "@/lib/auth/types";
import { createId } from "@/lib/utils/ids";
import { normalizePagination } from "@/lib/utils/pagination";

/**
 * Typed route registry for lower-risk catalog entities. A route may keep its
 * small name/details form, but it now persists to its own tenant-scoped table
 * instead of the catch-all moduleRecords table. Promote a route to a dedicated
 * schema/service when it gains transactional business rules.
 */
type CatalogTable = AnySQLiteTable;
type CatalogDefinition = { table: CatalogTable; entityType: string };

const define = (table: CatalogTable, entityType: string): CatalogDefinition => ({ table, entityType });

export const catalogRouteDefinitions: Record<string, CatalogDefinition> = {
  "/admissions/tests": define(applicationAssessments, "application assessment"),
  "/admissions/approvals": define(admissions, "admission"),
  "/admissions/reports": define(reportDefinitions, "admission report"),
  "/attendance/staff": define(staffAttendanceRecords, "staff attendance"),
  "/attendance/wellbeing": define(wellbeingRecords, "wellbeing record"),
  "/attendance/reports": define(reportDefinitions, "attendance report"),
  "/exams/online-tests": define(onlineTests, "online test"),
  "/hr/recruitment": define(jobApplicants, "job applicant"),
  "/hr/documents": define(employeeDocuments, "employee document"),
  "/hr/performance": define(staffAppraisals, "performance review"),
  "/hr/training": define(trainingEvents, "training event"),
  "/payroll/structures": define(salaryStructures, "salary structure"),
  "/communication/templates": define(messageTemplates, "message template"),
  "/communication/events": define(trainingEvents, "communication event"),
  "/communication/ptm": define(scheduledReports, "parent teacher meeting"),
  "/communication/logs": define(supportTickets, "communication log"),
  "/library/reservations": define(libraryReservations, "library reservation"),
  "/library/fines": define(libraryFines, "library fine"),
  "/library/digital-resources": define(digitalResources, "digital resource"),
  "/library/reports": define(reportDefinitions, "library report"),
  "/transport/drivers": define(drivers, "transport driver"),
  "/transport/trips": define(transportTrips, "transport trip"),
  "/transport/incidents": define(transportIncidents, "transport incident"),
  "/transport/reports": define(reportDefinitions, "transport report"),
  "/hostel/buildings": define(hostelBuildings, "hostel building"),
  "/hostel/visitors": define(hostelVisitors, "hostel visitor"),
  "/hostel/outpasses": define(hostelOutpasses, "hostel outpass"),
  "/hostel/attendance": define(hostelAttendance, "hostel attendance"),
  "/hostel/reports": define(reportDefinitions, "hostel report"),
  "/canteen/meal-plans": define(mealPlans, "meal plan"),
  "/canteen/reports": define(reportDefinitions, "canteen report"),
  "/inventory/stock-locations": define(stockLocations, "stock location"),
  "/inventory/reports": define(reportDefinitions, "inventory report"),
  "/assets/maintenance": define(assetMaintenanceTickets, "asset maintenance"),
  "/assets/depreciation": define(assetDepreciationEntries, "asset depreciation"),
  "/procurement/requisitions": define(purchaseRequisitions, "purchase requisition"),
  "/safety/visitors": define(visitorLogs, "visitor log"),
  "/safety/gate-passes": define(gatePasses, "gate pass"),
  "/safety/incidents": define(securityIncidents, "security incident"),
  "/safety/evacuation": define(evacuationRollCalls, "evacuation roll call"),
  "/health/screenings": define(healthScreenings, "health screening"),
  "/health/medications": define(medicationLogs, "medication log"),
  "/facilities/maintenance": define(facilityMaintenanceTickets, "facility maintenance"),
  "/facilities/complaints": define(facilityComplaints, "facility complaint"),
  "/activities/houses": define(inventoryCategories, "activity house"),
  "/activities/competitions": define(sportsFixtures, "competition"),
  "/cms/media": define(cmsMedia, "CMS media"),
  "/cms/forms": define(forms, "CMS form"),
  "/cms/settings": define(scheduledReports, "CMS setting"),
  "/cms/galleries": define(cmsMedia, "CMS gallery"),
  "/cms/news": define(cmsMedia, "CMS news"),
  "/reports/scheduled": define(scheduledReports, "scheduled report"),
  "/alerts": define(reportDefinitions, "alert definition"),
  "/data-quality": define(supportTickets, "data quality issue"),
};

function typedTable(table: CatalogTable) {
  return table as typeof import("@/db/schema").curriculums;
}

export function getCatalogDefinition(route: string) { return catalogRouteDefinitions[route]; }

export async function listCatalogRecordsPage(user: CurrentUser, route: string, input?: { search?: string; page?: number; pageSize?: number }) {
  const definition = getCatalogDefinition(route); if (!definition) return null;
  const table = typedTable(definition.table); const pagination = normalizePagination(input); const query = input?.search?.trim();
  const where = and(eq(table.organizationId, user.organizationId), user.campusId ? eq(table.campusId, user.campusId) : undefined, ne(table.status, "archived"), query ? or(like(table.name, `%${query}%`), like(table.code, `%${query}%`), like(table.detailsJson, `%${query}%`)) : undefined);
  const [rows, totals] = await Promise.all([getDb().select().from(table).where(where).orderBy(desc(table.createdAt)).limit(pagination.pageSize).offset(pagination.offset), getDb().select({ value: count() }).from(table).where(where)]);
  const total = totals[0]?.value ?? 0;
  return { rows: rows.map((row) => ({ id: row.id, name: row.name, detail: row.detailsJson ?? row.code ?? row.referenceId ?? `${definition.entityType} record`, status: row.status })), pageInfo: { page: pagination.page, pageSize: pagination.pageSize, total, pageCount: Math.ceil(total / pagination.pageSize) } };
}

export async function createCatalogRecord(user: CurrentUser, route: string, input: { name: string; note?: string; entityType: string }) {
  const definition = getCatalogDefinition(route); if (!definition) return null;
  const table = typedTable(definition.table); const [row] = await getDb().insert(table).values({ id: createId(definition.entityType.replaceAll(" ", "_")), organizationId: user.organizationId, campusId: user.campusId, name: input.name, code: null, referenceId: null, effectiveAt: null, detailsJson: input.note ? JSON.stringify({ note: input.note, source: "workspace" }) : null, status: "draft", createdBy: user.id, updatedBy: user.id }).returning();
  return row ?? null;
}

export async function updateCatalogRecord(user: CurrentUser, route: string, input: { id: string; name: string; note?: string; status: string }) {
  const definition = getCatalogDefinition(route); if (!definition) return null;
  const table = typedTable(definition.table); const result = await getDb().update(table).set({ name: input.name, detailsJson: input.note ? JSON.stringify({ note: input.note, source: "workspace" }) : null, status: input.status, updatedAt: new Date(), updatedBy: user.id }).where(and(eq(table.id, input.id), eq(table.organizationId, user.organizationId), user.campusId ? eq(table.campusId, user.campusId) : undefined)).returning({ id: table.id });
  return result[0] ?? null;
}

export async function archiveCatalogRecord(user: CurrentUser, route: string, id: string) {
  const definition = getCatalogDefinition(route); if (!definition) return null;
  const table = typedTable(definition.table); const result = await getDb().update(table).set({ status: "archived", updatedAt: new Date(), updatedBy: user.id }).where(and(eq(table.id, id), eq(table.organizationId, user.organizationId), user.campusId ? eq(table.campusId, user.campusId) : undefined)).returning({ id: table.id });
  return result[0] ?? null;
}
