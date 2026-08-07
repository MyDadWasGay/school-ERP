import { describe, expect, it } from "vitest";
import { marksSchema } from "../schemas/marks.schema";
import { canTransitionExamStatus, examScheduleSchema } from "../schemas/planning.schema";
describe("marks validation", () => { it("accepts marks inside range", () => expect(marksSchema.safeParse({ examId: "e1", studentId: "s1", subjectId: "sub1", marks: 78, maxMarks: 100 }).success).toBe(true)); it("rejects marks over maximum", () => expect(marksSchema.safeParse({ examId: "e1", studentId: "s1", subjectId: "sub1", marks: 101, maxMarks: 100 }).success).toBe(false)); });

describe("exam workflow", () => {
  it("requires approval before publication", () => {
    expect(canTransitionExamStatus("moderation", "published")).toBe(false);
    expect(canTransitionExamStatus("approved", "published")).toBe(true);
  });
  it("rejects an inverted schedule window", () => {
    expect(examScheduleSchema.safeParse({ examId: "e1", subjectId: "s1", classId: "c1", startsAt: "2026-08-07T10:00", endsAt: "2026-08-07T09:00" }).success).toBe(false);
  });
});
