export type AppErrorCode = "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION_ERROR" | "TENANT_SCOPE_ERROR" | "DUPLICATE_RECORD" | "CONFLICT" | "RATE_LIMITED" | "INTEGRATION_ERROR" | "DATABASE_ERROR" | "CONFIGURATION_ERROR";

export class AppError extends Error {
  constructor(public readonly code: AppErrorCode, message: string, public readonly status = 400, public readonly details?: unknown) {
    super(message);
    this.name = "AppError";
  }
}
