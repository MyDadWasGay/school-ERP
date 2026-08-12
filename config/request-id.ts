const requestIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;

/** Correlation IDs must be bounded and safe to reflect in response headers. */
export function isSafeRequestId(value: unknown): value is string {
  return typeof value === "string" && requestIdPattern.test(value);
}
