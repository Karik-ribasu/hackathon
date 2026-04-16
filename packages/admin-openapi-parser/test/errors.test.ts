import { describe, expect, it } from "vitest";

import { AdminOpenApiParseError } from "../src/errors.js";

describe("AdminOpenApiParseError", () => {
  it("preserves code and name", () => {
    const err = new AdminOpenApiParseError("invalid_yaml", "bad");
    expect(err.name).toBe("AdminOpenApiParseError");
    expect(err.code).toBe("invalid_yaml");
    expect(err.message).toBe("bad");
  });
});
