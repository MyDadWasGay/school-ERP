import type { RoleKey } from "@/config/constants";

export type CurrentUser = {
  id: string;
  firebaseUid: string;
  email: string;
  displayName: string;
  role: RoleKey;
  organizationId: string;
  organizationName?: string;
  campusId?: string;
  campusName?: string;
  campusIds?: string[];
  availableCampuses?: Array<{ id: string; name: string }>;
  classSectionScopes?: Array<{ classId: string; sectionId?: string }>;
  linkedStudentId?: string;
  linkedEmployeeId?: string;
  linkedGuardianId?: string;
  emailVerified?: boolean;
  permissions: string[];
};
