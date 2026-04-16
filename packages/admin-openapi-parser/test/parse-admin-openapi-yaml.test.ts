import { describe, expect, it } from "vitest";

import { AdminOpenApiParseError } from "../src/errors.js";
import { parseAdminOpenApiYaml } from "../src/parse-admin-openapi-yaml.js";

describe("parseAdminOpenApiYaml", () => {
  it("wraps YAML syntax errors", () => {
    expect(() => parseAdminOpenApiYaml("foo: [")).toThrow(AdminOpenApiParseError);
    try {
      parseAdminOpenApiYaml("foo: [");
    } catch (e) {
      expect(e).toBeInstanceOf(AdminOpenApiParseError);
      expect((e as AdminOpenApiParseError).code).toBe("invalid_yaml");
    }
  });

  it("rejects null document", () => {
    expect(() => parseAdminOpenApiYaml("null")).toThrow(AdminOpenApiParseError);
  });

  it("rejects array root", () => {
    expect(() => parseAdminOpenApiYaml("- 1\n- 2\n")).toThrow(AdminOpenApiParseError);
  });

  it("rejects number root", () => {
    expect(() => parseAdminOpenApiYaml("42")).toThrow(AdminOpenApiParseError);
  });

  it("rejects empty scalar root", () => {
    expect(() => parseAdminOpenApiYaml("")).toThrow(AdminOpenApiParseError);
  });
});
