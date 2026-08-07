import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { auditColumns, idColumn, statusColumn, tenantColumns } from "./shared";
import { catalogTable } from "./catalog-shared";

export const libraryReservations = catalogTable("library_reservations", "library_reservation");
export const libraryFines = catalogTable("library_fines", "library_fine");
export const digitalResources = catalogTable("digital_resources", "digital_resource");
export const routeStopLinks = catalogTable("route_stop_links", "route_stop");
export const vehicleDocuments = catalogTable("vehicle_documents", "vehicle_document");
export const drivers = catalogTable("drivers", "driver");
export const conductors = catalogTable("conductors", "conductor");
export const transportTrips = catalogTable("transport_trips", "trip");
export const boardingLogs = catalogTable("boarding_logs", "boarding");
export const transportIncidents = catalogTable("transport_incidents", "transport_incident");
export const hostelBuildings = catalogTable("hostel_buildings", "hostel_building");
export const hostelFloors = catalogTable("hostel_floors", "hostel_floor");
export const hostelBeds = catalogTable("hostel_beds", "hostel_bed");
export const hostelVisitors = catalogTable("hostel_visitors", "hostel_visitor");
export const hostelOutpasses = catalogTable("hostel_outpasses", "outpass");
export const hostelAttendance = catalogTable("hostel_attendance", "hostel_attendance");
export const messMenus = catalogTable("mess_menus", "mess_menu");
export const mealPlans = catalogTable("meal_plans", "meal_plan");
export const canteenTransactions = catalogTable("canteen_transactions", "canteen_transaction");
export const inventoryCategories = catalogTable("inventory_categories", "inventory_category");
export const stockLocations = catalogTable("stock_locations", "stock_location");
export const purchaseRequisitions = catalogTable("purchase_requisitions", "requisition");
export const purchaseOrders = catalogTable("purchase_orders", "purchase_order");
export const goodsReceipts = catalogTable("goods_receipts", "goods_receipt");
export const assets = catalogTable("assets", "asset");
export const assetAssignments = sqliteTable("asset_assignments", {
  id: idColumn("asset_assignment"),
  ...tenantColumns(),
  name: text("name").notNull(),
  code: text("code"),
  referenceId: text("reference_id"),
  effectiveAt: integer("effective_at", { mode: "timestamp" }),
  assigneeType: text("assignee_type"),
  assigneeId: text("assignee_id"),
  detailsJson: text("details_json"),
  ...auditColumns(),
  status: statusColumn("draft"),
}, (table) => [
  index("asset_assignments_scope_idx").on(table.organizationId, table.campusId, table.status),
  index("asset_assignments_reference_idx").on(table.organizationId, table.referenceId),
  index("asset_assignments_assignee_idx").on(table.organizationId, table.assigneeType, table.assigneeId),
]);
export const assetMaintenanceTickets = catalogTable("asset_maintenance_tickets", "asset_ticket");
export const assetDepreciationEntries = catalogTable("asset_depreciation_entries", "depreciation");
export const medicationLogs = catalogTable("medication_logs", "medication");
export const healthScreenings = catalogTable("health_screenings", "screening");
export const visitorLogs = catalogTable("visitor_logs", "visitor");
export const gatePasses = catalogTable("gate_passes", "gate_pass");
export const securityIncidents = catalogTable("security_incidents", "security_incident");
export const evacuationRollCalls = catalogTable("evacuation_roll_calls", "evacuation");
export const facilityBookings = catalogTable("facility_bookings", "facility_booking");
export const facilityMaintenanceTickets = catalogTable("facility_maintenance_tickets", "facility_ticket");
export const facilityComplaints = catalogTable("facility_complaints", "facility_complaint");
export const cmsMedia = catalogTable("cms_media", "cms_media");
export const forms = catalogTable("forms", "form");
export const formFields = catalogTable("form_fields", "form_field");
