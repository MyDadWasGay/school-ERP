import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listNotificationDelivery } from "@/lib/api-client/server-queries";
import { requirePermission } from "@/lib/auth/guards";
import { formatIndiaDateTime } from "@/lib/utils/india-time";

export default async function CommunicationLogsPage() {
  const user = await requirePermission("communication:read");
  const logs = await listNotificationDelivery(user);
  return <div className="space-y-6"><PageHeader title="Delivery logs" description="In-app delivery records retain recipient, channel, status and message provenance." /><Card><CardHeader><CardTitle>Notification events</CardTitle></CardHeader><CardContent>{logs.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-3">Subject</th><th className="p-3">Recipient</th><th className="p-3">Channel</th><th className="p-3">Status</th><th className="p-3">Sent</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id} className="border-b last:border-0"><td className="p-3">{log.subject ?? "—"}</td><td className="p-3">{log.recipientEmail ?? log.recipientUserId ?? "—"}</td><td className="p-3">{log.channel}</td><td className="p-3">{log.status}</td><td className="p-3">{log.sentAt ? formatIndiaDateTime(log.sentAt) : "—"}</td></tr>)}</tbody></table></div> : <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No delivery events found.</p>}</CardContent></Card></div>;
}
