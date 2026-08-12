import { Badge } from "@/components/ui/badge";
import { statusLabelFor, statusVariantFor } from "@/config/status-registry";
export function StatusBadge({ status }: { status: string }) { return <Badge variant={statusVariantFor(status)}>{statusLabelFor(status)}</Badge>; }
