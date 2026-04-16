import { readFileSync } from "node:fs";

import type { AdminHttpOperation, AdminOpenApiIntermediateModel } from "@teachable/admin-openapi-parser";
import { parseAdminOpenApiYaml } from "@teachable/admin-openapi-parser";
import { describe, expect, it } from "vitest";

import type { ResolvedAdminToolOverride } from "../src/admin-tool-overrides.js";
import { emitAdminToolsTypeScript } from "../src/emit-admin-tools-module.js";

function op(partial: AdminHttpOperation): AdminHttpOperation {
  return partial;
}

describe("emitAdminToolsTypeScript", () => {
  it("emits one createTool per operation with stable id", () => {
    const model: AdminOpenApiIntermediateModel = {
      openapi: "3.0.0",
      info: { title: "t", version: "1" },
      servers: [],
      operations: [
        op({
          method: "get",
          pathTemplate: "/kong_api/v2/foo/{id}",
          operationId: "sampleGet",
          toolName: "sampleGet",
          toolNameDerivation: { kind: "operationId" },
          tags: [],
          summary: "read foo",
          description: undefined,
          parameters: [
            {
              name: "X-Consumer-Custom-ID",
              in: "header",
              required: true,
              schema: { type: "string" },
            },
            { name: "id", in: "path", required: true, schema: { type: "integer" } },
          ],
          requestBody: undefined,
          responses: {
            "200": {
              description: "ok",
              content: { "application/json": { schema: { type: "object" } } },
            },
            "404": {
              description: "missing",
              content: { "application/json": { schema: { type: "object" } } },
            },
          },
        }),
      ],
    };
    const ts = emitAdminToolsTypeScript(model);
    expect(ts).toMatchSnapshot();
    expect(ts).toContain('id: "sampleGet"');
    expect(ts).toContain("createTool(");
    expect(ts).toContain('kind: z.literal("success")');
    expect(ts).toContain('kind: z.literal("error")');
    expect(ts).toContain("z.union(");
    expect(ts).not.toContain("axios");
    expect(ts).toContain("TeachableAdminHttpClient");
  });

  it("emits explicit 204 no_content success branch", () => {
    const model: AdminOpenApiIntermediateModel = {
      openapi: "3.0.0",
      info: { title: "t", version: "1" },
      servers: [],
      operations: [
        op({
          method: "patch",
          pathTemplate: "/kong_api/v2/products/courses/{course_id}/compliance",
          operationId: undefined,
          toolName: "PATCH_kong_api_v2_products_courses_course_id_compliance",
          toolNameDerivation: {
            kind: "deterministic",
            rule: "r",
            methodUpper: "PATCH",
            pathTemplate: "/kong_api/v2/products/courses/{course_id}/compliance",
            normalizedPathForToolName: "x",
          },
          tags: [],
          summary: "patch compliance",
          description: undefined,
          parameters: [
            {
              name: "X-Consumer-Custom-ID",
              in: "header",
              required: true,
              schema: { type: "string" },
            },
            {
              name: "course_id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          requestBody: undefined,
          responses: {
            "204": { description: "Successful" },
            "404": {
              description: "Course not found",
              content: { "application/json": { schema: { type: "object" } } },
            },
          },
        }),
      ],
    };
    const ts = emitAdminToolsTypeScript(model);
    expect(ts).toMatchSnapshot();
    expect(ts).toContain("z.literal(204)");
    expect(ts).toContain('content: z.literal("no_content")');
    expect(ts).toContain('no_content" as const');
    expect(ts).toContain(
      'id: "PATCH_kong_api_v2_products_courses_course_id_compliance"',
    );
  });

  it("is deterministic when operation order changes", () => {
    const a = op({
      method: "get",
      pathTemplate: "/a",
      operationId: "aOp",
      toolName: "aOp",
      toolNameDerivation: { kind: "operationId" },
      tags: [],
      summary: "a",
      description: undefined,
      parameters: [],
      requestBody: undefined,
      responses: {
        "200": { description: "ok", content: { "application/json": { schema: {} } } },
      },
    });
    const b = op({
      method: "get",
      pathTemplate: "/b",
      operationId: "bOp",
      toolName: "bOp",
      toolNameDerivation: { kind: "operationId" },
      tags: [],
      summary: "b",
      description: undefined,
      parameters: [],
      requestBody: undefined,
      responses: {
        "200": { description: "ok", content: { "application/json": { schema: {} } } },
      },
    });
    const first = emitAdminToolsTypeScript({
      openapi: "3.0.0",
      info: { title: "t", version: "1" },
      servers: [],
      operations: [a, b],
    });
    const second = emitAdminToolsTypeScript({
      openapi: "3.0.0",
      info: { title: "t", version: "1" },
      servers: [],
      operations: [b, a],
    });
    expect(first).toBe(second);
    expect(first.indexOf("aOp")).toBeLessThan(first.indexOf("bOp"));
  });

  it("prefers OpenAPI description over summary for tool text", () => {
    const fromDescOnly: AdminOpenApiIntermediateModel = {
      openapi: "3.0.0",
      info: { title: "t", version: "1" },
      servers: [],
      operations: [
        op({
          method: "get",
          pathTemplate: "/x",
          operationId: "d1",
          toolName: "d1",
          toolNameDerivation: { kind: "operationId" },
          tags: [],
          summary: undefined,
          description: "Only description",
          parameters: [],
          requestBody: undefined,
          responses: {
            "200": { description: "ok", content: { "application/json": { schema: {} } } },
          },
        }),
      ],
    };
    expect(emitAdminToolsTypeScript(fromDescOnly)).toContain("Only description");

    const descWinsOverSummary: AdminOpenApiIntermediateModel = {
      openapi: "3.0.0",
      info: { title: "t", version: "1" },
      servers: [],
      operations: [
        op({
          method: "get",
          pathTemplate: "/kong_api/v2/products/coaching",
          operationId: "c1",
          toolName: "c1",
          toolNameDerivation: { kind: "operationId" },
          tags: [],
          summary: "/v2/products/coaching",
          description: "Retrieve a list of coaching products for the school.",
          parameters: [],
          requestBody: undefined,
          responses: {
            "200": { description: "ok", content: { "application/json": { schema: {} } } },
          },
        }),
      ],
    };
    const coaching = emitAdminToolsTypeScript(descWinsOverSummary);
    expect(coaching).toContain("Retrieve a list of coaching products for the school.");
    expect(coaching.indexOf("Retrieve a list")).toBeLessThan(coaching.indexOf("/v2/products/coaching"));

    const bare: AdminOpenApiIntermediateModel = {
      openapi: "3.0.0",
      info: { title: "t", version: "1" },
      servers: [],
      operations: [
        op({
          method: "post",
          pathTemplate: "/y",
          operationId: "d2",
          toolName: "d2",
          toolNameDerivation: { kind: "operationId" },
          tags: [],
          summary: undefined,
          description: undefined,
          parameters: [],
          requestBody: undefined,
          responses: {
            "200": { description: "ok", content: { "application/json": { schema: {} } } },
          },
        }),
      ],
    };
    const out = emitAdminToolsTypeScript(bare);
    expect(out).toContain("POST /y");
    expect(out).toMatch(/description: "POST \/y"/u);
  });

  it("passes optional non-consumer headers through adminRequest", () => {
    const model: AdminOpenApiIntermediateModel = {
      openapi: "3.0.0",
      info: { title: "t", version: "1" },
      servers: [],
      operations: [
        op({
          method: "get",
          pathTemplate: "/kong_api/v2/ping",
          operationId: "ping",
          toolName: "ping",
          toolNameDerivation: { kind: "operationId" },
          tags: [],
          summary: "ping",
          description: undefined,
          parameters: [
            {
              name: "X-Consumer-Custom-ID",
              in: "header",
              required: true,
              schema: { type: "string" },
            },
            {
              name: "X-Optional-Flag",
              in: "header",
              required: false,
              schema: { type: "string" },
            },
          ],
          requestBody: undefined,
          responses: {
            "200": { description: "ok", content: { "application/json": { schema: {} } } },
          },
        }),
      ],
    };
    const ts = emitAdminToolsTypeScript(model);
    expect(ts).toContain("extraHeaders");
    expect(ts).toContain("Object.fromEntries");
    expect(ts).toContain("X-Optional-Flag");
  });

  it("emits only error outputSchema when no 2xx is declared", () => {
    const model: AdminOpenApiIntermediateModel = {
      openapi: "3.0.0",
      info: { title: "t", version: "1" },
      servers: [],
      operations: [
        op({
          method: "get",
          pathTemplate: "/broken",
          operationId: "broken",
          toolName: "broken",
          toolNameDerivation: { kind: "operationId" },
          tags: [],
          summary: "x",
          description: undefined,
          parameters: [],
          requestBody: undefined,
          responses: {
            "404": { description: "nope", content: { "application/json": { schema: {} } } },
          },
        }),
      ],
    };
    const ts = emitAdminToolsTypeScript(model);
    expect(ts).toContain('kind: z.literal("error")');
    expect(ts).not.toMatch(/z\.union\(/u);
  });

  it("merges multiple overrides from the same module into one import statement", () => {
    const model: AdminOpenApiIntermediateModel = {
      openapi: "3.0.0",
      info: { title: "t", version: "1" },
      servers: [],
      operations: [
        op({
          method: "get",
          pathTemplate: "/items",
          operationId: "listItems",
          toolName: "listItems",
          toolNameDerivation: { kind: "operationId" },
          tags: [],
          summary: "List",
          description: undefined,
          parameters: [],
          requestBody: undefined,
          responses: {
            "200": { description: "ok", content: { "application/json": { schema: {} } } },
          },
        }),
        op({
          method: "get",
          pathTemplate: "/other",
          operationId: "otherOp",
          toolName: "otherOp",
          toolNameDerivation: { kind: "operationId" },
          tags: [],
          summary: "Other",
          description: undefined,
          parameters: [],
          requestBody: undefined,
          responses: {
            "200": { description: "ok", content: { "application/json": { schema: {} } } },
          },
        }),
      ],
    };
    const overrides: readonly ResolvedAdminToolOverride[] = [
      {
        toolName: "listItems",
        importSpecifier: "../../overrides/bundle.js",
        exportName: "adminTool_listItemsCustom",
      },
      {
        toolName: "otherOp",
        importSpecifier: "../../overrides/bundle.js",
        exportName: "adminTool_otherOpCustom",
      },
    ];
    const ts = emitAdminToolsTypeScript(model, { overrides });
    expect(ts).toMatch(
      /import \{ adminTool_listItemsCustom as _ov_listItems, adminTool_otherOpCustom as _ov_otherOp \}/u,
    );
  });

  it("delegates overridden tools to hand-written factories without duplicating createTool bodies", () => {
    const model: AdminOpenApiIntermediateModel = {
      openapi: "3.0.0",
      info: { title: "t", version: "1" },
      servers: [],
      operations: [
        op({
          method: "get",
          pathTemplate: "/items",
          operationId: "listItems",
          toolName: "listItems",
          toolNameDerivation: { kind: "operationId" },
          tags: [],
          summary: "List",
          description: undefined,
          parameters: [],
          requestBody: undefined,
          responses: {
            "200": { description: "ok", content: { "application/json": { schema: {} } } },
          },
        }),
      ],
    };
    const overrides: readonly ResolvedAdminToolOverride[] = [
      {
        toolName: "listItems",
        importSpecifier: "../../overrides/handlers/list.js",
        exportName: "adminTool_listItemsCustom",
      },
    ];
    const ts = emitAdminToolsTypeScript(model, { overrides });
    expect(ts).toContain('import { adminTool_listItemsCustom as _ov_listItems }');
    expect(ts).toContain("export function adminTool_listItems(deps: TeachableAdminToolsDeps)");
    expect(ts).toContain("return _ov_listItems(deps);");
    expect(ts).not.toContain('id: "listItems"');
    expect(ts).toContain("makeAllTeachableAdminTools");
    const matches = [...ts.matchAll(/createTool\(/gu)];
    expect(matches.length).toBe(0);
  });

  it("matches admin-api.yaml operation count", () => {
    const yamlPath = new URL("../../../open-api/admin-api.yaml", import.meta.url);
    const model = parseAdminOpenApiYaml(readFileSync(yamlPath, "utf8"));
    const ts = emitAdminToolsTypeScript(model);
    const matches = [...ts.matchAll(/createTool\(/gu)];
    expect(matches.length).toBe(model.operations.length);
    expect(model.operations.length).toBe(67);
    expect(ts).toContain("z.literal(204)");
    expect(ts).toContain('kind: z.literal("error")');
  });
});
