import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { auditColumns, idColumn, tenantColumns, statusColumn } from "./shared";
export const libraryCopies = sqliteTable("library_copies", { id: idColumn("library_copy"), ...tenantColumns(), itemId: text("item_id").notNull(), accessionNumber: text("accession_number").notNull(), ...auditColumns(), status: statusColumn("available") }, (table) => [uniqueIndex("library_accession_unique").on(table.organizationId, table.accessionNumber), index("library_copies_item_idx").on(table.organizationId, table.itemId)]);
export const libraryIssueTransactions = sqliteTable("library_issue_transactions", {
  id: idColumn("library_issue"),
  ...tenantColumns(),
  copyId: text("copy_id").notNull(),
  borrowerUserId: text("borrower_user_id").notNull(),
  borrowerType: text("borrower_type").notNull().default("user"),
  borrowerId: text("borrower_id"),
  issuedAt: integer("issued_at", { mode: "timestamp" }).notNull(),
  dueAt: integer("due_at", { mode: "timestamp" }),
  returnedAt: integer("returned_at", { mode: "timestamp" }),
  fineMinor: integer("fine_minor").notNull().default(0),
  renewalCount: integer("renewal_count").notNull().default(0),
  ...auditColumns(),
  status: statusColumn("issued"),
}, (table) => [
  index("library_issue_borrower_idx").on(table.organizationId, table.borrowerType, table.borrowerId),
  index("library_issue_copy_idx").on(table.organizationId, table.copyId, table.status),
]);
