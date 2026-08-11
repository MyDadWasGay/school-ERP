function collectErrorMessages(error: unknown, depth = 0): string[] {
  if (depth > 4 || error === null || error === undefined) return [];
  if (typeof error === "string") return [error];
  if (!(error instanceof Error)) return [];
  const cause =
    "cause" in error ? (error as Error & { cause?: unknown }).cause : undefined;
  return [error.message, ...collectErrorMessages(cause, depth + 1)];
}

/** Match only known database invariant messages; never return raw SQL errors to a client. */
export function databaseErrorIncludes(error: unknown, ...markers: string[]) {
  const message = collectErrorMessages(error).join(" ").toLowerCase();
  return markers.some((marker) => message.includes(marker.toLowerCase()));
}
