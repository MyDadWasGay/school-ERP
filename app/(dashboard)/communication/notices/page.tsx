import { PageHeader } from "@/components/common/page-header";
import { NoticeWorkspace } from "@/features/communication/components/notice-workspace";
import { listNotices } from "@/lib/api-client/server-queries";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";
export default async function NoticesPage() { const user = await requirePermission("communication:read"); const rows = await listNotices(user); return <div className="space-y-6"><PageHeader title="Notices" description="Draft, publish and archive campus-scoped notices with an auditable audience." /><NoticeWorkspace rows={rows} canCreate={hasPermission(user, "communication:create")} canUpdate={hasPermission(user, "communication:update")} /></div>; }
