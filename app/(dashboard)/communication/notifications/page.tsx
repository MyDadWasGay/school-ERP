import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MarkNotificationReadButton } from "@/features/communication/components/communication-workspace";
import { listNotifications } from "@/features/communication/services/communication.service";
import { requirePermission } from "@/lib/auth/guards";

export default async function CommunicationNotificationsPage() {
  const user = await requirePermission("communication:read");
  const notifications = await listNotifications(user);
  return <div className="space-y-6"><PageHeader title="Notifications" description="Your scoped in-app notices and read state." /><Card><CardHeader><CardTitle>Inbox</CardTitle></CardHeader><CardContent>{notifications.length ? <div className="space-y-3">{notifications.map((notification) => <div key={notification.id} className="flex flex-wrap items-start justify-between gap-4 rounded-lg border p-4"><div><p className="font-medium">{notification.subject}</p><p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{notification.body}</p><p className="mt-2 text-xs text-muted-foreground">{notification.sentAt?.toLocaleString() ?? "—"}</p></div>{notification.readAt ? <span className="text-xs text-muted-foreground">Read</span> : <MarkNotificationReadButton notificationId={notification.id} />}</div>)}</div> : <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No notifications found.</p>}</CardContent></Card></div>;
}
