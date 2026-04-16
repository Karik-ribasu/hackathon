import { describe, expect, it } from "vitest";

import { HTTP_METHOD_SET, HTTP_METHOD_SORT_ORDER, isHttpMethod } from "../src/http-methods.js";

describe("isHttpMethod", () => {
  it("accepts lowercase verbs", () => {
    expect(isHttpMethod("get")).toBe(true);
  });

  it("rejects unknown verbs", () => {
    expect(isHttpMethod("GET")).toBe(false);
    expect(isHttpMethod("nope")).toBe(false);
  });
});

describe("HTTP_METHOD_SET", () => {
  it("contains get", () => {
    expect(HTTP_METHOD_SET.has("get")).toBe(true);
  });
});

describe("HTTP_METHOD_SORT_ORDER", () => {
  it("orders patch after post", () => {
    expect(HTTP_METHOD_SORT_ORDER["post"]).toBeLessThan(HTTP_METHOD_SORT_ORDER["patch"]);
  });
});
