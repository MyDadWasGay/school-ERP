"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPurchaseOrderAction, createRequisitionAction, postGoodsReceiptAction, transitionPurchaseOrderAction, transitionRequisitionAction } from "../actions/procurement.actions";

function Message({ value }: { value: string }) { return value ? <p role="status" className="text-sm text-muted-foreground">{value}</p> : null; }

export function RequisitionForm() {
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const result = await createRequisitionAction({ name: data.get("name"), quantity: data.get("quantity"), estimatedMinor: data.get("estimatedMinor") }); setMessage(result.ok ? result.message ?? "Created." : result.error); if (result.ok) event.currentTarget.reset(); }
  return <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3" noValidate><div className="space-y-2"><Label htmlFor="requisition-name">Requested item/service</Label><Input id="requisition-name" name="name" required /></div><div className="space-y-2"><Label htmlFor="requisition-quantity">Quantity</Label><Input id="requisition-quantity" name="quantity" type="number" min="1" required /></div><div className="space-y-2"><Label htmlFor="requisition-estimated">Estimated amount (minor units)</Label><Input id="requisition-estimated" name="estimatedMinor" type="number" min="0" required /></div><div className="sm:col-span-3 flex items-center justify-between gap-3"><Message value={message} /><Button>Create requisition</Button></div></form>;
}

export function PurchaseOrderForm({ requisitions }: { requisitions: Array<{ id: string; name: string; code: string | null }> }) {
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const result = await createPurchaseOrderAction({ requisitionId: data.get("requisitionId"), supplierName: data.get("supplierName"), amountMinor: data.get("amountMinor") }); setMessage(result.ok ? result.message ?? "Created." : result.error); if (result.ok) event.currentTarget.reset(); }
  return <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3" noValidate><div className="space-y-2"><Label htmlFor="po-requisition">Approved requisition</Label><select id="po-requisition" name="requisitionId" className="h-10 w-full rounded-md border bg-background px-3 text-sm" required><option value="">Choose a requisition</option>{requisitions.map((requisition) => <option key={requisition.id} value={requisition.id}>{requisition.code ?? requisition.id} · {requisition.name}</option>)}</select></div><div className="space-y-2"><Label htmlFor="po-supplier">Supplier</Label><Input id="po-supplier" name="supplierName" required /></div><div className="space-y-2"><Label htmlFor="po-amount">Order amount (minor units)</Label><Input id="po-amount" name="amountMinor" type="number" min="0" required /></div><div className="sm:col-span-3 flex items-center justify-between gap-3"><Message value={message} /><Button disabled={!requisitions.length}>Create purchase order</Button></div></form>;
}

export function ProcurementTransitionButton({ kind, id, toStatus }: { kind: "requisition" | "order"; id: string; toStatus: string }) {
  const [message, setMessage] = useState("");
  async function transition() {
    const result = kind === "requisition" ? await transitionRequisitionAction({ id, toStatus }) : await transitionPurchaseOrderAction({ id, toStatus });
    setMessage(result.ok ? result.message ?? "Updated." : result.error);
    if (result.ok) window.location.reload();
  }
  return <div className="flex items-center gap-2"><Button size="sm" variant="outline" onClick={transition}>{toStatus.replaceAll("_", " ")}</Button><Message value={message} /></div>;
}

type GoodsReceiptOrder = { id: string; name: string; code: string | null };
type GoodsReceiptItem = { id: string; name: string; sku: string; quantity: number };

export function GoodsReceiptForm({ orders, items }: { orders: GoodsReceiptOrder[]; items: GoodsReceiptItem[] }) {
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const result = await postGoodsReceiptAction({
      purchaseOrderId: data.get("purchaseOrderId"),
      inventoryItemId: data.get("inventoryItemId"),
      quantity: data.get("quantity"),
    });
    setMessage(result.ok ? result.message ?? "Goods received." : result.error);
    if (result.ok) event.currentTarget.reset();
  }
  return <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3" noValidate>
    <div className="space-y-2"><Label htmlFor="goods-receipt-order">Purchase order</Label><select id="goods-receipt-order" name="purchaseOrderId" className="h-10 w-full rounded-md border bg-background px-3 text-sm" required><option value="">Choose an ordered purchase order</option>{orders.map((order) => <option key={order.id} value={order.id}>{order.code ?? order.id} · {order.name}</option>)}</select></div>
    <div className="space-y-2"><Label htmlFor="goods-receipt-item">Inventory item</Label><select id="goods-receipt-item" name="inventoryItemId" className="h-10 w-full rounded-md border bg-background px-3 text-sm" required><option value="">Choose an item</option>{items.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.sku}, {item.quantity} in stock)</option>)}</select></div>
    <div className="space-y-2"><Label htmlFor="goods-receipt-quantity">Quantity received</Label><Input id="goods-receipt-quantity" name="quantity" type="number" min="1" required /></div>
    <div className="sm:col-span-3 flex items-center justify-between gap-3"><Message value={message} /><Button disabled={!orders.length || !items.length}>Post goods receipt</Button></div>
  </form>;
}
