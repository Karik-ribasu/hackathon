import { describe, expect, it } from "vitest";

import { deriveDeterministicToolName, normalizePathTemplateForToolName } from "../src/tool-name.js";

describe("normalizePathTemplateForToolName", () => {
  it("strips leading slashes and brace params", () => {
    expect(normalizePathTemplateForToolName("/kong_api/v2/foo/{id}")).toBe("kong_api_v2_foo_id");
  });

  it("trims whitespace", () => {
    expect(normalizePathTemplateForToolName("  /a/b  ")).toBe("a_b");
  });

  it("collapses duplicate slashes only via split (leading strip)", () => {
    expect(normalizePathTemplateForToolName("///x///y//")).toBe("x_y");
  });
});

describe("deriveDeterministicToolName", () => {
  it("prefixes uppercase method", () => {
    expect(deriveDeterministicToolName("get", "/v1/a")).toBe("GET_v1_a");
  });
});
