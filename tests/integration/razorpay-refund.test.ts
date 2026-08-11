import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { CurrentUser } from "@/lib/auth/types";
import { RazorpayClient } from "@/lib/integrations/razorpay";

const now = Date.now();
const directory = mkdtempSync(path.join(tmpdir(), "school-erp-refund-"));
const databasePath = path.join(directory, "refund.db");
process.env.TURSO_DATABASE_URL = `file:${databasePath}`;
process.env.APP_ENCRYPTION_SECRET =
  "refund-test-encryption-secret-32-characters";

const user: CurrentUser = {
  id: "user-refund",
  firebaseUid: "firebase-refund",
  email: "finance@example.com",
  displayName: "Finance User",
  role: "accountant",
  organizationId: "org-refund",
  organizationName: "Refund School",
  campusId: "campus-refund",
  permissions: ["fees:refund"],
};

describe("Razorpay refund reconciliation", () => {
  beforeAll(async () => {
    const client = createClient({ url: `file:${databasePath}` });
    await migrate(drizzle(client), {
      migrationsFolder: path.join(process.cwd(), "drizzle"),
    });
    await client.batch([
      {
        sql: "INSERT INTO organizations (id, name, slug, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?)",
        args: [
          "org-refund",
          "Refund School",
          "refund-school",
          now,
          now,
          "active",
        ],
      },
      {
        sql: "INSERT INTO campuses (id, organization_id, name, code, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
        args: [
          "campus-refund",
          "org-refund",
          "Main",
          "MAIN",
          now,
          now,
          "active",
        ],
      },
      {
        sql: "INSERT INTO users (id, firebase_uid, organization_id, campus_id, email, display_name, role, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        args: [
          user.id,
          user.firebaseUid,
          user.organizationId,
          user.campusId!,
          user.email,
          user.displayName,
          user.role,
          now,
          now,
          "active",
        ],
      },
      {
        sql: "INSERT INTO students (id, organization_id, campus_id, admission_number, first_name, last_name, joined_on, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        args: [
          "student-refund",
          "org-refund",
          "campus-refund",
          "REF-001",
          "Refund",
          "Student",
          now,
          now,
          now,
          "active",
        ],
      },
      {
        sql: "INSERT INTO fee_invoices (id, organization_id, campus_id, student_id, invoice_number, issued_on, due_on, total_minor, balance_minor, currency, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        args: [
          "invoice-refund",
          "org-refund",
          "campus-refund",
          "student-refund",
          "INV-REFUND",
          now,
          now,
          10000,
          0,
          "INR",
          now,
          now,
          "paid",
        ],
      },
      {
        sql: "INSERT INTO fee_payments (id, organization_id, campus_id, invoice_id, student_id, receipt_number, idempotency_key, amount_minor, method, provider_reference, paid_at, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        args: [
          "payment-refund",
          "org-refund",
          "campus-refund",
          "invoice-refund",
          "student-refund",
          "RCPT-REFUND",
          "payment-refund-request",
          10000,
          "online",
          "pay_refund123",
          now,
          now,
          now,
          "posted",
        ],
      },
    ]);
    await client.close();
    const { saveRazorpayConfiguration } =
      await import("@/features/integrations/services/razorpay-config.service");
    await saveRazorpayConfiguration(user, {
      keyId: "rzp_test_refund123",
      keySecret: "razorpay-refund-key-secret",
      webhookSecret: "razorpay-refund-webhook-secret",
    });
  });

  it("reserves a pending provider refund and posts the ledger only after processed status", async () => {
    let providerReceipt = "";
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(async (_url, init: RequestInit) => {
        providerReceipt = (JSON.parse(String(init.body)) as { receipt: string })
          .receipt;
        return new Response(
          JSON.stringify({
            id: "rfnd_refund123",
            entity: "refund",
            amount: 2500,
            currency: "INR",
            payment_id: "pay_refund123",
            receipt: providerReceipt,
            status: "pending",
            created_at: 1786250000,
          }),
          { status: 200 },
        );
      })
      .mockImplementationOnce(
        async () =>
          new Response(
            JSON.stringify({
              id: "rfnd_refund123",
              entity: "refund",
              amount: 2500,
              currency: "INR",
              payment_id: "pay_refund123",
              receipt: providerReceipt,
              status: "processed",
              created_at: 1786250000,
            }),
            { status: 200 },
          ),
      );
    const clientFactory = () =>
      new RazorpayClient(
        { keyId: "rzp_test_refund123", keySecret: "secret-refund" },
        fetchMock,
      );
    const input = {
      paymentId: "payment-refund",
      amountMinor: 2500,
      reason: "Approved correction",
      idempotencyKey: "refund-attempt-123",
    };
    const { refundPayment } =
      await import("@/features/finance/services/refund.service");

    const pending = await refundPayment(user, input, clientFactory);
    expect(pending.refund.status).toBe("pending");
    expect(pending.invoice.balanceMinor).toBe(0);

    const completed = await refundPayment(user, input, clientFactory);
    expect(completed.refund.status).toBe("completed");
    expect(completed.invoice.balanceMinor).toBe(2500);

    const queryClient = createClient({ url: `file:${databasePath}` });
    const ledger = await queryClient.execute({
      sql: "SELECT account, debit_minor, credit_minor FROM ledger_entries WHERE reference_type = 'fee_refund' AND reference_id = ? ORDER BY account",
      args: [completed.refund.id],
    });
    expect(ledger.rows).toHaveLength(2);
    await queryClient.close();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
