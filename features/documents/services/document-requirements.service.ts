import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  documentTypes,
  studentDocuments,
  studentMedicalProfiles,
  students,
} from "@/db/schema";
import type { CurrentUser } from "@/lib/auth/types";
import { AppError } from "@/lib/errors/app-error";

export type DocumentTypeSeed = {
  code: string;
  name: string;
  description: string;
  category: "identity" | "academic" | "legal" | "financial" | "medical" | "photograph" | "address" | "consent" | "other";
  requirementType: "required" | "conditional" | "optional";
  appliesTo: "student" | "guardian" | "employee" | "all";
  conditionExpression?: string;
  allowedFileTypes: string;
  maxFileSizeBytes: number;
  requiresVerification: boolean;
  expiryEnabled: boolean;
  isSensitive: boolean;
  sortOrder: number;
};

export const DEFAULT_DOCUMENT_TYPES: DocumentTypeSeed[] = [
  {
    code: "birth_certificate",
    name: "Birth Certificate",
    description: "Official government birth certificate of the student.",
    category: "identity",
    requirementType: "required",
    appliesTo: "student",
    allowedFileTypes: "pdf,jpg,jpeg,png,webp",
    maxFileSizeBytes: 15_728_640,
    requiresVerification: true,
    expiryEnabled: false,
    isSensitive: true,
    sortOrder: 1,
  },
  {
    code: "aadhaar_card",
    name: "Aadhaar / Government ID",
    description: "Government issued identity proof / Aadhaar card.",
    category: "identity",
    requirementType: "required",
    appliesTo: "student",
    allowedFileTypes: "pdf,jpg,jpeg,png,webp",
    maxFileSizeBytes: 15_728_640,
    requiresVerification: true,
    expiryEnabled: true,
    isSensitive: true,
    sortOrder: 2,
  },
  {
    code: "previous_school_report_card",
    name: "Previous School Report Card",
    description: "Previous academic year marksheet or report card.",
    category: "academic",
    requirementType: "required",
    appliesTo: "student",
    allowedFileTypes: "pdf,jpg,jpeg,png,webp",
    maxFileSizeBytes: 15_728_640,
    requiresVerification: true,
    expiryEnabled: false,
    isSensitive: false,
    sortOrder: 3,
  },
  {
    code: "transfer_certificate",
    name: "Transfer Certificate",
    description: "Original transfer certificate from previous institution.",
    category: "legal",
    requirementType: "required",
    appliesTo: "student",
    allowedFileTypes: "pdf,jpg,jpeg,png,webp",
    maxFileSizeBytes: 15_728_640,
    requiresVerification: true,
    expiryEnabled: false,
    isSensitive: false,
    sortOrder: 4,
  },
  {
    code: "caste_certificate",
    name: "Caste Certificate",
    description: "Required when student category requires caste reservation documentation (SC/ST/OBC).",
    category: "legal",
    requirementType: "conditional",
    appliesTo: "student",
    conditionExpression: JSON.stringify({ field: "casteCategory", operator: "not_in", value: ["General", "general", "OPEN"] }),
    allowedFileTypes: "pdf,jpg,jpeg,png,webp",
    maxFileSizeBytes: 15_728_640,
    requiresVerification: true,
    expiryEnabled: false,
    isSensitive: true,
    sortOrder: 5,
  },
  {
    code: "disability_certificate",
    name: "Disability Certificate",
    description: "Required when student is marked as having a disability or chronic medical condition.",
    category: "medical",
    requirementType: "conditional",
    appliesTo: "student",
    conditionExpression: JSON.stringify({ field: "hasDisability", operator: "equals", value: true }),
    allowedFileTypes: "pdf,jpg,jpeg,png,webp",
    maxFileSizeBytes: 15_728_640,
    requiresVerification: true,
    expiryEnabled: true,
    isSensitive: true,
    sortOrder: 6,
  },
  {
    code: "passport_photo",
    name: "Passport Photo",
    description: "Recent passport-sized color photograph of the student.",
    category: "photograph",
    requirementType: "required",
    appliesTo: "student",
    allowedFileTypes: "jpg,jpeg,png,webp",
    maxFileSizeBytes: 5_242_880, // 5MB
    requiresVerification: true,
    expiryEnabled: false,
    isSensitive: false,
    sortOrder: 7,
  },
  {
    code: "parent_id",
    name: "Parent / Guardian ID",
    description: "Government photo ID of primary parent or legal guardian.",
    category: "identity",
    requirementType: "optional",
    appliesTo: "guardian",
    allowedFileTypes: "pdf,jpg,jpeg,png,webp",
    maxFileSizeBytes: 15_728_640,
    requiresVerification: true,
    expiryEnabled: true,
    isSensitive: true,
    sortOrder: 8,
  },
];

/**
 * Ensure default document types exist for the organization
 */
