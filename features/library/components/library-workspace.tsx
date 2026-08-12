"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { addLibraryCopyAction, createLibraryItemAction, issueLibraryCopyAction, createDigitalResourceAction, reserveLibraryItemAction, renewLibraryCopyAction, returnLibraryCopyAction } from "../actions/library.actions";

type LibraryItem = { id: string; title: string; author: string | null; isbn: string | null; totalCopies: number; availableCopies: number };
type LibraryCopy = { id: string; accessionNumber: string; title: string; itemId: string; status: string };
type Borrowers = { students: Array<{ id: string; name: string }>; users: Array<{ id: string; name: string }> };
type ActiveIssue = { id: string; borrowerType: string; borrowerId: string | null; issuedAt: string; dueAt: string | null; renewalCount: number; accessionNumber: string; title: string };

function ActionMessage({ message }: { message: string }) {
  return message ? <p className="mt-3 text-sm text-muted-foreground" role="status">{message}</p> : null;
}

export function LibraryItemForm() {
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const result = await createLibraryItemAction({ title: data.get("title"), author: data.get("author"), isbn: data.get("isbn") });
    setMessage(result.ok ? result.message ?? "Created." : result.error);
    if (result.ok) event.currentTarget.reset();
  }
  return <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3" noValidate><div className="space-y-2"><Label htmlFor="library-title">Title</Label><Input id="library-title" name="title" required /></div><div className="space-y-2"><Label htmlFor="library-author">Author</Label><Input id="library-author" name="author" /></div><div className="space-y-2"><Label htmlFor="library-isbn">ISBN</Label><Input id="library-isbn" name="isbn" /></div><div className="sm:col-span-3 flex items-center justify-between gap-3"><ActionMessage message={message} /><Button>Create catalogue item</Button></div></form>;
}

export function LibraryCopyForm({ items }: { items: LibraryItem[] }) {
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const result = await addLibraryCopyAction({ itemId: data.get("itemId"), accessionNumber: data.get("accessionNumber") });
    setMessage(result.ok ? result.message ?? "Created." : result.error);
    if (result.ok) event.currentTarget.reset();
  }
  return <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate><div className="space-y-2"><Label htmlFor="library-copy-item">Catalogue item</Label><select id="library-copy-item" name="itemId" className="h-10 w-full rounded-md border bg-background px-3 text-sm" required><option value="">Choose an item</option>{items.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></div><div className="space-y-2"><Label htmlFor="library-accession">Accession number</Label><Input id="library-accession" name="accessionNumber" required /></div><div className="sm:col-span-2 flex items-center justify-between gap-3"><ActionMessage message={message} /><Button disabled={!items.length}>Add physical copy</Button></div></form>;
}

export function IssueLibraryForm({ copies, borrowers }: { copies: LibraryCopy[]; borrowers: Borrowers }) {
  const [borrowerType, setBorrowerType] = useState<"student" | "user">("student");
  const [message, setMessage] = useState("");
  const defaultDueDate = useMemo(() => { const date = new Date(); date.setDate(date.getDate() + 14); return date.toISOString().slice(0, 10); }, []);
  const options = borrowerType === "student" ? borrowers.students : borrowers.users;
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const result = await issueLibraryCopyAction({ copyId: data.get("copyId"), borrowerType, borrowerId: data.get("borrowerId"), dueAt: data.get("dueAt") });
    setMessage(result.ok ? result.message ?? "Issued." : result.error);
    if (result.ok) event.currentTarget.reset();
  }
  return <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" noValidate><div className="space-y-2"><Label htmlFor="library-issue-copy">Available copy</Label><select id="library-issue-copy" name="copyId" className="h-10 w-full rounded-md border bg-background px-3 text-sm" required><option value="">Choose a copy</option>{copies.map((copy) => <option key={copy.id} value={copy.id}>{copy.title} · {copy.accessionNumber}</option>)}</select></div><div className="space-y-2"><Label htmlFor="library-borrower-type">Borrower type</Label><select id="library-borrower-type" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={borrowerType} onChange={(event) => setBorrowerType(event.target.value as "student" | "user")}><option value="student">Student</option><option value="user">Staff/user</option></select></div><div className="space-y-2"><Label htmlFor="library-borrower">Borrower</Label><select id="library-borrower" name="borrowerId" className="h-10 w-full rounded-md border bg-background px-3 text-sm" required><option value="">Choose a borrower</option>{options.map((borrower) => <option key={borrower.id} value={borrower.id}>{borrower.name}</option>)}</select></div><div className="space-y-2"><Label htmlFor="library-due-date">Due date</Label><Input id="library-due-date" name="dueAt" type="date" defaultValue={defaultDueDate} required /></div><div className="sm:col-span-2 lg:col-span-4 flex items-center justify-between gap-3"><ActionMessage message={message} /><Button disabled={!copies.length || !options.length}>Issue copy</Button></div></form>;
}

