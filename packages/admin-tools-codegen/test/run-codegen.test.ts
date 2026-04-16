import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runCodegenCli } from "../src/run-codegen.js";

describe("runCodegenCli", () => {
  it("writes emitted tools from yaml", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "admin-tools-codegen-"));
    const input = path.join(dir, "api.yaml");
    const output = path.join(dir, "out", "tools.ts");
    await writeFile(
      input,
      `
openapi: 3.0.0
info:
  title: Mini
  version: "1"
paths:
  /items:
    get:
      summary: List
      responses:
        "200":
          description: ok
          content:
            application/json:
              schema:
                type: object
`,
      "utf8",
    );

    await runCodegenCli(["--input", input, "--output", output]);
    const text = await readFile(output, "utf8");
    expect(text).toContain("createTool(");
    expect(text).toContain("makeAllTeachableAdminTools");
    await rm(dir, { recursive: true, force: true });
  });

  it("fails when args missing", async () => {
    await expect(runCodegenCli([])).rejects.toThrow(/Usage: admin-tools-codegen/u);
  });

  it("applies overrides from a manifest without duplicating generated tool bodies", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "admin-tools-codegen-"));
    const input = path.join(dir, "api.yaml");
    const output = path.join(dir, "generated", "teachable-admin-tools", "admin-api-tools.ts");
    const registry = path.join(dir, "overrides", "registry.json");
    const handWritten = path.join(dir, "overrides", "hand.ts");
    await writeFile(
      input,
      `
openapi: 3.0.0
info:
  title: Mini
  version: "1"
paths:
  /items:
    get:
      operationId: listItems
      summary: List
      responses:
        "200":
          description: ok
          content:
            application/json:
              schema:
                type: object
`,
      "utf8",
    );
    await mkdir(path.join(dir, "overrides"), { recursive: true });
    await writeFile(handWritten, `export function adminTool_handWritten() { return null as never; }\n`, "utf8");
    await writeFile(
      registry,
      JSON.stringify({
        version: 1,
        overrides: [
          { toolName: "listItems", importPath: "./hand.ts", exportName: "adminTool_handWritten" },
        ],
      }),
      "utf8",
    );

    await runCodegenCli(["--input", input, "--output", output, "--overrides", registry]);
    const text = await readFile(output, "utf8");
    expect(text).toContain("import { adminTool_handWritten as _ov_listItems }");
    expect(text).toContain("return _ov_listItems(deps);");
    expect(text).not.toContain('id: "listItems"');
    await rm(dir, { recursive: true, force: true });
  });

  it("fails with a clear error when the overrides manifest contains duplicate tool names", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "admin-tools-codegen-"));
    const input = path.join(dir, "api.yaml");
    const output = path.join(dir, "generated", "teachable-admin-tools", "admin-api-tools.ts");
    const registry = path.join(dir, "overrides", "registry.json");
    await writeFile(
      input,
      `
openapi: 3.0.0
info:
  title: Mini
  version: "1"
paths:
  /items:
    get:
      operationId: listItems
      summary: List
      responses:
        "200":
          description: ok
          content:
            application/json:
              schema:
                type: object
`,
      "utf8",
    );
    await mkdir(path.join(dir, "overrides"), { recursive: true });
    await writeFile(
      registry,
      JSON.stringify({
        version: 1,
        overrides: [
          { toolName: "listItems", importPath: "./a.ts", exportName: "x" },
          { toolName: "listItems", importPath: "./b.ts", exportName: "y" },
        ],
      }),
      "utf8",
    );

    await expect(runCodegenCli(["--input", input, "--output", output, "--overrides", registry])).rejects.toThrow(
      /duplicate toolName "listItems"/u,
    );
    await rm(dir, { recursive: true, force: true });
  });
});
