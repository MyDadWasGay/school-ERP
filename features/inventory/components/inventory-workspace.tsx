"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { archiveSupplierAction, createInventoryItemAction, createSupplierAction, postStockMovementAction } from "../actions/inventory.actions";

type Item = { id: string; name: string; sku: string; quantity: number; reorderLevel: number };
type Supplier = { id: string; name: string; contactEmail: string | null; phone: string | null };

export function SupplierForm({ mode = "inventory" }: { mode?: "inventory" | "procurement" }) {
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const result = mode === "procurement"
      ? await (await import("@/features/procurement/actions/procurement.actions")).createVendorAction({ name: data.get("name"), contactEmail: data.get("contactEmail"), phone: data.get("phone") })
      : await createSupplierAction({ name: data.get("name"), contactEmail: data.get("contactEmail"), phone: data.get("phone") });
    setMessage(result.ok ? result.message ?? "Created." : result.error);
    if (result.ok) event.currentTarget.reset();
  }
  return <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3" noValidate><div className="space-y-2"><Label htmlFor={`supplier-name-${mode}`}>Supplier name</Label><Input id={`supplier-name-${mode}`} name="name" required /></div><div className="space-y-2"><Label htmlFor={`supplier-email-${mode}`}>Contact email</Label><Input id={`supplier-email-${mode}`} name="contactEmail" type="email" /></div><div className="space-y-2"><Label htmlFor={`supplier-phone-${mode}`}>Phone</Label><Input id={`supplier-phone-${mode}`} name="phone" /></div><div className="sm:col-span-3 flex items-center justify-between gap-3"><p role="status" className="text-sm text-muted-foreground">{message}</p><Button>Create supplier</Button></div></form>;
}

export function SupplierList({ suppliers: rows, mode = "inventory" }: { suppliers: Supplier[]; mode?: "inventory" | "procurement" }) {
  const [message, setMessage] = useState("");
  async function archive(id: string) {
    const result = await archiveSupplierAction({ id });
    setMessage(result.ok ? result.message ?? "Archived." : result.error);
    if (result.ok) window.location.reload();
  }
  if (!rows.length) return <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No active suppliers found.</p>;
  return <div className="space-y-3">{message ? <p role="status" className="text-sm text-muted-foreground">{message}</p> : null}{rows.map((supplier) => <div key={supplier.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"><div><p className="font-medium">{supplier.name}</p><p className="text-sm text-muted-foreground">{supplier.contactEmail ?? "No email"}{supplier.phone ? ` · ${supplier.phone}` : ""}</p></div>{mode === "inventory" ? <Button size="sm" variant="outline" onClick={() => archive(supplier.id)}>Archive</Button> : null}</div>)}</div>;
}

export function InventoryItemForm() {
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const result = await createInventoryItemAction({ name: data.get("name"), sku: data.get("sku"), reorderLevel: data.get("reorderLevel") });
    setMessage(result.ok ? result.message ?? "Created." : result.error);
    if (result.ok) event.currentTarget.reset();
  }
  return <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3" noValidate><div className="space-y-2"><Label htmlFor="inventory-name">Item name</Label><Input id="inventory-name" name="name" required /></div><div className="space-y-2"><Label htmlFor="inventory-sku">SKU</Label><Input id="inventory-sku" name="sku" required /></div><div className="space-y-2"><Label htmlFor="inventory-reorder">Reorder level</Label><Input id="inventory-reorder" name="reorderLevel" type="number" min="0" defaultValue="0" required /></div><div className="sm:col-span-3 flex items-center justify-between gap-3"><p role="status" className="text-sm text-muted-foreground">{message}</p><Button>Create item</Button></div></form>;
}

export function StockMovementForm({ items }: { items: Item[] }) {
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const result = await postStockMovementAction({ inventoryItemId: data.get("inventoryItemId"), quantity: data.get("quantity"), direction: data.get("direction"), reference: data.get("reference") });
    setMessage(result.ok ? result.message ?? "Posted." : result.error);
    if (result.ok) event.currentTarget.reset();
  }
  return <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" noValidate><div className="space-y-2"><Label htmlFor="stock-item">Item</Label><select id="stock-item" name="inventoryItemId" className="h-10 w-full rounded-md border bg-background px-3 text-sm" required><option value="">Choose an item</option>{items.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.quantity} available)</option>)}</select></div><div className="space-y-2"><Label htmlFor="stock-direction">Movement</Label><select id="stock-direction" name="direction" className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="in">Receipt / return in</option><option value="out">Issue / consume out</option></select></div><div className="space-y-2"><Label htmlFor="stock-quantity">Quantity</Label><Input id="stock-quantity" name="quantity" type="number" min="1" required /></div><div className="space-y-2"><Label htmlFor="stock-reference">Reference</Label><Input id="stock-reference" name="reference" placeholder="PO / issue reference" /></div><div className="sm:col-span-2 lg:col-span-4 flex items-center justify-between gap-3"><p role="status" className="text-sm text-muted-foreground">{message}</p><Button disabled={!items.length}>Post movement</Button></div></form>;
}
