import type { JsonObject } from "@teachable/admin-openapi-parser";

export type ResponseFamily = "success" | "error";

export interface ClassifiedResponse {
  readonly code: number;
  readonly family: ResponseFamily;
  /** When true, contract matches 204 / empty `content` (no JSON body). */
  readonly noBody: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function parseStatusCodeKey(key: string): number | undefined {
  if (key === "default") {
    return undefined;
  }
  const n = Number.parseInt(key, 10);
  return Number.isFinite(n) ? n : undefined;
}

export function inferResponseFamily(statusKey: string, numeric: number | undefined): ResponseFamily {
  if (statusKey === "default") {
    return "error";
  }
  if (numeric === undefined) {
    return "error";
  }
  if (numeric >= 200 && numeric < 300) {
    return "success";
  }
  return "error";
}

/**
 * OpenAPI: missing or empty `content` means no response body (includes typical 204 blocks).
 */
export function responseHasNoBody(response: JsonObject): boolean {
  const content = response["content"];
  if (content === undefined) {
    return true;
  }
  if (!isRecord(content)) {
    return true;
  }
  return Object.keys(content).length === 0;
}

/** Exported for deterministic ordering + unit tests (OpenAPI response map keys). */
export function compareResponseStatusKeys(a: string, b: string): number {
  const na = parseStatusCodeKey(a);
  const nb = parseStatusCodeKey(b);
  if (na !== undefined && nb !== undefined && na !== nb) {
    return na - nb;
  }
  if (na !== undefined && nb === undefined) {
    return -1;
  }
  if (na === undefined && nb !== undefined) {
    return 1;
  }
  return a.localeCompare(b);
}

/**
 * Deterministic classification of declared responses for Zod + execute branching.
 */
export function classifyResponses(responses: JsonObject): readonly ClassifiedResponse[] {
  const keys = Object.keys(responses).sort(compareResponseStatusKeys);

  const byCode = new Map<number, ClassifiedResponse>();

  for (const key of keys) {
    const raw = responses[key];
    if (!isRecord(raw)) {
      continue;
    }
    const response = raw as JsonObject;
    const numeric = parseStatusCodeKey(key);
    const family = inferResponseFamily(key, numeric);
    const noBody = responseHasNoBody(response);

    if (numeric !== undefined) {
      byCode.set(numeric, { code: numeric, family, noBody });
    }
  }

  return [...byCode.values()].sort((a, b) => a.code - b.code);
}
