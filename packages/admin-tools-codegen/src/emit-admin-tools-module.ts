import type { AdminHttpOperation, AdminOpenApiIntermediateModel, JsonObject } from "@teachable/admin-openapi-parser";

import type { ResolvedAdminToolOverride } from "./admin-tool-overrides.js";
import { toIdentifierFragment } from "./identifier.js";
import {
  collectParameterFields,
  emitZodObjectFromParameters,
  hasJsonRequestBody,
  jsonRequestBodyIsRequired,
  pathTemplateToTemplateLiteral,
} from "./parameter-schema.js";
import { classifyResponses, type ClassifiedResponse } from "./response-classifier.js";

function escapeMultilineDescription(text: string | undefined): string {
  if (text === undefined || text.trim().length === 0) {
    return "";
  }
  return text.replace(/\r\n/gu, "\n").replace(/\r/gu, "\n").trim();
}

function emitToolDescription(operation: AdminHttpOperation): string {
  const summary = escapeMultilineDescription(operation.summary);
  const desc = escapeMultilineDescription(operation.description);
  // OpenAPI `summary` is often the short path label; `description` is the human-readable spec text for LLM tools.
  const base = desc.length > 0 ? desc : summary;
  const methodPath = `${operation.method.toUpperCase()} ${operation.pathTemplate}`;
  return base.length > 0 ? `${base}\n\n${methodPath}` : methodPath;
}

function emitSuccessZodVariants(successes: readonly ClassifiedResponse[]): string[] {
  return successes.map((s) => {
    if (s.noBody) {
      return `z.object({ kind: z.literal("success"), status: z.literal(${String(s.code)}), body: z.null(), content: z.literal("no_content") })`;
    }
    return `z.object({ kind: z.literal("success"), status: z.literal(${String(s.code)}), body: z.unknown() })`;
  });
}

function emitOutputSchema(responses: JsonObject): string {
  const classified = classifyResponses(responses);
  const successes = classified.filter((c) => c.family === "success");
  const successZods = emitSuccessZodVariants(successes);
  const errorZod = `z.object({ kind: z.literal("error"), status: z.number(), body: z.unknown().optional() })`;
  if (successZods.length === 0) {
    return errorZod;
  }
  const members = [...successZods, errorZod];
  return `z.union([${members.join(", ")}])`;
}

function emitExecuteSuccessBranches(successes: readonly ClassifiedResponse[]): string {
  const lines: string[] = [];
  for (const s of successes) {
    if (s.noBody) {
      lines.push(`    if (status === ${String(s.code)}) {`);
      lines.push(
        `      return { kind: "success" as const, status: ${String(s.code)} as const, body: null, content: "no_content" as const };`,
      );
      lines.push(`    }`);
    } else {
      lines.push(`    if (status === ${String(s.code)}) {`);
      lines.push(`      return { kind: "success" as const, status: ${String(s.code)} as const, body: json };`);
      lines.push(`    }`);
    }
  }
  lines.push(`    return { kind: "error" as const, status, body: json };`);
  return lines.join("\n");
}

function emitQueryBlock(operation: AdminHttpOperation): string {
  const fields = collectParameterFields(operation.parameters).filter((f) => f.in === "query");
  if (fields.length === 0) {
    return "";
  }
  const lines = fields.map(
    (f) =>
      `      ${JSON.stringify(f.wireName)}: input.${f.key} !== undefined ? String(input.${f.key}) : undefined,`,
  );
  return [`    const query: Record<string, string | undefined> = {`, ...lines, `    };`, ``].join("\n");
}

function emitHeaderBlock(operation: AdminHttpOperation): string {
  const fields = collectParameterFields(operation.parameters).filter((f) => f.in === "header");
  if (fields.length === 0) {
    return "";
  }
  const keys = fields.map((f) => `      ${JSON.stringify(f.wireName)}: input.${f.key},`);
  return [`    const extraHeaders: Record<string, string | undefined> = {`, ...keys, `    };`, ``].join("\n");
}

function emitToolFactoryName(toolName: string): string {
  return `adminTool_${toIdentifierFragment(toolName)}`;
}

