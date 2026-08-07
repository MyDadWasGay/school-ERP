import { PortalDashboard } from "@/features/portals/components/portal-dashboard";
import { requirePermission } from "@/lib/auth/guards";
export default async function ParentPortalPage() { const user = await requirePermission("portals:read"); return <PortalDashboard user={user} portal="parent" />; }
