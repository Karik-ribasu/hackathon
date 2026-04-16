import type { JsonObject, JsonValue } from "@teachable/admin-openapi-parser";

import { toIdentifierFragment } from "./identifier.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isConsumerCustomIdHeader(param: JsonObject): boolean {
  const inn = param["in"];
  const name = param["name"];
  if (inn !== "header" || typeof name !== "string") {
    return false;
  }
  return name.toLowerCase() === "x-consumer-custom-id";
}

export function filterCodegenParameters(parameters: readonly JsonObject[]): JsonObject[] {
  return parameters.filter((p) => !isConsumerCustomIdHeader(p));
}

function emitPrimitiveFromSchema(schema: JsonValue | undefined): string {
  if (!isRecord(schema)) {
    return "z.string()";
  }
  const type = schema["type"];
  const format = schema["format"];
  if (type === "integer" || type === "number") {
    return "z.coerce.number()";
  }
  if (type === "boolean") {
    return "z.coerce.boolean()";
  }
  if (type === "string") {
    if (format === "binary") {
      return "z.instanceof(Uint8Array)";
    }
    return "z.string()";
  }
  return "z.unknown()";
}

export interface ParameterField {
  /** Wire name on the HTTP request (OpenAPI `name`). */
  readonly wireName: string;
  /** Property name on generated `input` (stable identifier fragment). */
  readonly key: string;
  readonly zodExpr: string;
  readonly in: string;
}

export function collectParameterFields(parameters: readonly JsonObject[]): ParameterField[] {
  const fields: ParameterField[] = [];
  for (const param of filterCodegenParameters(parameters)) {
    const name = param["name"];
    const inn = param["in"];
    if (typeof name !== "string" || typeof inn !== "string") {
      continue;
    }
    const required = param["required"] === true;
    const schema = isRecord(param["schema"]) ? (param["schema"] as JsonValue) : undefined;
    let expr = emitPrimitiveFromSchema(schema);
    if (inn === "query" && !required) {
      expr = `${expr}.optional()`;
    }
    if (inn === "header" && !required) {
      expr = `${expr}.optional()`;
    }
    const key = toIdentifierFragment(name);
    fields.push({ wireName: name, key, zodExpr: expr, in: inn });
  }

  const order = (inn: string): number => {
    if (inn === "path") {
      return 0;
    }
    if (inn === "query") {
      return 1;
    }
    if (inn === "header") {
      return 2;
    }
    if (inn === "cookie") {
      return 3;
    }
    return 9;
  };

  return [...fields].sort((a, b) => {
    const o = order(a.in) - order(b.in);
    if (o !== 0) {
      return o;
    }
    return a.key.localeCompare(b.key);
  });
}

export function emitZodObjectFromParameters(
  parameters: readonly JsonObject[],
  body: { readonly present: boolean; readonly required: boolean },
): string {
  const parts: string[] = [];
  for (const f of collectParameterFields(parameters)) {
    parts.push(`  ${f.key}: ${f.zodExpr},`);
  }
  if (body.present) {
    parts.push(body.required ? `  body: z.unknown(),` : `  body: z.unknown().optional(),`);
  }
  if (parts.length === 0) {
    return "z.object({})";
  }
  return `z.object({\n${parts.join("\n")}\n})`;
}

export function normalizePathParamCapture(capture: string | undefined): string {
  return capture?.trim() ?? "";
}

export function pathTemplateToTemplateLiteral(pathTemplate: string): string {
  const re = /\{([^}]+)\}/gu;
  let out = "";
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(pathTemplate)) !== null) {
    const chunk = pathTemplate.slice(last, m.index);
    out += escapeForTemplateLiteral(chunk);
    const rawName = normalizePathParamCapture(m[1]);
    const id = toIdentifierFragment(rawName);
    out += `\${encodeURIComponent(String(input.${id}))}`;
    last = m.index + m[0].length;
  }
  out += escapeForTemplateLiteral(pathTemplate.slice(last));

  return `\`${out}\``;
}

function escapeForTemplateLiteral(chunk: string): string {
  return chunk.replace(/\\/gu, "\\\\").replace(/`/gu, "\\`").replace(/\$/gu, "\\$");
}

export function hasJsonRequestBody(requestBody: JsonValue | undefined): boolean {
  if (!isRecord(requestBody)) {
    return false;
  }
  const content = requestBody["content"];
  if (!isRecord(content)) {
    return false;
  }
  return Object.keys(content).some((k) => k === "application/json" || k.endsWith("+json"));
}

export function jsonRequestBodyIsRequired(requestBody: JsonValue | undefined): boolean {
  if (!isRecord(requestBody)) {
    return false;
  }
  return requestBody["required"] === true;
}
