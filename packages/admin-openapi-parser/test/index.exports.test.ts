import { describe, expect, it } from "vitest";

import * as PublicApi from "../src/index.js";

describe("package exports", () => {
  it("re-exports parser entry points", () => {
    expect(typeof PublicApi.parseAdminOpenApiYaml).toBe("function");
    expect(typeof PublicApi.buildIntermediateModel).toBe("function");
    expect(PublicApi.DETERMINISTIC_TOOL_NAME_RULE.length).toBeGreaterThan(10);
  });
});
