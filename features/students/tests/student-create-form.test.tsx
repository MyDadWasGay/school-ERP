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

  it("links campus administrators to class setup when enrollment has no classes", () => {
    render(<StudentCreateForm initiallyOpen options={{ campuses: [{ id: "campus-1", name: "Central Campus", code: "CENTRAL" }], academicYears: [], classes: [], sections: [] }} />);

    expect(screen.getByText(/No active classes are configured for this campus/)).toBeVisible();
    expect(screen.getByRole("link", { name: "Set up classes" })).toHaveAttribute("href", "/settings/classes");
  });

  it("links administrators to section setup after a class is selected", () => {
    render(<StudentCreateForm initiallyOpen options={{
      campuses: [{ id: "campus-1", name: "Central Campus", code: "CENTRAL" }],
      academicYears: [{ id: "year-1", name: "2026-27", campusId: "campus-1" }],
      classes: [{ id: "class-1", name: "Class 1", campusId: "campus-1" }],
      sections: [],
    }} />);

    fireEvent.change(screen.getByLabelText("Class"), { target: { value: "class-1" } });
    expect(screen.getByText(/No sections are configured for the selected class and campus/)).toBeVisible();
    expect(screen.getByRole("link", { name: "Set up sections" })).toHaveAttribute("href", "/settings/sections");
  });
});
