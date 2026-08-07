import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const now = Date.now();
let client: Client;
let databasePath: string;

async function expectRejected(operation: () => Promise<unknown>) {
  await expect(operation()).rejects.toThrow(/tenant|organization|campus|scope|status/i);
}

describe("database tenant integrity", () => {
  beforeAll(async () => {
    const directory = mkdtempSync(path.join(tmpdir(), "school-erp-tenant-"));
    databasePath = path.join(directory, "integrity.db");
    client = createClient({ url: `file:${databasePath}` });
    await migrate(drizzle(client), { migrationsFolder: path.join(process.cwd(), "drizzle") });
    await client.batch([
      { sql: "INSERT INTO organizations (id, name, slug, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?)", args: ["org-a", "School A", "school-a", now, now, "active"] },
      { sql: "INSERT INTO organizations (id, name, slug, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?)", args: ["org-b", "School B", "school-b", now, now, "active"] },
      { sql: "INSERT INTO campuses (id, organization_id, name, code, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?)", args: ["campus-a", "org-a", "Main", "MAIN", now, now, "active"] },
      { sql: "INSERT INTO campuses (id, organization_id, name, code, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?)", args: ["campus-b", "org-b", "Main", "MAIN", now, now, "active"] },
      { sql: "INSERT INTO classes (id, organization_id, name, code, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?)", args: ["class-a", "org-a", "Grade 8", "G8", now, now, "active"] },
      { sql: "INSERT INTO sections (id, organization_id, class_id, name, capacity, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", args: ["section-a", "org-a", "class-a", "A", 40, now, now, "active"] },
      { sql: "INSERT INTO users (id, firebase_uid, organization_id, email, display_name, role, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", args: ["user-a", "firebase-a", "org-a", "admin@a.example", "Admin A", "management", now, now, "active"] },
      { sql: "INSERT INTO students (id, organization_id, campus_id, admission_number, first_name, last_name, joined_on, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", args: ["student-a", "org-a", "campus-a", "A-001", "Student", "A", now, now, now, "active"] },
    ]);
  });

  afterAll(async () => {
    await client.close();
    try {
      rmSync(databasePath, { force: true });
      rmSync(path.dirname(databasePath), { recursive: true, force: true });
    } catch {
      // Windows can keep a libsql handle until the test worker exits.
    }
  });

  it("rejects a user whose campus belongs to another organization", async () => {
    await expectRejected(() => client.execute({
      sql: "INSERT INTO users (id, firebase_uid, organization_id, campus_id, email, display_name, role, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["user-cross-campus", "firebase-cross-campus", "org-a", "campus-b", "cross@a.example", "Cross Campus", "teacher", now, now, "active"],
    }));
  });

  it("rejects a student whose campus belongs to another organization", async () => {
    await expectRejected(() => client.execute({
      sql: "INSERT INTO students (id, organization_id, campus_id, admission_number, first_name, last_name, joined_on, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["student-cross-campus", "org-a", "campus-b", "A-001", "Cross", "Campus", now, now, now, "active"],
    }));
  });

  it("rejects cross-tenant references and cross-tenant updates", async () => {
    await expectRejected(() => client.execute({
      sql: "INSERT INTO sections (id, organization_id, class_id, name, capacity, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["section-cross-class", "org-b", "class-a", "A", 40, now, now, "active"],
    }));
    await expectRejected(() => client.execute({
      sql: "UPDATE users SET organization_id = ? WHERE id = ?",
      args: ["org-b", "user-a"],
    }));
    await expectRejected(() => client.execute({
      sql: "INSERT INTO discipline_incidents (id, organization_id, campus_id, student_id, severity, title, occurred_at, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["incident-cross-student", "org-b", "campus-b", "student-a", "high", "Cross tenant", now, now, now, "open"],
    }));
  });

  it("rejects a background job that is not owned by an organization", async () => {
    await expectRejected(() => client.execute({
      sql: "INSERT INTO job_runs (id, organization_id, job_type, payload_json, status, attempts, max_attempts, run_after, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["job-missing-tenant", "org-missing", "test.job", "{}", "queued", 0, 3, now, now, now],
    }));
  });

  it("rejects cross-tenant library copies and issue transactions", async () => {
    await client.batch([
      { sql: "INSERT INTO library_items (id, organization_id, campus_id, title, total_copies, available_copies, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", args: ["library-item-a", "org-a", "campus-a", "Tenant-safe book", 1, 1, now, now, "active"] },
      { sql: "INSERT INTO library_copies (id, organization_id, campus_id, item_id, accession_number, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", args: ["library-copy-a", "org-a", "campus-a", "library-item-a", "ACC-A-001", now, now, "available"] },
      { sql: "INSERT INTO library_reservations (id, organization_id, campus_id, name, reference_id, details_json, created_by, updated_by, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", args: ["library-reservation-a", "org-a", "campus-a", "Tenant-safe book", "library-item-a", "{}", "user-a", "user-a", now, now, "pending"] },
      { sql: "INSERT INTO digital_resources (id, organization_id, campus_id, name, details_json, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", args: ["digital-resource-a", "org-a", "campus-a", "Resource", "{}", now, now, "active"] },
    ]);
    await expectRejected(() => client.execute({
      sql: "INSERT INTO library_copies (id, organization_id, campus_id, item_id, accession_number, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["library-copy-cross", "org-b", "campus-b", "library-item-a", "ACC-B-001", now, now, "available"],
    }));
    await expectRejected(() => client.execute({
      sql: "INSERT INTO library_issue_transactions (id, organization_id, campus_id, copy_id, borrower_user_id, borrower_type, borrower_id, issued_at, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["library-issue-cross", "org-b", "campus-b", "library-copy-a", "student-a", "student", "student-a", now, now, now, "issued"],
    }));
    await expectRejected(() => client.execute({
      sql: "INSERT INTO library_reservations (id, organization_id, campus_id, name, reference_id, details_json, created_by, updated_by, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["library-reservation-cross", "org-b", "campus-b", "Cross", "library-item-a", "{}", "user-a", "user-a", now, now, "pending"],
    }));
    await expectRejected(() => client.execute({
      sql: "INSERT INTO digital_resources (id, organization_id, campus_id, name, details_json, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["digital-resource-cross", "org-a", "campus-b", "Cross", "{}", now, now, "active"],
    }));
  });

  it("keeps inventory movements tenant-scoped and quantities non-negative", async () => {
    await client.execute({
      sql: "INSERT INTO inventory_items (id, organization_id, campus_id, name, sku, quantity, reorder_level, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["inventory-item-a", "org-a", "campus-a", "Paper", "PAPER-A", 4, 1, now, now, "active"],
    });
    await expectRejected(() => client.execute({
      sql: "INSERT INTO stock_movements (id, organization_id, campus_id, inventory_item_id, quantity, direction, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["movement-cross", "org-b", "campus-b", "inventory-item-a", 1, "in", now, now, "posted"],
    }));
    await expect(client.execute({ sql: "UPDATE inventory_items SET quantity = ? WHERE id = ?", args: [-1, "inventory-item-a"] })).rejects.toThrow(/negative|inventory/i);
  });

  it("keeps transport allocations tenant-scoped and prevents duplicate active allocation", async () => {
    await client.batch([
      { sql: "INSERT INTO transport_routes (id, organization_id, campus_id, name, capacity, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", args: ["route-a", "org-a", "campus-a", "Route A", 1, now, now, "active"] },
      { sql: "INSERT INTO transport_stops (id, organization_id, campus_id, name, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?)", args: ["stop-a", "org-a", "campus-a", "Stop A", now, now, "active"] },
      { sql: "INSERT INTO route_allocations (id, organization_id, campus_id, route_id, student_id, stop_id, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", args: ["allocation-a", "org-a", "campus-a", "route-a", "student-a", "stop-a", now, now, "active"] },
      { sql: "INSERT INTO vehicles (id, organization_id, campus_id, registration_number, type, capacity, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", args: ["vehicle-a", "org-a", "campus-a", "BUS-A", "bus", 40, now, now, "active"] },
      { sql: "INSERT INTO vehicle_documents (id, organization_id, campus_id, name, reference_id, details_json, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", args: ["vehicle-doc-a", "org-a", "campus-a", "Insurance", "vehicle-a", "{}", now, now, "active"] },
    ]);
    await expectRejected(() => client.execute({
      sql: "INSERT INTO route_allocations (id, organization_id, campus_id, route_id, student_id, stop_id, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["allocation-cross", "org-b", "campus-b", "route-a", "student-a", "stop-a", now, now, "active"],
    }));
    await expectRejected(() => client.execute({
      sql: "INSERT INTO route_allocations (id, organization_id, campus_id, route_id, student_id, stop_id, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["allocation-duplicate", "org-a", "campus-a", "route-a", "student-a", "stop-a", now, now, "active"],
    }));
    await expectRejected(() => client.execute({
      sql: "INSERT INTO vehicle_documents (id, organization_id, campus_id, name, reference_id, details_json, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["vehicle-doc-cross", "org-a", "campus-b", "Cross", "vehicle-a", "{}", now, now, "active"],
    }));
  });

  it("keeps employees and payroll snapshots tenant-scoped", async () => {
    await client.batch([
      { sql: "INSERT INTO employees (id, organization_id, campus_id, employee_number, first_name, last_name, salary_minor, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", args: ["employee-a", "org-a", "campus-a", "EMP-A-001", "Staff", "A", 2500000, now, now, "active"] },
      { sql: "INSERT INTO payroll_runs (id, organization_id, campus_id, period, total_minor, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", args: ["payroll-a", "org-a", "campus-a", "2026-08", 2500000, now, now, "completed"] },
      { sql: "INSERT INTO payroll_payslips (id, organization_id, campus_id, payroll_run_id, employee_id, employee_number, employee_name, period, gross_minor, deductions_minor, net_minor, snapshot_json, issued_at, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", args: ["payslip-a", "org-a", "campus-a", "payroll-a", "employee-a", "EMP-A-001", "Staff A", "2026-08", 2500000, 0, 2500000, "{}", now, now, now, "issued"] },
    ]);
    await expectRejected(() => client.execute({
      sql: "INSERT INTO employees (id, organization_id, campus_id, employee_number, first_name, last_name, salary_minor, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["employee-cross", "org-a", "campus-b", "EMP-A-002", "Cross", "Campus", 1, now, now, "active"],
    }));
    await expectRejected(() => client.execute({
      sql: "INSERT INTO payroll_payslips (id, organization_id, campus_id, payroll_run_id, employee_id, employee_number, employee_name, period, gross_minor, deductions_minor, net_minor, snapshot_json, issued_at, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["payslip-cross", "org-b", "campus-b", "payroll-a", "employee-a", "EMP-A-001", "Cross", "2026-08", 1, 0, 1, "{}", now, now, now, "issued"],
    }));
    await expectRejected(() => client.execute({
      sql: "UPDATE payroll_payslips SET organization_id = ? WHERE id = ?",
      args: ["org-b", "payslip-a"],
    }));
  });

  it("enforces hostel bed scope, one active allotment, and room capacity", async () => {
    await client.batch([
      { sql: "INSERT INTO students (id, organization_id, campus_id, admission_number, first_name, last_name, joined_on, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", args: ["student-b", "org-a", "campus-a", "A-002", "Student", "B", now, now, now, "active"] },
      { sql: "INSERT INTO hostel_rooms (id, organization_id, campus_id, building, room_number, capacity, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", args: ["room-a", "org-a", "campus-a", "North", "101", 1, now, now, "active"] },
      { sql: "INSERT INTO hostel_beds (id, organization_id, campus_id, name, code, reference_id, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", args: ["bed-a", "org-a", "campus-a", "Bed A", "A", "room-a", now, now, "active"] },
      { sql: "INSERT INTO hostel_beds (id, organization_id, campus_id, name, code, reference_id, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", args: ["bed-b", "org-a", "campus-a", "Bed B", "B", "room-a", now, now, "active"] },
      { sql: "INSERT INTO hostel_allotments (id, organization_id, campus_id, room_id, bed_id, student_id, allotted_on, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", args: ["allotment-a", "org-a", "campus-a", "room-a", "bed-a", "student-a", now, now, now, "active"] },
    ]);
    await expectRejected(() => client.execute({
      sql: "INSERT INTO hostel_beds (id, organization_id, campus_id, name, code, reference_id, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["bed-cross", "org-b", "campus-b", "Cross", "X", "room-a", now, now, "active"],
    }));
    await expectRejected(() => client.execute({
      sql: "INSERT INTO hostel_allotments (id, organization_id, campus_id, room_id, bed_id, student_id, allotted_on, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["allotment-capacity", "org-a", "campus-a", "room-a", "bed-b", "student-b", now, now, now, "active"],
    }));
  });

  it("keeps messages and notification recipients tenant-scoped", async () => {
    await client.batch([
      { sql: "INSERT INTO messages (id, organization_id, campus_id, subject, body, audience_json, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", args: ["message-a", "org-a", "campus-a", "Notice", "Body", "{\"type\":\"all\"}", now, now, "draft"] },
      { sql: "INSERT INTO notification_events (id, organization_id, campus_id, message_id, recipient_user_id, channel, payload_json, sent_at, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", args: ["notification-a", "org-a", "campus-a", "message-a", "user-a", "in_app", "{}", now, now, now, "sent"] },
    ]);
    await expectRejected(() => client.execute({
      sql: "INSERT INTO messages (id, organization_id, campus_id, subject, body, audience_json, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["message-cross", "org-a", "campus-b", "Cross", "Body", "{}", now, now, "draft"],
    }));
    await expectRejected(() => client.execute({
      sql: "INSERT INTO notification_events (id, organization_id, campus_id, message_id, recipient_user_id, channel, payload_json, sent_at, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["notification-cross", "org-a", "campus-a", "message-a", "user-missing", "in_app", "{}", now, now, now, "sent"],
    }));
  });

  it("rejects invalid procurement workflow states", async () => {
    await client.execute({
      sql: "INSERT INTO purchase_requisitions (id, organization_id, campus_id, name, details_json, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["requisition-a", "org-a", "campus-a", "Paper", "{}", now, now, "draft"],
    });
    await expectRejected(() => client.execute({
      sql: "INSERT INTO purchase_requisitions (id, organization_id, campus_id, name, details_json, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["requisition-invalid", "org-a", "campus-a", "Invalid", "{}", now, now, "published"],
    }));
    await client.execute({
      sql: "INSERT INTO purchase_orders (id, organization_id, campus_id, name, details_json, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["order-a", "org-a", "campus-a", "PO", "{}", now, now, "draft"],
    });
    await expectRejected(() => client.execute({
      sql: "UPDATE purchase_orders SET status = ? WHERE id = ?",
      args: ["published", "order-a"],
    }));
    await client.execute({
      sql: "INSERT INTO inventory_items (id, organization_id, campus_id, name, sku, quantity, reorder_level, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["goods-item-a", "org-a", "campus-a", "Received paper", "GOODS-A", 0, 1, now, now, "active"],
    });
    await client.execute({
      sql: "UPDATE purchase_orders SET status = ? WHERE id = ?",
      args: ["ordered", "order-a"],
    });
    await client.execute({
      sql: "INSERT INTO goods_receipts (id, organization_id, campus_id, name, reference_id, details_json, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["goods-receipt-a", "org-a", "campus-a", "Receipt", "order-a", "{}", now, now, "posted"],
    });
    await expectRejected(() => client.execute({
      sql: "INSERT INTO goods_receipts (id, organization_id, campus_id, name, reference_id, details_json, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["goods-receipt-cross", "org-b", "campus-b", "Cross", "order-a", "{}", now, now, "posted"],
    }));
  });

  it("keeps sensitive health records linked to the student tenant and campus", async () => {
    await client.batch([
      { sql: "INSERT INTO health_profiles (id, organization_id, campus_id, student_id, allergies, conditions, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", args: ["health-profile-a", "org-a", "campus-a", "student-a", "None", "Asthma", now, now, "active"] },
      { sql: "INSERT INTO clinic_visits (id, organization_id, campus_id, student_id, visited_at, summary, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", args: ["clinic-a", "org-a", "campus-a", "student-a", now, "Routine", now, now, "active"] },
    ]);
    await expectRejected(() => client.execute({
      sql: "INSERT INTO health_profiles (id, organization_id, campus_id, student_id, allergies, conditions, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["health-profile-cross", "org-b", "campus-b", "student-a", "Cross", "Cross", now, now, "active"],
    }));
    await expectRejected(() => client.execute({
      sql: "INSERT INTO clinic_visits (id, organization_id, campus_id, student_id, visited_at, summary, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["clinic-cross", "org-a", "campus-b", "student-a", now, "Cross", now, now, "active"],
    }));
  });

  it("keeps canteen transactions linked to a tenant menu", async () => {
    await client.batch([
      { sql: "INSERT INTO mess_menus (id, organization_id, campus_id, name, details_json, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", args: ["menu-a", "org-a", "campus-a", "Lunch", "{}", now, now, "active"] },
      { sql: "INSERT INTO canteen_transactions (id, organization_id, campus_id, name, reference_id, details_json, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", args: ["canteen-a", "org-a", "campus-a", "Lunch", "menu-a", "{}", now, now, "posted"] },
    ]);
    await expectRejected(() => client.execute({
      sql: "INSERT INTO mess_menus (id, organization_id, campus_id, name, details_json, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["menu-cross", "org-a", "campus-b", "Cross", "{}", now, now, "active"],
    }));
    await expectRejected(() => client.execute({
      sql: "INSERT INTO canteen_transactions (id, organization_id, campus_id, name, reference_id, details_json, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["canteen-cross", "org-b", "campus-b", "Cross", "menu-a", "{}", now, now, "posted"],
    }));
  });

  it("keeps asset lifecycle records tenant-scoped and assignment-safe", async () => {
    await client.batch([
      { sql: "INSERT INTO assets (id, organization_id, campus_id, name, code, details_json, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", args: ["asset-a", "org-a", "campus-a", "Laptop", "ASSET-A", '{"category":"IT","acquisitionMinor":1000,"bookValueMinor":1000,"usefulLifeMonths":36}', now, now, "active"] },
      { sql: "INSERT INTO asset_assignments (id, organization_id, campus_id, name, reference_id, assignee_type, assignee_id, effective_at, details_json, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", args: ["assignment-a", "org-a", "campus-a", "Laptop assignment", "asset-a", "student", "student-a", now, "{}", now, now, "active"] },
      { sql: "INSERT INTO asset_maintenance_tickets (id, organization_id, campus_id, name, reference_id, details_json, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", args: ["asset-ticket-a", "org-a", "campus-a", "Screen repair", "asset-a", "{}", now, now, "open"] },
      { sql: "INSERT INTO asset_depreciation_entries (id, organization_id, campus_id, name, code, reference_id, effective_at, details_json, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", args: ["depreciation-a", "org-a", "campus-a", "Depreciation", "2026-08", "asset-a", now, "{}", now, now, "posted"] },
    ]);
    await expectRejected(() => client.execute({
      sql: "INSERT INTO asset_assignments (id, organization_id, campus_id, name, reference_id, assignee_type, assignee_id, effective_at, details_json, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["assignment-duplicate", "org-a", "campus-a", "Duplicate", "asset-a", "student", "student-a", now, "{}", now, now, "active"],
    }));
    await expectRejected(() => client.execute({
      sql: "INSERT INTO asset_assignments (id, organization_id, campus_id, name, reference_id, assignee_type, assignee_id, effective_at, details_json, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["assignment-cross", "org-b", "campus-b", "Cross", "asset-a", "student", "student-a", now, "{}", now, now, "active"],
    }));
    await expectRejected(() => client.execute({
      sql: "INSERT INTO asset_assignments (id, organization_id, campus_id, name, reference_id, assignee_type, assignee_id, effective_at, details_json, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["assignment-assignee-cross", "org-a", "campus-a", "Invalid assignee", "asset-a", "student", "student-missing", now, "{}", now, now, "draft"],
    }));
    await expectRejected(() => client.execute({
      sql: "INSERT INTO asset_maintenance_tickets (id, organization_id, campus_id, name, reference_id, details_json, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["asset-ticket-cross", "org-a", "campus-b", "Cross", "asset-a", "{}", now, now, "open"],
    }));
    await expectRejected(() => client.execute({
      sql: "INSERT INTO asset_depreciation_entries (id, organization_id, campus_id, name, code, reference_id, effective_at, details_json, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["depreciation-cross", "org-b", "campus-b", "Cross", "2026-08", "asset-a", now, "{}", now, now, "posted"],
    }));
    await expectRejected(() => client.execute({ sql: "UPDATE assets SET status = ? WHERE id = ?", args: ["published", "asset-a"] }));
  });

  it("keeps safety and facilities workflows tenant-scoped", async () => {
    await client.batch([
      { sql: "INSERT INTO visitor_logs (id, organization_id, campus_id, name, effective_at, details_json, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", args: ["visitor-a", "org-a", "campus-a", "Visitor A", now, "{}", now, now, "expected"] },
      { sql: "INSERT INTO gate_passes (id, organization_id, campus_id, name, reference_id, effective_at, details_json, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", args: ["gate-pass-a", "org-a", "campus-a", "Pass A", "visitor-a", now + 86_400_000, "{}", now, now, "requested"] },
      { sql: "INSERT INTO security_incidents (id, organization_id, campus_id, name, effective_at, details_json, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", args: ["incident-a", "org-a", "campus-a", "Incident A", now, "{}", now, now, "open"] },
      { sql: "INSERT INTO evacuation_roll_calls (id, organization_id, campus_id, name, effective_at, details_json, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", args: ["evacuation-a", "org-a", "campus-a", "Drill A", now, "{}", now, now, "open"] },
      { sql: "INSERT INTO facility_bookings (id, organization_id, campus_id, name, effective_at, details_json, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", args: ["booking-a", "org-a", "campus-a", "Hall A", now, "{}", now, now, "requested"] },
      { sql: "INSERT INTO facility_maintenance_tickets (id, organization_id, campus_id, name, details_json, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", args: ["facility-ticket-a", "org-a", "campus-a", "Repair A", "{}", now, now, "open"] },
      { sql: "INSERT INTO facility_complaints (id, organization_id, campus_id, name, details_json, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", args: ["facility-complaint-a", "org-a", "campus-a", "Complaint A", "{}", now, now, "open"] },
    ]);
    await expectRejected(() => client.execute({
      sql: "INSERT INTO gate_passes (id, organization_id, campus_id, name, reference_id, effective_at, details_json, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["gate-pass-cross", "org-b", "campus-b", "Cross", "visitor-a", now, "{}", now, now, "requested"],
    }));
    await expectRejected(() => client.execute({
      sql: "INSERT INTO facility_complaints (id, organization_id, campus_id, name, details_json, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["facility-complaint-cross", "org-a", "campus-b", "Cross", "{}", now, now, "open"],
    }));
    await expectRejected(() => client.execute({ sql: "UPDATE security_incidents SET status = ? WHERE id = ?", args: ["published", "incident-a"] }));
  });

  it("keeps community and CMS records tenant-scoped and publication-safe", async () => {
    await client.batch([
      { sql: "INSERT INTO clubs (id, organization_id, campus_id, name, coordinator_user_id, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", args: ["club-a", "org-a", "campus-a", "Science Club", "user-a", now, now, "active"] },
      { sql: "INSERT INTO club_memberships (id, organization_id, campus_id, name, reference_id, details_json, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", args: ["membership-a", "org-a", "campus-a", "Student A", "club-a", "{\"studentId\":\"student-a\"}", now, now, "active"] },
      { sql: "INSERT INTO sports_teams (id, organization_id, campus_id, name, details_json, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", args: ["team-a", "org-a", "campus-a", "Athletics A", "{\"sport\":\"track\"}", now, now, "active"] },
      { sql: "INSERT INTO sports_fixtures (id, organization_id, campus_id, name, reference_id, effective_at, details_json, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", args: ["fixture-a", "org-a", "campus-a", "Athletics A vs B", "team-a", now, "{}", now, now, "planned"] },
      { sql: "INSERT INTO student_achievements (id, organization_id, campus_id, student_id, title, achieved_on, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", args: ["achievement-a", "org-a", "campus-a", "student-a", "Science prize", now, now, now, "active"] },
      { sql: "INSERT INTO alumni_profiles (id, organization_id, campus_id, student_id, name, graduation_year, directory_visible, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", args: ["alumni-a", "org-a", "campus-a", "student-a", "Alumni A", "2020", 1, now, now, "active"] },
      { sql: "INSERT INTO alumni_events (id, organization_id, campus_id, name, effective_at, details_json, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", args: ["alumni-event-a", "org-a", "campus-a", "Reunion", now, "{}", now, now, "planned"] },
      { sql: "INSERT INTO event_registrations (id, organization_id, campus_id, name, reference_id, details_json, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", args: ["event-registration-a", "org-a", "campus-a", "Attendee A", "alumni-event-a", "{}", now, now, "registered"] },
      { sql: "INSERT INTO alumni_donations (id, organization_id, campus_id, name, details_json, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", args: ["donation-a", "org-a", "campus-a", "Donor A", "{\"amountMinor\":1000}", now, now, "received"] },
      { sql: "INSERT INTO mentorships (id, organization_id, campus_id, name, details_json, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", args: ["mentorship-a", "org-a", "campus-a", "Mentor to mentee", "{}", now, now, "requested"] },
      { sql: "INSERT INTO job_board_posts (id, organization_id, campus_id, name, details_json, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", args: ["job-post-a", "org-a", "campus-a", "Teacher role", "{}", now, now, "draft"] },
      { sql: "INSERT INTO cms_pages (id, organization_id, campus_id, slug, title, body, seo_json, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", args: ["cms-page-a", "org-a", "campus-a", "about-school", "About", "Body", "{}", now, now, "draft"] },
      { sql: "INSERT INTO cms_media (id, organization_id, campus_id, name, details_json, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", args: ["cms-media-a", "org-a", "campus-a", "Logo", "{}", now, now, "draft"] },
      { sql: "INSERT INTO forms (id, organization_id, campus_id, name, details_json, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", args: ["form-a", "org-a", "campus-a", "Contact form", "{}", now, now, "published"] },
      { sql: "INSERT INTO form_submissions (id, organization_id, campus_id, form_id, payload_json, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", args: ["submission-a", "org-a", "campus-a", "form-a", "{}", now, now, "received"] },
    ]);
    await expectRejected(() => client.execute({
      sql: "INSERT INTO student_achievements (id, organization_id, campus_id, student_id, title, achieved_on, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["achievement-cross", "org-b", "campus-b", "student-a", "Cross", now, now, now, "active"],
    }));
    await expectRejected(() => client.execute({
      sql: "INSERT INTO club_memberships (id, organization_id, campus_id, name, reference_id, details_json, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["membership-cross", "org-b", "campus-b", "Cross", "club-a", "{\"studentId\":\"student-a\"}", now, now, "active"],
    }));
    await expectRejected(() => client.execute({
      sql: "INSERT INTO sports_fixtures (id, organization_id, campus_id, name, reference_id, effective_at, details_json, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["fixture-cross", "org-a", "campus-b", "Cross", "team-a", now, "{}", now, now, "planned"],
    }));
    await expectRejected(() => client.execute({
      sql: "INSERT INTO event_registrations (id, organization_id, campus_id, name, reference_id, details_json, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["event-registration-cross", "org-b", "campus-b", "Cross", "alumni-event-a", "{}", now, now, "registered"],
    }));
    await expectRejected(() => client.execute({
      sql: "INSERT INTO alumni_donations (id, organization_id, campus_id, name, details_json, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["donation-cross", "org-a", "campus-b", "Cross", "{}", now, now, "received"],
    }));
    await expectRejected(() => client.execute({
      sql: "INSERT INTO cms_pages (id, organization_id, campus_id, slug, title, body, seo_json, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["cms-page-cross", "org-a", "campus-b", "cross-page", "Cross", "Body", "{}", now, now, "draft"],
    }));
    await expectRejected(() => client.execute({
      sql: "INSERT INTO form_submissions (id, organization_id, campus_id, form_id, payload_json, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["submission-cross", "org-b", "campus-b", "form-a", "{}", now, now, "received"],
    }));
    await expectRejected(() => client.execute({ sql: "UPDATE cms_pages SET status = ? WHERE id = ?", args: ["pending", "cms-page-a"] }));
  });
});
