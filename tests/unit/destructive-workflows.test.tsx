import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  archiveSupplierAction: vi.fn(),
  createSupplierAction: vi.fn(),
  createInventoryItemAction: vi.fn(),
  postStockMovementAction: vi.fn(),
  createRefund: vi.fn(),
  createBrowserApiClient: vi.fn(),
  createDelegationAction: vi.fn(),
  revokeDelegationAction: vi.fn(),
  updateUserAccessAction: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/features/inventory/actions/inventory.actions", () => ({
  archiveSupplierAction: mocks.archiveSupplierAction,
  createSupplierAction: mocks.createSupplierAction,
  createInventoryItemAction: mocks.createInventoryItemAction,
  postStockMovementAction: mocks.postStockMovementAction,
}));
vi.mock("@/lib/api-client/browser", () => ({
  createBrowserApiClient: mocks.createBrowserApiClient,
}));
vi.mock("@/features/users/actions/user-access.actions", () => ({
  createDelegationAction: mocks.createDelegationAction,
  revokeDelegationAction: mocks.revokeDelegationAction,
  updateUserAccessAction: mocks.updateUserAccessAction,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

import { RefundForm } from "@/features/finance/components/refund-form";
import { SupplierList } from "@/features/inventory/components/inventory-workspace";
import { UserAccessWorkspace } from "@/features/users/components/user-access-workspace";

describe("destructive workflow confirmations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createBrowserApiClient.mockReturnValue({ createRefund: mocks.createRefund });
  });

  it("keeps supplier archive in the dialog when the server rejects it", async () => {
    mocks.archiveSupplierAction.mockResolvedValue({ ok: false, error: "Supplier is still referenced." });
    render(<SupplierList suppliers={[{ id: "supplier-1", name: "Acme Supplies", contactEmail: null, phone: null }]} />);

    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));

    await waitFor(() => expect(mocks.archiveSupplierAction).toHaveBeenCalledWith({ id: "supplier-1" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Supplier is still referenced.");
  });

  it("confirms a refund before sending the idempotent mutation", async () => {
    mocks.createRefund.mockResolvedValue({ status: "completed" });
    render(<RefundForm payments={[{ id: "payment-1", label: "Asha · INV-1", remainingMinor: 5000 }]} campusId="campus-1" />);

    fireEvent.change(screen.getByLabelText("Amount (INR)"), { target: { value: "25" } });
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Duplicate payment" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit refund" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit refund" }));

    await waitFor(() => expect(mocks.createRefund).toHaveBeenCalledWith(expect.objectContaining({
      paymentId: "payment-1",
      amountMinor: 2500,
      reason: "Duplicate payment",
      idempotencyKey: expect.any(String),
    })));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps delegated access removal retryable when revocation fails", async () => {
    mocks.revokeDelegationAction.mockResolvedValue({ ok: false, error: "The delegation could not be revoked." });
    render(
      <UserAccessWorkspace
        user={{ id: "user-1", displayName: "Teacher One", email: "teacher@example.com", role: "teacher", status: "active", campusId: null }}
        campusOptions={[]}
        classSectionOptions={[]}
        assignedCampusIds={[]}
        assignedClassScopes={[]}
        delegations={[{ id: "delegation-1", campusId: null, permissionKey: "attendance:write", startsAt: new Date("2026-08-12T08:00:00Z"), endsAt: new Date("2026-08-12T16:00:00Z"), status: "active" }]}
        canManage
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Revoke" }));
    fireEvent.click(screen.getByRole("button", { name: "Revoke" }));

    await waitFor(() => expect(mocks.revokeDelegationAction).toHaveBeenCalledWith({ id: "delegation-1", userId: "user-1" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("The delegation could not be revoked.");
  });
});
