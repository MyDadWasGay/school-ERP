CREATE TABLE `payment_provider_orders` (
  `id` text PRIMARY KEY NOT NULL,
  `organization_id` text NOT NULL,
  `campus_id` text,
  `provider` text NOT NULL,
  `invoice_id` text NOT NULL,
  `student_id` text NOT NULL,
  `amount_minor` integer NOT NULL,
  `currency` text NOT NULL,
  `receipt` text NOT NULL,
  `idempotency_key` text NOT NULL,
  `provider_order_id` text,
  `provider_payment_id` text,
  `failure_code` text,
  `failure_description` text,
  `paid_at` integer,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  `created_by` text,
  `updated_by` text,
  `status` text DEFAULT 'creating' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `provider_orders_org_idempotency_unique` ON `payment_provider_orders` (`organization_id`, `idempotency_key`);
--> statement-breakpoint
CREATE UNIQUE INDEX `provider_orders_provider_order_unique` ON `payment_provider_orders` (`provider`, `provider_order_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `provider_orders_provider_payment_unique` ON `payment_provider_orders` (`provider`, `provider_payment_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `provider_orders_org_receipt_unique` ON `payment_provider_orders` (`organization_id`, `receipt`);
--> statement-breakpoint
CREATE INDEX `provider_orders_invoice_status_idx` ON `payment_provider_orders` (`organization_id`, `invoice_id`, `status`);
--> statement-breakpoint
CREATE UNIQUE INDEX `provider_orders_active_invoice_unique` ON `payment_provider_orders` (`organization_id`, `invoice_id`) WHERE `status` IN ('creating', 'created', 'verified', 'manual_review');
--> statement-breakpoint
CREATE TRIGGER `provider_orders_scope_guard`
BEFORE INSERT ON `payment_provider_orders`
WHEN NEW.amount_minor <= 0
  OR length(NEW.currency) <> 3
  OR NOT EXISTS (
    SELECT 1 FROM `fee_invoices`
    WHERE id = NEW.invoice_id
      AND organization_id = NEW.organization_id
      AND student_id = NEW.student_id
      AND (campus_id = NEW.campus_id OR (campus_id IS NULL AND NEW.campus_id IS NULL))
      AND status IN ('open', 'partial', 'overdue')
      AND balance_minor >= NEW.amount_minor
  )
BEGIN SELECT RAISE(ABORT, 'provider order invoice scope or amount is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER `provider_orders_identity_update_guard`
BEFORE UPDATE ON `payment_provider_orders`
WHEN NEW.organization_id <> OLD.organization_id
  OR NEW.provider <> OLD.provider
  OR NEW.invoice_id <> OLD.invoice_id
  OR NEW.student_id <> OLD.student_id
  OR NEW.amount_minor <> OLD.amount_minor
  OR NEW.currency <> OLD.currency
  OR NEW.receipt <> OLD.receipt
  OR NEW.idempotency_key <> OLD.idempotency_key
  OR NOT (NEW.campus_id IS OLD.campus_id)
BEGIN SELECT RAISE(ABORT, 'provider order identity is immutable'); END;
--> statement-breakpoint
ALTER TABLE `fee_refunds` ADD COLUMN `idempotency_key` text;
--> statement-breakpoint
ALTER TABLE `fee_refunds` ADD COLUMN `provider` text;
--> statement-breakpoint
ALTER TABLE `fee_refunds` ADD COLUMN `provider_refund_id` text;
--> statement-breakpoint
ALTER TABLE `fee_refunds` ADD COLUMN `provider_status` text;
--> statement-breakpoint
ALTER TABLE `fee_refunds` ADD COLUMN `failure_description` text;
--> statement-breakpoint
CREATE UNIQUE INDEX `refunds_org_idempotency_unique` ON `fee_refunds` (`organization_id`, `idempotency_key`);
--> statement-breakpoint
CREATE UNIQUE INDEX `refunds_provider_id_unique` ON `fee_refunds` (`provider`, `provider_refund_id`);
--> statement-breakpoint
INSERT OR IGNORE INTO `permissions` (
  `id`, `key`, `name`, `module`, `action`, `created_at`, `updated_at`, `status`
) VALUES (
  'permission_fees_pay_online', 'fees:pay_online', 'Pay fees online', 'fees', 'pay_online', unixepoch(), unixepoch(), 'active'
);
--> statement-breakpoint
INSERT OR IGNORE INTO `role_permissions` (
  `organization_id`, `role_id`, `permission_id`, `created_at`, `updated_at`
)
SELECT `organization_id`, `id`, 'permission_fees_pay_online', unixepoch(), unixepoch()
FROM `roles`
WHERE `key` IN ('super_admin', 'management', 'principal', 'accountant', 'parent', 'student')
  AND `status` = 'active';
