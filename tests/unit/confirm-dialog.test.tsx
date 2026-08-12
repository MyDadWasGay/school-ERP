import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "@/components/common/confirm-dialog";

describe("ConfirmDialog", () => {
  it("traps focus, restores it after cancel, and closes on Escape", async () => {
    const user = userEvent.setup();
    render(<ConfirmDialog label="Archive" description="Archive this supplier." onConfirm={vi.fn()} />);

    const trigger = screen.getByRole("button", { name: "Archive" });
    await user.click(trigger);

    const cancel = screen.getByRole("button", { name: "Cancel" });
    const confirm = screen.getByRole("button", { name: "Archive" });
    expect(cancel).toHaveFocus();

    await user.tab();
    expect(confirm).toHaveFocus();
    await user.tab();
    expect(cancel).toHaveFocus();
    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole("button", { name: "Archive" })).toHaveFocus());
  });

  it("keeps the dialog open and reports a failed mutation", async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error("Supplier is still referenced."));
    render(<ConfirmDialog label="Archive" onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Supplier is still referenced."));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