export async function ensureDefaultDocumentTypes(organizationId: string) {
  const existing = await getDb()
    .select()
    .from(documentTypes)
    .where(eq(documentTypes.organizationId, organizationId));

  if (existing.length === 0) {
    for (const dt of DEFAULT_DOCUMENT_TYPES) {
      await getDb()
        .insert(documentTypes)
        .values({
          organizationId,
          code: dt.code,
          name: dt.name,
          description: dt.description,
          category: dt.category,
          requirementType: dt.requirementType,
          appliesTo: dt.appliesTo,
          conditionExpression: dt.conditionExpression,
          allowedFileTypes: dt.allowedFileTypes,
          maxFileSizeBytes: dt.maxFileSizeBytes,
          requiresVerification: dt.requiresVerification,
          expiryEnabled: dt.expiryEnabled,
          isSensitive: dt.isSensitive,
          sortOrder: dt.sortOrder,
          status: "active",
        });
    }
  }
}

/**
 * List all active document types for an organization
 */
export async function listDocumentTypes(user: CurrentUser) {
  await ensureDefaultDocumentTypes(user.organizationId);
  return getDb()
    .select()
    .from(documentTypes)
    .where(
      and(
        eq(documentTypes.organizationId, user.organizationId),
        eq(documentTypes.status, "active"),
      ),
    )
    .orderBy(documentTypes.sortOrder, documentTypes.name);
}

export type RequirementEvaluation = {
  documentType: typeof documentTypes.$inferSelect;
  isApplicable: boolean;
  requirementType: "required" | "conditional" | "optional";
  conditionMetReason?: string;
};

/**
 * Evaluate if a document requirement applies to a specific student
 */
export function evaluateRequirementForStudent(
  docType: typeof documentTypes.$inferSelect,
  student: typeof students.$inferSelect,
  medicalProfile: typeof studentMedicalProfiles.$inferSelect | null,
): RequirementEvaluation {
  if (docType.requirementType === "required") {
    return {
      documentType: docType,
      isApplicable: true,
      requirementType: "required",
    };
  }

  if (docType.requirementType === "optional") {
    return {
      documentType: docType,
      isApplicable: false,
      requirementType: "optional",
    };
  }

  // Conditional evaluation
  if (docType.code === "caste_certificate") {
    // Check caste / address / blood group fields or other student details
    const casteNotes = student.addressJson || "";
    const isCasteApplicable = casteNotes.toLowerCase().includes("caste") || casteNotes.toLowerCase().includes("category");
    return {
      documentType: docType,
      isApplicable: isCasteApplicable,
      requirementType: "conditional",
      conditionMetReason: isCasteApplicable
        ? "Caste category documentation required."
        : "Not required for General category.",
    };
  }

  if (docType.code === "disability_certificate") {
    const hasCondition = Boolean(
      medicalProfile &&
        (medicalProfile.conditions || medicalProfile.allergies || medicalProfile.medications),
    );
    return {
      documentType: docType,
      isApplicable: hasCondition,
      requirementType: "conditional",
      conditionMetReason: hasCondition
        ? "Medical condition or disability profile flagged."
        : "Not required as no disability is flagged.",
    };
  }

  // Fallback for custom conditional expression
  if (docType.conditionExpression) {
    try {
      const expr = JSON.parse(docType.conditionExpression);
      if (expr.field === "hasDisability") {
        const met = Boolean(medicalProfile?.conditions);
        return {
          documentType: docType,
          isApplicable: met,
          requirementType: "conditional",
          conditionMetReason: met ? "Condition met" : "Condition not met",
        };
      }
    } catch {
      // Ignored
    }
  }

  return {
    documentType: docType,
    isApplicable: false,
    requirementType: "conditional",
    conditionMetReason: "Condition not active",
  };
}

export type DocumentCompletionSummary = {
  totalRequired: number;
  completedRequired: number;
  completionPercentage: number;
  isComplete: boolean;
  missingDocuments: Array<{
    documentTypeId: string;
    code: string;
    name: string;
    category: string;
    requirementType: string;
  }>;
  pendingVerification: Array<{
    documentId: string;
    documentTypeId: string;
    name: string;
    status: string;
  }>;
  expiredDocuments: Array<{
    documentId: string;
    documentTypeId: string;
    name: string;
    expiresAt: string;
  }>;
  warnings: string[];
  requirements: Array<{
    documentTypeId: string;
    code: string;
    name: string;
    category: string;
    requirementType: "required" | "conditional" | "optional";
    isApplicable: boolean;
    conditionMetReason?: string;
    status: string;
    documentId?: string;
  }>;
};

/**
 * Calculate centralized document completion for a student
 */
