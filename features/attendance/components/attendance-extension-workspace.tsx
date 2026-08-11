"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { recordStaffAttendanceAction } from "../actions/attendance-extension.actions";

type Employee = { id: string; name: string };
type Row = { id: string; name: string; effectiveAt: Date | null; state: string; note: string | null };

export function StaffAttendanceWorkspace({ employees, rows, canCreate }: { employees: Employee[]; rows: Row[]; canCreate: boolean }) {
  const router = useRouter(); const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const result = await recordStaffAttendanceAction(Object.fromEntries(new FormData(event.currentTarget).entries())); setMessage(result.ok ? result.message ?? "Saved." : result.error); if (result.ok) { event.currentTarget.reset(); router.refresh(); } }
  return <div className="space-y-6">{canCreate ? <Card><CardHeader><CardTitle>Record staff attendance</CardTitle></CardHeader><CardContent><form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" onSubmit={submit}><div><Label>Employee</Label><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" name="employeeId" required>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></div><div><Label>Date</Label><Input name="attendanceDate" type="date" required /></div><div><Label>State</Label><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" name="state"><option value="present">Present</option><option value="absent">Absent</option><option value="late">Late</option><option value="leave">Leave</option></select></div><div><Label>Note</Label><Input name="note" /></div><Button>Save attendance</Button>{message ? <span role="status" className="text-sm text-muted-foreground">{message}</span> : null}</form></CardContent></Card> : null}<Card><CardHeader><CardTitle>Recent staff attendance</CardTitle></CardHeader><CardContent>{rows.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-3">Employee</th><th className="p-3">Date</th><th className="p-3">State</th><th className="p-3">Note</th></tr></thead><tbody>{rows.map((row) => <tr className="border-b last:border-0" key={row.id}><td className="p-3">{row.name}</td><td className="p-3">{row.effectiveAt?.toLocaleDateString() ?? "—"}</td><td className="p-3">{row.state}</td><td className="p-3 text-muted-foreground">{row.note ?? "—"}</td></tr>)}</tbody></table></div> : <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No staff attendance records found.</p>}</CardContent></Card></div>;
}
