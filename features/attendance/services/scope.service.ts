import type { CurrentUser } from "@/lib/auth/types";
export function isValidAttendanceScope(user: CurrentUser, organizationId: string, campusId?: string) { return user.organizationId === organizationId && (!user.campusId || !campusId || user.campusId === campusId); }
