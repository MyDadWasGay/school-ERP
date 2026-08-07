import { randomUUID } from "node:crypto";

export function createId(prefix?: string) {
  const id = randomUUID();
  return prefix ? `${prefix}_${id}` : id;
}

export function now() {
  return new Date();
}
