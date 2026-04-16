import type { HttpMethod } from "./http-methods.js";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { readonly [key: string]: JsonValue };

export type JsonObject = { readonly [key: string]: JsonValue };

export type ToolNameDerivation =
  | {
      readonly kind: "operationId";
    }
  | {
      readonly kind: "deterministic";
      readonly rule: string;
      readonly methodUpper: string;
      readonly pathTemplate: string;
      readonly normalizedPathForToolName: string;
    };

/**
 * One OpenAPI operation under `paths[path][method]` — maps 1:1 to a generated tool entry.
 */
export interface AdminHttpOperation {
  readonly method: HttpMethod;
  /** Path template exactly as declared under `paths` (e.g. `/kong_api/v2/foo/{id}`). */
  readonly pathTemplate: string;
  readonly operationId: string | undefined;
  /** Stable identifier consumed by codegen (Mastra tool name). */
  readonly toolName: string;
  readonly toolNameDerivation: ToolNameDerivation;
  readonly tags: readonly string[] | undefined;
  readonly summary: string | undefined;
  readonly description: string | undefined;
  readonly parameters: readonly JsonObject[];
  readonly requestBody: JsonValue | undefined;
  readonly responses: JsonObject;
}

export interface AdminOpenApiIntermediateModel {
  readonly openapi: string;
  readonly info: JsonObject;
  readonly servers: readonly JsonValue[] | undefined;
  readonly operations: readonly AdminHttpOperation[];
}
