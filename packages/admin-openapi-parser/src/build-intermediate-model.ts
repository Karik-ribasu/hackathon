import { AdminOpenApiParseError } from "./errors.js";
import { HTTP_METHODS, type HttpMethod } from "./http-methods.js";
import type {
  AdminHttpOperation,
  AdminOpenApiIntermediateModel,
  JsonObject,
  JsonValue,
  ToolNameDerivation,
} from "./model.js";
import { DETERMINISTIC_TOOL_NAME_RULE, deriveDeterministicToolName, normalizePathTemplateForToolName } from "./tool-name.js";

const PATH_ITEM_KEYS_ALWAYS_ALLOWED = new Set<string>([
  "parameters",
  "summary",
  "description",
  "servers",
  "$ref",
  ...HTTP_METHODS,
]);

const OPERATION_KEYS_ALLOWED = new Set<string>([
  "tags",
  "summary",
  "description",
  "externalDocs",
  "operationId",
  "parameters",
  "requestBody",
  "responses",
  "callbacks",
  "deprecated",
  "security",
  "servers",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new AdminOpenApiParseError(
      "invalid_openapi_document",
      `${label} must be a JSON object (got ${typeof value}).`,
    );
  }
  return value;
}

function assertString(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new AdminOpenApiParseError(
      "invalid_openapi_document",
      `${label} must be a string (got ${typeof value}).`,
    );
  }
  return value;
}

function validateOpenApiVersion(value: unknown): string {
  const s = assertString(value, "openapi");
  if (!/^3\.\d/u.test(s)) {
    throw new AdminOpenApiParseError(
      "invalid_openapi_document",
      `Unsupported openapi field: "${s}". This parser supports OpenAPI 3.x only.`,
    );
  }
  return s;
}

function asJsonObjectRecord(value: Record<string, unknown>): JsonObject {
  return value as unknown as JsonObject;
}

function asJsonValue(value: unknown): JsonValue {
  return value as JsonValue;
}

function normalizeParameterArray(value: unknown, label: string): JsonObject[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new AdminOpenApiParseError(
      "invariant_violation",
      `${label} must be an array when provided (got ${typeof value}).`,
    );
  }
  return value.map((item, i) => {
    if (!isRecord(item)) {
      throw new AdminOpenApiParseError(
        "invariant_violation",
        `${label}[${String(i)}] must be an object.`,
      );
    }
    const name = item["name"];
    const inn = item["in"];
    if (typeof name !== "string" || name.length === 0) {
      throw new AdminOpenApiParseError(
        "invariant_violation",
        `${label}[${String(i)}] requires a non-empty string "name".`,
      );
    }
    if (typeof inn !== "string" || inn.length === 0) {
      throw new AdminOpenApiParseError(
        "invariant_violation",
        `${label}[${String(i)}] requires a non-empty string "in".`,
      );
    }
    return asJsonObjectRecord(item);
  });
}

function mergeParameters(pathLevel: unknown, operationLevel: unknown): JsonObject[] {
  const pathParams = normalizeParameterArray(pathLevel, "paths[].parameters");
  const opParams = normalizeParameterArray(operationLevel, "operation.parameters");
  const map = new Map<string, JsonObject>();
  for (const p of pathParams) {
    map.set(`${p["in"] as string}:${p["name"] as string}`, p);
  }
  for (const p of opParams) {
    map.set(`${p["in"] as string}:${p["name"] as string}`, p);
  }
  return [...map.values()];
}

function readOptionalString(value: unknown, label: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new AdminOpenApiParseError(
      "invariant_violation",
      `${label} must be a string when provided (got ${typeof value}).`,
    );
  }
  return value;
}

function readTags(value: unknown): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    throw new AdminOpenApiParseError("invariant_violation", "operation.tags must be an array when provided.");
  }
  value.forEach((t, i) => {
    if (typeof t !== "string") {
      throw new AdminOpenApiParseError(
        "invariant_violation",
        `operation.tags[${String(i)}] must be a string.`,
      );
    }
  });
  return value as string[];
}

function validatePathItemKeys(pathTemplate: string, pathItem: Record<string, unknown>): void {
  if ("$ref" in pathItem) {
    throw new AdminOpenApiParseError(
      "invariant_violation",
      `Path "${pathTemplate}" uses "$ref", which is not supported by this parser (inline the path item or extend the parser).`,
    );
  }
  for (const key of Object.keys(pathItem)) {
    if (PATH_ITEM_KEYS_ALWAYS_ALLOWED.has(key)) {
      continue;
    }
    if (key.startsWith("x-")) {
      continue;
    }
    throw new AdminOpenApiParseError(
      "invariant_violation",
      `Path "${pathTemplate}" has unsupported key "${key}". Only HTTP methods, parameters/summary/description/servers, and x-* extensions are allowed.`,
    );
  }
}

function validateOperationKeys(pathTemplate: string, method: HttpMethod, op: Record<string, unknown>): void {
  for (const key of Object.keys(op)) {
    if (OPERATION_KEYS_ALLOWED.has(key)) {
      continue;
    }
    if (key.startsWith("x-")) {
      continue;
    }
    throw new AdminOpenApiParseError(
      "invariant_violation",
      `Operation ${method.toUpperCase()} "${pathTemplate}" has unsupported key "${key}".`,
    );
  }
}

function readRequestBody(value: unknown, pathTemplate: string, method: HttpMethod): JsonValue | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!isRecord(value)) {
    throw new AdminOpenApiParseError(
      "invariant_violation",
      `Operation ${method.toUpperCase()} "${pathTemplate}" requestBody must be an object when provided.`,
    );
  }
  return asJsonValue(value);
}

