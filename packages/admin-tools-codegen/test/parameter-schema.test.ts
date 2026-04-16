import type { JsonObject } from "@teachable/admin-openapi-parser";
import { describe, expect, it } from "vitest";

import {
  collectParameterFields,
  emitZodObjectFromParameters,
  filterCodegenParameters,
  hasJsonRequestBody,
  isConsumerCustomIdHeader,
  jsonRequestBodyIsRequired,
  normalizePathParamCapture,
  pathTemplateToTemplateLiteral,
} from "../src/parameter-schema.js";

describe("isConsumerCustomIdHeader", () => {
  it("matches case-insensitively", () => {
    expect(
      isConsumerCustomIdHeader({
        name: "X-Consumer-Custom-ID",
        in: "header",
        required: true,
        schema: { type: "string" },
      }),
    ).toBe(true);
    expect(
      isConsumerCustomIdHeader({
        name: "x-consumer-custom-id",
        in: "header",
        required: true,
        schema: { type: "string" },
      }),
    ).toBe(true);
  });

  it("rejects non-headers", () => {
    expect(
      isConsumerCustomIdHeader({
        name: "X-Consumer-Custom-ID",
        in: "query",
        required: true,
        schema: { type: "string" },
      }),
    ).toBe(false);
  });
});

describe("filterCodegenParameters", () => {
  it("drops consumer id header", () => {
    const params = [
      { name: "X-Consumer-Custom-ID", in: "header", required: true, schema: { type: "string" } },
      { name: "id", in: "path", required: true, schema: { type: "integer" } },
    ];
    expect(filterCodegenParameters(params)).toHaveLength(1);
  });
});

describe("collectParameterFields", () => {
  it("skips parameters with invalid name or location", () => {
    const badName = [{ name: 1, in: "path", required: true, schema: { type: "string" } }] as unknown as JsonObject[];
    expect(collectParameterFields(badName)).toEqual([]);
    const badIn = [{ name: "x", in: 1, required: true, schema: { type: "string" } }] as unknown as JsonObject[];
    expect(collectParameterFields(badIn)).toEqual([]);
  });

  it("marks optional headers", () => {
    const fields = collectParameterFields([
      { name: "X-Optional", in: "header", required: false, schema: { type: "string" } },
    ]);
    expect(fields[0]?.zodExpr).toContain("optional");
  });

  it("orders cookie parameters after headers", () => {
    const fields = collectParameterFields([
      { name: "a", in: "header", required: true, schema: { type: "string" } },
      { name: "c", in: "cookie", required: true, schema: { type: "string" } },
    ]);
    expect(fields.map((f) => f.in)).toEqual(["header", "cookie"]);
  });

  it("sorts unknown locations last", () => {
    const fields = collectParameterFields([
      { name: "u", in: "other", required: true, schema: { type: "string" } },
      { name: "p", in: "path", required: true, schema: { type: "string" } },
    ]);
    expect(fields.map((f) => f.key)).toEqual(["p", "u"]);
  });

  it("uses wireName distinct from normalized key when needed", () => {
    const fields = collectParameterFields([
      { name: "page", in: "query", required: false, schema: { type: "string" } },
    ]);
    expect(fields[0]?.wireName).toBe("page");
    expect(fields[0]?.key).toBe("page");
    expect(fields[0]?.zodExpr).toContain("optional");
  });

  it("maps boolean query params", () => {
    const fields = collectParameterFields([
      { name: "active", in: "query", required: true, schema: { type: "boolean" } },
    ]);
    expect(fields[0]?.zodExpr).toContain("boolean");
  });

  it("defaults missing schemas to z.string()", () => {
    const fields = collectParameterFields([{ name: "plain", in: "query", required: true }]);
    expect(fields[0]?.zodExpr).toContain("z.string()");
  });

  it("maps binary format strings", () => {
    const fields = collectParameterFields([
      { name: "file", in: "query", required: true, schema: { type: "string", format: "binary" } },
    ]);
    expect(fields[0]?.zodExpr).toContain("Uint8Array");
  });

  it("falls back to unknown for unsupported schema shapes", () => {
    const fields = collectParameterFields([
      { name: "x", in: "query", required: true, schema: { type: "array", items: { type: "string" } } },
    ]);
    expect(fields[0]?.zodExpr).toContain("unknown");
  });
});

describe("emitZodObjectFromParameters", () => {
  it("adds optional body", () => {
    const zod = emitZodObjectFromParameters([], { present: true, required: false });
    expect(zod).toContain("body: z.unknown().optional()");
  });

  it("adds required body", () => {
    const zod = emitZodObjectFromParameters([], { present: true, required: true });
    expect(zod).toContain("body: z.unknown(),");
  });
});

describe("hasJsonRequestBody", () => {
  it("detects application/json", () => {
    expect(
      hasJsonRequestBody({
        content: { "application/json": { schema: { type: "object" } } },
      }),
    ).toBe(true);
  });

  it("detects vendor+json", () => {
    expect(
      hasJsonRequestBody({
        content: { "application/vnd.api+json": { schema: { type: "object" } } },
      }),
    ).toBe(true);
  });

  it("rejects missing content", () => {
    expect(hasJsonRequestBody({})).toBe(false);
  });
});

describe("jsonRequestBodyIsRequired", () => {
  it("reads required flag", () => {
    expect(jsonRequestBodyIsRequired({ required: true, content: {} })).toBe(true);
    expect(jsonRequestBodyIsRequired({ required: false, content: {} })).toBe(false);
  });
});

describe("normalizePathParamCapture", () => {
  it("trims defined captures and maps undefined to empty", () => {
    expect(normalizePathParamCapture("  id  ")).toBe("id");
    expect(normalizePathParamCapture(undefined)).toBe("");
  });
});

describe("pathTemplateToTemplateLiteral", () => {
  it("interpolates path params", () => {
    const lit = pathTemplateToTemplateLiteral("/a/{id}/b");
    expect(lit).toContain("${encodeURIComponent(String(input.id))}");
  });

  it("escapes template literal metacharacters", () => {
    const lit = pathTemplateToTemplateLiteral("/a`$");
    expect(lit).toContain("\\`");
  });
});
