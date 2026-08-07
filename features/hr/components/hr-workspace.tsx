"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createEmployeeAction, createPayrollRunAction, processPayrollRunAction } from "../actions/hr.actions";

function ResultMessage({ message }: { message: string }) {
  return message ? <p role="status" className="text-sm text-muted-foreground">{message}</p> : null;
}

export function EmployeeForm() {
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const result = await createEmployeeAction({
      employeeNumber: data.get("employeeNumber"),
      firstName: data.get("firstName"),
      lastName: data.get("lastName"),
      email: data.get("email"),
      jobTitle: data.get("jobTitle"),
      linkedUserId: data.get("linkedUserId"),
      salaryMinor: data.get("salaryMinor"),
    });
    setMessage(result.ok ? result.message ?? "Employee created." : result.error);
    if (result.ok) event.currentTarget.reset();
  }
  return <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" noValidate>
    <div className="space-y-2"><Label htmlFor="employee-number">Employee ID</Label><Input id="employee-number" name="employeeNumber" placeholder="EMP-001" required /></div>
    <div className="space-y-2"><Label htmlFor="employee-first-name">First name</Label><Input id="employee-first-name" name="firstName" required /></div>
    <div className="space-y-2"><Label htmlFor="employee-last-name">Last name</Label><Input id="employee-last-name" name="lastName" required /></div>
    <div className="space-y-2"><Label htmlFor="employee-title">Job title</Label><Input id="employee-title" name="jobTitle" placeholder="Teacher" /></div>
    <div className="space-y-2"><Label htmlFor="employee-email">Work email</Label><Input id="employee-email" name="email" type="email" /></div>
    <div className="space-y-2"><Label htmlFor="employee-salary">Monthly salary (minor units)</Label><Input id="employee-salary" name="salaryMinor" type="number" min="0" defaultValue="0" required /></div>
    <div className="space-y-2"><Label htmlFor="employee-linked-user">Linked portal user ID</Label><Input id="employee-linked-user" name="linkedUserId" placeholder="Optional" /></div>
    <div className="flex items-end justify-between gap-3"><ResultMessage message={message} /><Button>Create employee</Button></div>
  </form>;
}

export function PayrollRunForm() {
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const result = await createPayrollRunAction({ period: data.get("period") });
    setMessage(result.ok ? result.message ?? "Payroll run created." : result.error);
    if (result.ok) event.currentTarget.reset();
  }
  return <form onSubmit={submit} className="flex flex-wrap items-end gap-4" noValidate>
    <div className="space-y-2"><Label htmlFor="payroll-period">Payroll period</Label><Input id="payroll-period" name="period" type="month" required /></div>
    <Button>Create draft run</Button><ResultMessage message={message} />
  </form>;
}

export function ProcessPayrollButton({ runId, disabled = false }: { runId: string; disabled?: boolean }) {
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);
  async function process() {
    setWorking(true);
    const result = await processPayrollRunAction({ runId });
    setMessage(result.ok ? result.message ?? "Payroll completed." : result.error);
    setWorking(false);
    if (result.ok) window.location.reload();
  }
  return <div className="flex flex-wrap items-center gap-2"><Button size="sm" onClick={process} disabled={disabled || working}>{working ? "Processing..." : "Process run"}</Button>{message ? <span role="status" className="text-xs text-muted-foreground">{message}</span> : null}</div>;
}
