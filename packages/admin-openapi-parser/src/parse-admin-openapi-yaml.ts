import YAML from "yaml";

import { buildIntermediateModel } from "./build-intermediate-model.js";
import { AdminOpenApiParseError } from "./errors.js";
import type { AdminOpenApiIntermediateModel } from "./model.js";

function assertOpenApiRootObject(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new AdminOpenApiParseError(
      "invalid_openapi_document",
      `OpenAPI document root must be an object (got ${value === null ? "null" : Array.isArray(value) ? "array" : typeof value}).`,
    );
  }
  return value as Record<string, unknown>;
}

/**
 * Parse Teachable `admin-api.yaml` text into the stable intermediate model.
 * Fails fast on invalid YAML or any invariant that breaks 1:1 operation mapping.
 */
export function parseAdminOpenApiYaml(content: string): AdminOpenApiIntermediateModel {
  let parsed: unknown;
  try {
    parsed = YAML.parse(content);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    throw new AdminOpenApiParseError("invalid_yaml", `Invalid YAML: ${message}`, { cause });
  }
  if (parsed === undefined || parsed === null) {
    throw new AdminOpenApiParseError("invalid_openapi_document", "OpenAPI document is empty or null.");
  }
  const root = assertOpenApiRootObject(parsed);
  return buildIntermediateModel(root);
}
