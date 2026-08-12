import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";
import { headers } from "next/headers";

type RequestMemoStore = {
  requestId: string;
  values: Map<string, Promise<unknown>>;
};

const requestMemoStorage = new AsyncLocalStorage<RequestMemoStore>();

/**
 * Memoize async work for the current server request only. The store is never
 * shared between requests, which keeps session, tenant, and campus data out of
 * a process-wide cache while still collapsing duplicate render work.
 */
export function memoizeRequest<T>(
  key: string,
  loader: () => Promise<T>,
): Promise<T> {
  let requestId: string | undefined;
  try {
    requestId = headers().get("x-request-id") ?? undefined;
  } catch {
    // A request ID is unavailable outside a Next server render. Do not keep
    // sensitive data in a process-wide fallback cache in that case.
    return loader();
  }
  if (!requestId) return loader();

  let store = requestMemoStorage.getStore();
  if (!store || store.requestId !== requestId) {
    store = { requestId, values: new Map() };
    requestMemoStorage.enterWith(store);
  }

  const existing = store.values.get(key);
  if (existing) return existing as Promise<T>;

  const promise = loader();
  store.values.set(key, promise);
  void promise.catch(() => {
    if (store?.values.get(key) === promise) store.values.delete(key);
  });
  return promise;
}

/**
 * Clear request-local values after a mutation. This does not create a global
 * cache and is intentionally a no-op outside a Next server request.
 */
export function invalidateRequestMemo(...keys: string[]) {
  const store = requestMemoStorage.getStore();
  if (!store) return;
  if (keys.length === 0) {
    store.values.clear();
    return;
  }
  for (const key of keys) store.values.delete(key);
}
