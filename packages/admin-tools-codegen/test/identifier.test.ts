import { describe, expect, it } from "vitest";

import { toIdentifierFragment } from "../src/identifier.js";

describe("toIdentifierFragment", () => {
  it("keeps simple identifiers", () => {
    expect(toIdentifierFragment("course_id")).toBe("course_id");
  });

  it("prefixes leading digits", () => {
    expect(toIdentifierFragment("9foo")).toBe("_9foo");
  });

  it("replaces unsafe characters", () => {
    expect(toIdentifierFragment("a-b.c")).toBe("a_b_c");
  });

  it("falls back when sanitization yields empty string", () => {
    expect(toIdentifierFragment("")).toBe("_param");
  });
});
