import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createStudentAction } = vi.hoisted(() => ({ createStudentAction: vi.fn() }));
vi.mock("../actions/student.actions", () => ({ createStudentAction }));

import { StudentCreateForm } from "../components/student-create-form";

describe("StudentCreateForm", () => {
  beforeEach(() => {
    createStudentAction.mockReset();
    createStudentAction.mockResolvedValue({ ok: true, data: { id: "student-1" }, message: "Student created." });
  });

  it("submits values entered into the shared Input controls", async () => {
    render(<StudentCreateForm options={{ campuses: [{ id: "campus-1", name: "Central Campus", code: "CENTRAL" }], academicYears: [], classes: [], sections: [] }} />);
    fireEvent.click(screen.getByRole("button", { name: "New student" }));
    const fields = screen.getAllByRole("textbox");
    fireEvent.change(fields[0], { target: { value: "ST-100" } });
    fireEvent.change(fields[1], { target: { value: "Sameer" } });
    fireEvent.change(fields[2], { target: { value: "Choudhary" } });
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "campus-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Create student" }));
    await waitFor(() => expect(createStudentAction).toHaveBeenCalledWith(expect.objectContaining({ admissionNumber: "ST-100", firstName: "Sameer", lastName: "Choudhary", campusId: "campus-1" })));
    expect(screen.queryByText("Required")).not.toBeInTheDocument();
  });
});
