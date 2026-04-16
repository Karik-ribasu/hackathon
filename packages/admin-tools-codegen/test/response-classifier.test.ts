import { describe, expect, it } from "vitest";

import {
  classifyResponses,
  compareResponseStatusKeys,
  inferResponseFamily,
  parseStatusCodeKey,
  responseHasNoBody,
} from "../src/response-classifier.js";

describe("compareResponseStatusKeys", () => {
  it("orders numeric status codes numerically", () => {
    expect(compareResponseStatusKeys("200", "404")).toBeLessThan(0);
    expect(compareResponseStatusKeys("404", "200")).toBeGreaterThan(0);
  });

  it("orders numeric keys before non-numeric keys", () => {
    expect(compareResponseStatusKeys("200", "default")).toBeLessThan(0);
    expect(compareResponseStatusKeys("default", "200")).toBeGreaterThan(0);
  });

  it("falls back to lexicographic order for two non-numeric keys", () => {
    expect(compareResponseStatusKeys("alpha", "zebra")).toBeLessThan(0);
  });
});

describe("parseStatusCodeKey", () => {
  it("parses numeric keys", () => {
    expect(parseStatusCodeKey("200")).toBe(200);
  });

  it("returns undefined for default", () => {
    expect(parseStatusCodeKey("default")).toBeUndefined();
  });

  it("returns undefined for non-numeric keys", () => {
    expect(parseStatusCodeKey("not-a-status")).toBeUndefined();
  });
});

describe("inferResponseFamily", () => {
  it("treats default as error", () => {
    expect(inferResponseFamily("default", undefined)).toBe("error");
  });

  it("treats 2xx as success", () => {
    expect(inferResponseFamily("204", 204)).toBe("success");
  });

  it("treats 4xx as error", () => {
    expect(inferResponseFamily("404", 404)).toBe("error");
  });

  it("treats unknown numeric as error when key is odd", () => {
    expect(inferResponseFamily("not-a-number", undefined)).toBe("error");
  });
});

describe("responseHasNoBody", () => {
  it("detects missing content", () => {
    expect(responseHasNoBody({ description: "no content" })).toBe(true);
  });

  it("detects empty content object", () => {
    expect(responseHasNoBody({ content: {} })).toBe(true);
  });

  it("detects JSON body", () => {
    expect(
      responseHasNoBody({
        content: { "application/json": { schema: { type: "object" } } },
      }),
    ).toBe(false);
  });

  it("treats invalid content as no body", () => {
    expect(responseHasNoBody({ content: null })).toBe(true);
  });
});

describe("classifyResponses", () => {
  it("orders statuses numerically", () => {
    const c = classifyResponses({
      "404": { description: "e" },
      "200": { content: { "application/json": { schema: {} } } },
      "204": { description: "empty" },
    });
    expect(c.map((x) => x.code)).toEqual([200, 204, 404]);
    expect(c.find((x) => x.code === 204)?.noBody).toBe(true);
    expect(c.find((x) => x.code === 200)?.noBody).toBe(false);
  });

  it("skips non-object response entries", () => {
    expect(classifyResponses({ "200": null })).toEqual([]);
  });

  it("sorts numeric codes before non-numeric keys like default", () => {
    const c = classifyResponses({
      default: { description: "fallback" },
      "404": { description: "missing" },
      "200": { content: { "application/json": { schema: {} } } },
    });
    expect(c.map((x) => x.code)).toEqual([200, 404]);
  });

  it("orders a numeric status key before a non-numeric key in the sorter", () => {
    const c = classifyResponses({
      "200": { content: { "application/json": { schema: {} } } },
      default: { description: "fallback" },
    });
    expect(c.map((x) => x.code)).toEqual([200]);
  });

  it("sorts two non-numeric keys lexicographically", () => {
    const c = classifyResponses({
      zebra: { description: "z" },
      alpha: { description: "a" },
    });
    expect(c).toEqual([]);
  });
});
