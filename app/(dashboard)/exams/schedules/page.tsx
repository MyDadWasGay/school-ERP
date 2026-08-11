import { redirect } from "next/navigation";

/**
 * Scheduling is intentionally owned by the exam-planning workflow so clash
 * detection and exam state transitions cannot diverge between two editors.
 */
export default function ExamSchedulesPage() {
  redirect("/exams/planning");
}