export function ActiveLibraryIssues({ issues, canUpdate }: { issues: ActiveIssue[]; canUpdate: boolean }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Record<string, string>>({});
  async function closeIssue(issue: ActiveIssue, outcome: "returned" | "lost" | "damaged", throwOnError = false) {
    const result = await returnLibraryCopyAction({ transactionId: issue.id, outcome, dailyFineMinor: 100 });
    setMessages((current) => ({ ...current, [issue.id]: result.ok ? result.message ?? "Updated." : result.error }));
    if (!result.ok && throwOnError) throw new Error(result.error);
    if (result.ok) router.refresh();
  }
  async function renew(issue: ActiveIssue) {
    const result = await renewLibraryCopyAction({ transactionId: issue.id, extensionDays: 14 });
    setMessages((current) => ({ ...current, [issue.id]: result.ok ? result.message ?? "Renewed." : result.error }));
    if (result.ok) router.refresh();
  }
  if (!issues.length) return <EmptyState title="No active library issues" description="Issued copies will appear here until they are returned or otherwise closed." />;
  return <div className="space-y-3">{issues.map((issue) => <div key={issue.id} className="rounded-lg border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-medium">{issue.title} · {issue.accessionNumber}</p><p className="text-sm text-muted-foreground">{issue.borrowerType}: {issue.borrowerId ?? "unknown"} · Due {issue.dueAt ? new Date(issue.dueAt).toLocaleDateString() : "not set"}</p></div><Badge variant={issue.renewalCount >= 2 ? "warning" : "secondary"}>{issue.renewalCount}/2 renewals</Badge></div>{messages[issue.id] ? <p className="mt-2 text-sm text-muted-foreground" role="status">{messages[issue.id]}</p> : null}{canUpdate ? <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" onClick={() => closeIssue(issue, "returned")}>Return</Button><Button size="sm" variant="outline" onClick={() => renew(issue)} disabled={issue.renewalCount >= 2}>Renew</Button><ConfirmDialog label="Mark damaged" title={`Mark ${issue.title} as damaged?`} description="The copy will be closed with a damaged outcome and may require replacement or fine follow-up." triggerVariant="outline" onConfirm={() => closeIssue(issue, "damaged", true)} /><ConfirmDialog label="Mark lost" title={`Mark ${issue.title} as lost?`} description="The copy will be closed as lost and may require replacement or fine follow-up." triggerVariant="outline" onConfirm={() => closeIssue(issue, "lost", true)} /></div> : null}</div>)}</div>;
}

export function LibraryReservationForm({ items }: { items: LibraryItem[] }) {
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const result = await reserveLibraryItemAction({ itemId: data.get("itemId") });
    setMessage(result.ok ? result.message ?? "Reserved." : result.error);
    if (result.ok) event.currentTarget.reset();
  }
  return <form onSubmit={submit} className="flex flex-wrap items-end gap-4" noValidate><div className="min-w-72 space-y-2"><Label htmlFor="library-reservation-item">Catalogue item</Label><select id="library-reservation-item" name="itemId" className="h-10 w-full rounded-md border bg-background px-3 text-sm" required><option value="">Choose an item</option>{items.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></div><Button disabled={!items.length}>Reserve item</Button><ActionMessage message={message} /></form>;
}

export function DigitalResourceForm() {
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const result = await createDigitalResourceAction({ name: data.get("name"), url: data.get("url"), description: data.get("description") });
    setMessage(result.ok ? result.message ?? "Created." : result.error);
    if (result.ok) event.currentTarget.reset();
  }
  return <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3" noValidate><div className="space-y-2"><Label htmlFor="digital-resource-name">Name</Label><Input id="digital-resource-name" name="name" required /></div><div className="space-y-2"><Label htmlFor="digital-resource-url">URL</Label><Input id="digital-resource-url" name="url" type="url" required /></div><div className="space-y-2"><Label htmlFor="digital-resource-description">Description</Label><Input id="digital-resource-description" name="description" /></div><div className="sm:col-span-3 flex items-center justify-between gap-3"><ActionMessage message={message} /><Button>Create resource</Button></div></form>;
}
