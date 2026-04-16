import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { deriveDeterministicToolName } from "../src/tool-name.js";
import { parseAdminOpenApiYaml } from "../src/parse-admin-openapi-yaml.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const adminApiPath = join(__dirname, "..", "..", "..", "open-api", "admin-api.yaml");

describe("parseAdminOpenApiYaml — admin-api.yaml", () => {
  it("maps every HTTP operation 1:1 (67 operations) with deterministic tool names", () => {
    const yaml = readFileSync(adminApiPath, "utf8");
    const model = parseAdminOpenApiYaml(yaml);
    expect(model.operations.length).toBe(67);

    const keys = new Set<string>();
    for (const op of model.operations) {
      const k = `${op.method.toUpperCase()} ${op.pathTemplate}`;
      expect(keys.has(k)).toBe(false);
      keys.add(k);
      expect(op.toolName).toBe(deriveDeterministicToolName(op.method, op.pathTemplate));
    }
  });

  it("documents deterministic derivation when operationId is absent", () => {
    const yaml = readFileSync(adminApiPath, "utf8");
    const model = parseAdminOpenApiYaml(yaml);
    const first = model.operations[0];
    expect(first).toBeDefined();
    expect(first?.operationId).toBeUndefined();
    expect(first?.toolNameDerivation.kind).toBe("deterministic");
    if (first?.toolNameDerivation.kind === "deterministic") {
      expect(first.toolNameDerivation.rule.length).toBeGreaterThan(20);
      expect(first.toolNameDerivation.methodUpper).toBe("GET");
    }
  });
});
