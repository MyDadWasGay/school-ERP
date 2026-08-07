"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createMessageAction, markNotificationReadAction, publishMessageAction } from "../actions/communication.actions";

function Message({ value }: { value: string }) { return value ? <p role="status" className="text-sm text-muted-foreground">{value}</p> : null; }

export function MessageForm() {
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const result = await createMessageAction({ subject: data.get("subject"), body: data.get("body"), audienceType: data.get("audienceType"), audienceRole: data.get("audienceRole") });
    setMessage(result.ok ? result.message ?? "Draft saved." : result.error);
    if (result.ok) event.currentTarget.reset();
  }
  return <form onSubmit={submit} className="grid gap-4" noValidate><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="message-subject">Subject</Label><Input id="message-subject" name="subject" required /></div><div className="space-y-2"><Label htmlFor="message-audience">Audience</Label><select id="message-audience" name="audienceType" className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="all">All active users in this campus</option><option value="role">One role in this campus</option></select></div></div><div className="space-y-2"><Label htmlFor="message-role">Role (only for role audience)</Label><select id="message-role" name="audienceRole" className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Choose role</option><option value="teacher">Teacher</option><option value="parent">Parent</option><option value="student">Student</option><option value="office_staff">Office staff</option><option value="management">Management</option></select></div><div className="space-y-2"><Label htmlFor="message-body">Message</Label><Textarea id="message-body" name="body" required /></div><div className="flex items-center justify-between gap-3"><Message value={message} /><Button>Save draft</Button></div></form>;
}

export function PublishMessageButton({ messageId }: { messageId: string }) {
  const [message, setMessage] = useState("");
  async function publish() {
    const result = await publishMessageAction({ messageId });
    setMessage(result.ok ? result.message ?? "Published." : result.error);
    if (result.ok) window.location.reload();
  }
  return <div className="flex items-center gap-2"><Button size="sm" onClick={publish}>Publish in-app</Button><Message value={message} /></div>;
}

export function MarkNotificationReadButton({ notificationId }: { notificationId: string }) {
  const [message, setMessage] = useState("");
  async function markRead() {
    const result = await markNotificationReadAction({ notificationId });
    setMessage(result.ok ? "Read" : result.error);
    if (result.ok) window.location.reload();
  }
  return <div className="flex items-center gap-2"><Button size="sm" variant="outline" onClick={markRead}>Mark read</Button><Message value={message} /></div>;
}
