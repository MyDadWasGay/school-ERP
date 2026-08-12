import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageForm, PublishMessageButton } from "@/features/communication/components/communication-workspace";
import { listMessages } from "@/lib/api-client/server-queries";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";

export default async function CommunicationMessagesPage() {
  const user = await requirePermission("communication:read");
  const messages = await listMessages(user);
  return <div className="space-y-6"><PageHeader title="Messages" description="Save an audited draft, then publish durable in-app notifications to the selected campus audience." />{hasPermission(user, "communication:create") ? <Card><CardHeader><CardTitle>New message</CardTitle></CardHeader><CardContent><MessageForm /></CardContent></Card> : null}<Card><CardHeader><CardTitle>Message history</CardTitle></CardHeader><CardContent>{messages.length ? <div className="space-y-3">{messages.map((message) => <div key={message.id} className="flex flex-wrap items-start justify-between gap-4 rounded-lg border p-4"><div><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{message.subject}</p><StatusBadge status={message.status} /></div><p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{message.body}</p><p className="mt-2 text-xs text-muted-foreground">Audience: {message.audience.type === "role" ? message.audience.role : "all active campus users"}</p></div>{hasPermission(user, "communication:update") && message.status === "draft" ? <PublishMessageButton messageId={message.id} /> : null}</div>)}</div> : <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No messages found.</p>}</CardContent></Card></div>;
}
