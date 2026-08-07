"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCanteenTransactionAction, createMenuAction } from "../actions/canteen.actions";

function Message({ value }: { value: string }) { return value ? <p role="status" className="text-sm text-muted-foreground">{value}</p> : null; }

export function MenuForm() {
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const result = await createMenuAction({ name: data.get("name"), priceMinor: data.get("priceMinor") }); setMessage(result.ok ? result.message ?? "Created." : result.error); if (result.ok) event.currentTarget.reset(); }
  return <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate><div className="space-y-2"><Label htmlFor="canteen-menu-name">Menu item</Label><Input id="canteen-menu-name" name="name" required /></div><div className="space-y-2"><Label htmlFor="canteen-menu-price">Price (minor units)</Label><Input id="canteen-menu-price" name="priceMinor" type="number" min="0" required /></div><div className="sm:col-span-2 flex items-center justify-between gap-3"><Message value={message} /><Button>Create menu item</Button></div></form>;
}

export function CanteenTransactionForm({ menus, students }: { menus: Array<{ id: string; name: string; detailsJson: string | null }>; students: Array<{ id: string; name: string }> }) {
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const result = await createCanteenTransactionAction({ menuId: data.get("menuId"), studentId: data.get("studentId"), quantity: data.get("quantity") }); setMessage(result.ok ? result.message ?? "Recorded." : result.error); if (result.ok) event.currentTarget.reset(); }
  return <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3" noValidate><div className="space-y-2"><Label htmlFor="canteen-menu-select">Menu item</Label><select id="canteen-menu-select" name="menuId" className="h-10 w-full rounded-md border bg-background px-3 text-sm" required><option value="">Choose a menu item</option>{menus.map((menu) => <option key={menu.id} value={menu.id}>{menu.name}</option>)}</select></div><div className="space-y-2"><Label htmlFor="canteen-student-select">Student</Label><select id="canteen-student-select" name="studentId" className="h-10 w-full rounded-md border bg-background px-3 text-sm" required><option value="">Choose a student</option>{students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}</select></div><div className="space-y-2"><Label htmlFor="canteen-quantity">Quantity</Label><Input id="canteen-quantity" name="quantity" type="number" min="1" defaultValue="1" required /></div><div className="sm:col-span-3 flex items-center justify-between gap-3"><Message value={message} /><Button disabled={!menus.length || !students.length}>Record transaction</Button></div></form>;
}