export async function calculateStudentDocumentSummary(
  user: CurrentUser,
  studentId: string,
): Promise<DocumentCompletionSummary> {
  const [student, medicalProfile, allTypes, studentDocs] = await Promise.all([
    getDb().query.students.findFirst({
      where: and(
        eq(students.id, studentId),
        eq(students.organizationId, user.organizationId),
      ),
    }),
    getDb().query.studentMedicalProfiles.findFirst({
      where: and(
        eq(studentMedicalProfiles.studentId, studentId),
        eq(studentMedicalProfiles.organizationId, user.organizationId),
      ),
    }),
    listDocumentTypes(user),
    getDb()
      .select()
      .from(studentDocuments)
      .where(
        and(
          eq(studentDocuments.studentId, studentId),
          eq(studentDocuments.organizationId, user.organizationId),
        ),
      ),
  ]);

  if (!student) throw new AppError("NOT_FOUND", "Student not found.", 404);

  const activeDocs = studentDocs.filter((d) => d.status !== "deleted" && d.deletedAt === null);
  const docByTypeId = new Map<string, typeof studentDocuments.$inferSelect>();
  for (const doc of activeDocs) {
    docByTypeId.set(doc.documentTypeId, doc);
  }

  let totalRequired = 0;
  let completedRequired = 0;
  const missingDocuments: DocumentCompletionSummary["missingDocuments"] = [];
  const pendingVerification: DocumentCompletionSummary["pendingVerification"] = [];
  const expiredDocuments: DocumentCompletionSummary["expiredDocuments"] = [];
  const warnings: string[] = [];
  const requirements: DocumentCompletionSummary["requirements"] = [];

  const now = new Date();

  for (const docType of allTypes) {
    const evalResult = evaluateRequirementForStudent(docType, student, medicalProfile ?? null);
    const existingDoc = docByTypeId.get(docType.id);

    const isExpiring = existingDoc?.expiresAt
      ? new Date(existingDoc.expiresAt) <= now
      : false;

    const isExpiringSoon = existingDoc?.expiresAt
      ? new Date(existingDoc.expiresAt).getTime() - now.getTime() < 30 * 86400 * 1000 && !isExpiring
      : false;

    let docStatus = "missing";
    if (existingDoc) {
      if (isExpiring) {
        docStatus = "expired";
      } else if (existingDoc.verificationStatus === "verified") {
        docStatus = "verified";
      } else if (existingDoc.verificationStatus === "rejected") {
        docStatus = "rejected";
      } else {
        docStatus = "pending_verification";
      }
    }

    requirements.push({
      documentTypeId: docType.id,
      code: docType.code,
      name: docType.name,
      category: docType.category,
      requirementType: evalResult.requirementType,
      isApplicable: evalResult.isApplicable,
      conditionMetReason: evalResult.conditionMetReason,
      status: docStatus,
      documentId: existingDoc?.id,
    });

    const countsTowardsCompletion =
      evalResult.requirementType === "required" ||
      (evalResult.requirementType === "conditional" && evalResult.isApplicable);

    if (countsTowardsCompletion) {
      totalRequired += 1;
      if (existingDoc && !isExpiring) {
        if (!docType.requiresVerification || existingDoc.verificationStatus === "verified") {
          completedRequired += 1;
        }
      }
    }

    if (countsTowardsCompletion && !existingDoc) {
      missingDocuments.push({
        documentTypeId: docType.id,
        code: docType.code,
        name: docType.name,
        category: docType.category,
        requirementType: evalResult.requirementType,
      });
      warnings.push(`⚠ ${docType.name} is missing`);
    }

    if (existingDoc) {
      if (existingDoc.verificationStatus === "pending") {
        pendingVerification.push({
          documentId: existingDoc.id,
          documentTypeId: docType.id,
          name: docType.name,
          status: existingDoc.status,
        });
        warnings.push(`⚠ ${docType.name} verification is pending`);
      }
      if (isExpiring) {
        expiredDocuments.push({
          documentId: existingDoc.id,
          documentTypeId: docType.id,
          name: docType.name,
          expiresAt: existingDoc.expiresAt ? new Date(existingDoc.expiresAt).toISOString() : "",
        });
        warnings.push(`⚠ ${docType.name} has expired`);
      } else if (isExpiringSoon && existingDoc.expiresAt) {
        const daysLeft = Math.ceil(
          (new Date(existingDoc.expiresAt).getTime() - now.getTime()) / (86400 * 1000),
        );
        warnings.push(`⚠ ${docType.name} expires in ${daysLeft} days`);
      }
    }
  }

  const completionPercentage =
    totalRequired > 0
      ? Math.round((completedRequired / totalRequired) * 10000) / 100
      : 100;

  return {
    totalRequired,
    completedRequired,
    completionPercentage,
    isComplete: totalRequired > 0 && completedRequired === totalRequired,
    missingDocuments,
    pendingVerification,
    expiredDocuments,
    warnings,
    requirements,
  };
}
