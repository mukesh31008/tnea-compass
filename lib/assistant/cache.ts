import "server-only";

import type { AssistantResult } from "@/lib/assistant/types";

/**
 * Short-lived answer cache. The dataset is static between seeds, so a repeated
 * deterministic question should not hit SQLite again. Only answers are cached;
 * refusals and clarifications are cheap and deliberately not stored.
 */

const TTL_MS = 5 * 60_000;
const MAX_ENTRIES = 200;

type Entry = {
  value: AssistantResult;
  expiresAt: number;
};

const cache = new Map<string, Entry>();

export function readAnswer(key: string): AssistantResult | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  // Refresh insertion order for a crude LRU.
  cache.delete(key);
  cache.set(key, entry);
  return entry.value;
}

export function writeAnswer(key: string, value: AssistantResult) {
  if (value.kind !== "answer") return;
  cache.set(key, { value, expiresAt: Date.now() + TTL_MS });
  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (!oldest) break;
    cache.delete(oldest);
  }
}