function emitOverrideImportLines(overrides: readonly ResolvedAdminToolOverride[]): string {
  if (overrides.length === 0) {
    return "";
  }
  const bySpecifier = new Map<string, string[]>();
  for (const o of overrides) {
    const alias = `_ov_${toIdentifierFragment(o.toolName)}`;
    const binding = `${o.exportName} as ${alias}`;
    const list = bySpecifier.get(o.importSpecifier) ?? [];
    list.push(binding);
    bySpecifier.set(o.importSpecifier, list);
  }
  const lines: string[] = [];
  for (const [specifier, bindings] of [...bySpecifier.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const uniqueBindings = [...new Set(bindings)].sort((a, b) => a.localeCompare(b));
    lines.push(`import { ${uniqueBindings.join(", ")} } from ${JSON.stringify(specifier)};`);
  }
  return `${lines.join("\n")}\n`;
}

function emitOverrideWrapper(operation: AdminHttpOperation): string {
  const factory = emitToolFactoryName(operation.toolName);
  const alias = `_ov_${toIdentifierFragment(operation.toolName)}`;
  return [
    `export function ${factory}(deps: TeachableAdminToolsDeps) {`,
    `  return ${alias}(deps);`,
    `}`,
  ].join("\n");
}

function emitSingleTool(operation: AdminHttpOperation): string {
  const classified = classifyResponses(operation.responses);
  const successes = classified.filter((c) => c.family === "success").sort((a, b) => a.code - b.code);
  const bodyPresent = hasJsonRequestBody(operation.requestBody);
  const bodyRequired = jsonRequestBodyIsRequired(operation.requestBody);
  const inputSchema = emitZodObjectFromParameters(operation.parameters, {
    present: bodyPresent,
    required: bodyRequired,
  });
  const outputSchema = emitOutputSchema(operation.responses);
  const pathExpr = pathTemplateToTemplateLiteral(operation.pathTemplate);
  const description = emitToolDescription(operation);
  const factory = emitToolFactoryName(operation.toolName);
  const queryBlock = emitQueryBlock(operation);
  const headerBlock = emitHeaderBlock(operation);
  const methodUpper = JSON.stringify(operation.method.toUpperCase());

  const headerPass =
    headerBlock.length > 0 ?
      `      headers: Object.fromEntries(
        Object.entries(extraHeaders).filter(([, v]) => v !== undefined),
      ) as Record<string, string>,`
    : "";

  const requestLines = [
    `    const { status, json } = await deps.http.adminRequest({`,
    `      method: ${methodUpper},`,
    `      path: ${pathExpr},`,
    ...(queryBlock.length > 0 ? [`      query,`] : []),
    ...(headerPass.length > 0 ? [headerPass] : []),
    ...(bodyPresent ? [`      jsonBody: input.body,`] : []),
    `    });`,
  ];

  return [
    `export function ${factory}(deps: TeachableAdminToolsDeps) {`,
    `  return createTool({`,
    `    id: ${JSON.stringify(operation.toolName)},`,
    `    description: ${JSON.stringify(description)},`,
    `    inputSchema: ${inputSchema},`,
    `    outputSchema: ${outputSchema},`,
    `    execute: async (input) => {`,
    ...(queryBlock.length > 0 ? [queryBlock] : []),
    ...(headerBlock.length > 0 ? [headerBlock] : []),
    ...requestLines,
    emitExecuteSuccessBranches(successes),
    `    },`,
    `  });`,
    `}`,
  ].join("\n");
}

const FILE_IMPORTS_AND_TYPES = [
  `// @generated by @teachable/admin-tools-codegen`,
  `// Teachable Admin API tools — native HTTP access is implemented only inside an injected client (fetch at the adapter edge).`,
  ``,
  `import { createTool } from "@mastra/core/tools";`,
  `import { z } from "zod";`,
].join("\n");

const FILE_TYPES = [
  ``,
  ``,
  `/**`,
  ` * Injectable admin HTTP port. Implementations should use native fetch, inject base URL,`,
  ` * and attach X-Consumer-Custom-ID — never hardcode those values in generated tools.`,
  ` */`,
  `export type TeachableAdminHttpClient = {`,
  `  adminRequest(init: {`,
  `    readonly method: string;`,
  `    readonly path: string;`,
  `    readonly query?: Readonly<Record<string, string | undefined>>;`,
  `    readonly headers?: Readonly<Record<string, string>>;`,
  `    readonly jsonBody?: unknown;`,
  `  }): Promise<{ readonly status: number; readonly json: unknown | null }>;`,
  `};`,
  ``,
  `export type TeachableAdminToolsDeps = {`,
  `  readonly http: TeachableAdminHttpClient;`,
  `};`,
  ``,
].join("\n");

export type EmitAdminToolsOptions = {
  /** Hand-written factories keyed by OpenAPI tool name; replace generated createTool for those operations only. */
  readonly overrides?: readonly ResolvedAdminToolOverride[];
};

/**
 * Emit a deterministic TypeScript module of Mastra tools (createTool + Zod) from the parser model.
 */
export function emitAdminToolsTypeScript(model: AdminOpenApiIntermediateModel, options?: EmitAdminToolsOptions): string {
  const operations = [...model.operations].sort((a, b) => a.toolName.localeCompare(b.toolName));
  const overrideByTool = new Map<string, ResolvedAdminToolOverride>();
  for (const o of options?.overrides ?? []) {
    overrideByTool.set(o.toolName, o);
  }
  const toolBlocks = operations.map((op) =>
    overrideByTool.has(op.toolName) ? emitOverrideWrapper(op) : emitSingleTool(op),
  );
  const importBlock = emitOverrideImportLines([...(options?.overrides ?? [])].sort((a, b) => a.toolName.localeCompare(b.toolName)));
  const headerWithImports =
    importBlock.length > 0 ?
      `${FILE_IMPORTS_AND_TYPES}\n${importBlock.trimEnd()}${FILE_TYPES}`
    : `${FILE_IMPORTS_AND_TYPES}${FILE_TYPES}`;
  const factories = operations.map((op) => emitToolFactoryName(op.toolName));
  const allToolsFn = [
    `export function makeAllTeachableAdminTools(deps: TeachableAdminToolsDeps) {`,
    `  return [`,
    ...factories.map((f) => `    ${f}(deps),`),
    `  ] as const;`,
    `}`,
  ].join("\n");

  return [headerWithImports, ...toolBlocks, allToolsFn].join("\n\n");
}
