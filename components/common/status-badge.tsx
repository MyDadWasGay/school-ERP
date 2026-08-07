import { Badge } from "@/components/ui/badge";
export function StatusBadge({ status }: { status: string }) { const normalized = status.toLowerCase(); return <Badge variant={normalized === "active" || normalized === "published" || normalized === "paid" ? "success" : normalized === "pending" || normalized === "draft" ? "warning" : "secondary"}>{status}</Badge>; }
