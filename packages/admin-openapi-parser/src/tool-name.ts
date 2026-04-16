import type { HttpMethod } from "./http-methods.js";

/**
 * Human- and codegen-facing documentation when `operationId` is absent.
 * Keep in sync with {@link normalizePathTemplateForToolName} and {@link deriveDeterministicToolName}.
 */
export const DETERMINISTIC_TOOL_NAME_RULE =
  "When operationId is absent, toolName = `${METHOD.toUpperCase()}_${normalizedPath}` where " +
  "normalizedPath is built by: trim the path template, strip leading slashes, split on '/', drop empty segments, " +
  "map each segment: if it matches /^{([^}]+)}$/ use the captured param name, else use the segment as-is, " +
  "then join segments with '_'.";

/**
 * Exposed for unit tests and for embedding derivation metadata on each operation.
 */
export function normalizePathTemplateForToolName(pathTemplate: string): string {
  const trimmed = pathTemplate.trim();
  const noLeading = trimmed.replace(/^\/+/u, "");
  const segments = noLeading.split("/").filter((s) => s.length > 0);
  const normalizedSegments = segments.map((seg) => {
    const m = /^\{([^}]+)\}$/u.exec(seg);
    return m?.[1] ?? seg;
  });
  return normalizedSegments.join("_");
}

export function deriveDeterministicToolName(method: HttpMethod, pathTemplate: string): string {
  return `${method.toUpperCase()}_${normalizePathTemplateForToolName(pathTemplate)}`;
}