function readResponses(value: unknown, pathTemplate: string, method: HttpMethod): JsonObject {
  if (value === undefined) {
    throw new AdminOpenApiParseError(
      "invariant_violation",
      `Operation ${method.toUpperCase()} "${pathTemplate}" must declare "responses".`,
    );
  }
  if (!isRecord(value)) {
    throw new AdminOpenApiParseError(
      "invariant_violation",
      `Operation ${method.toUpperCase()} "${pathTemplate}" responses must be an object.`,
    );
  }
  if (Object.keys(value).length === 0) {
    throw new AdminOpenApiParseError(
      "invariant_violation",
      `Operation ${method.toUpperCase()} "${pathTemplate}" responses must not be empty.`,
    );
  }
  return asJsonObjectRecord(value);
}

function resolveToolName(
  method: HttpMethod,
  pathTemplate: string,
  operationIdRaw: unknown,
): { toolName: string; operationId: string | undefined; derivation: ToolNameDerivation } {
  if (operationIdRaw === undefined) {
    return {
      toolName: deriveDeterministicToolName(method, pathTemplate),
      operationId: undefined,
      derivation: {
        kind: "deterministic",
        rule: DETERMINISTIC_TOOL_NAME_RULE,
        methodUpper: method.toUpperCase(),
        pathTemplate,
        normalizedPathForToolName: normalizePathTemplateForToolName(pathTemplate),
      },
    };
  }
  if (typeof operationIdRaw !== "string" || operationIdRaw.trim().length === 0) {
    throw new AdminOpenApiParseError(
      "invariant_violation",
      "operationId, when present, must be a non-empty string.",
    );
  }
  const operationId = operationIdRaw.trim();
  return {
    toolName: operationId,
    operationId,
    derivation: { kind: "operationId" },
  };
}

/**
 * Build the intermediate model from a parsed OpenAPI root object (already plain JSON/YAML data).
 * Enforces 1:1 mapping: each `paths[path][httpMethod]` yields exactly one {@link AdminHttpOperation}.
 */
export function buildIntermediateModel(root: Record<string, unknown>): AdminOpenApiIntermediateModel {
  const openapi = validateOpenApiVersion(root["openapi"]);
  const info = assertRecord(root["info"], "info");
  const pathsRaw = root["paths"];
  const paths = assertRecord(pathsRaw, "paths");

  const serversRaw = root["servers"];
  let servers: readonly JsonValue[] | undefined;
  if (serversRaw !== undefined) {
    if (!Array.isArray(serversRaw)) {
      throw new AdminOpenApiParseError("invalid_openapi_document", "servers must be an array when provided.");
    }
    servers = serversRaw.map((s, i) => {
      if (!isRecord(s)) {
        throw new AdminOpenApiParseError(
          "invalid_openapi_document",
          `servers[${String(i)}] must be an object.`,
        );
      }
      return asJsonValue(s);
    });
  }

  const operations: AdminHttpOperation[] = [];
  const operationIds = new Map<string, { pathTemplate: string; method: HttpMethod }>();
  const toolNames = new Map<string, { pathTemplate: string; method: HttpMethod }>();

  const pathTemplates = Object.keys(paths).sort((a, b) => a.localeCompare(b));
  for (const pathTemplate of pathTemplates) {
    const pathItemRaw = paths[pathTemplate];
    const pathItem = assertRecord(pathItemRaw, `paths["${pathTemplate}"]`);
    validatePathItemKeys(pathTemplate, pathItem);
    const pathLevelParameters = pathItem["parameters"];

    for (const method of HTTP_METHODS) {
      if (!(method in pathItem)) {
        continue;
      }
      const opRaw = pathItem[method];
      const op = assertRecord(opRaw, `paths["${pathTemplate}"].${method}`);
      validateOperationKeys(pathTemplate, method, op);

      const { toolName, operationId, derivation } = resolveToolName(method, pathTemplate, op["operationId"]);

      if (operationId !== undefined) {
        const existingId = operationIds.get(operationId);
        if (existingId !== undefined) {
          throw new AdminOpenApiParseError(
            "invariant_violation",
            `Duplicate operationId "${operationId}": ${existingId.method.toUpperCase()} "${existingId.pathTemplate}" vs ${method.toUpperCase()} "${pathTemplate}".`,
          );
        }
      }

      const existingTool = toolNames.get(toolName);
      if (existingTool !== undefined) {
        throw new AdminOpenApiParseError(
          "invariant_violation",
          `Duplicate tool name "${toolName}": ${existingTool.method.toUpperCase()} "${existingTool.pathTemplate}" vs ${method.toUpperCase()} "${pathTemplate}".`,
        );
      }

      if (operationId !== undefined) {
        operationIds.set(operationId, { pathTemplate, method });
      }
      toolNames.set(toolName, { pathTemplate, method });

      const parameters = mergeParameters(pathLevelParameters, op["parameters"]);
      const requestBody = readRequestBody(op["requestBody"], pathTemplate, method);
      const responses = readResponses(op["responses"], pathTemplate, method);

      operations.push({
        method,
        pathTemplate,
        operationId,
        toolName,
        toolNameDerivation: derivation,
        tags: readTags(op["tags"]),
        summary: readOptionalString(op["summary"], "operation.summary"),
        description: readOptionalString(op["description"], "operation.description"),
        parameters,
        requestBody,
        responses,
      });
    }
  }

  return {
    openapi,
    info: asJsonObjectRecord(info),
    servers,
    operations,
  };
}
