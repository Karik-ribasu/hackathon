import os from "node:os";
import path from "node:path";

import type { AdminHttpOperation, AdminOpenApiIntermediateModel } from "@teachable/admin-openapi-parser";
import { describe, expect, it } from "vitest";

import {
  parseAdminToolOverrideManifest,
  resolveAdminToolOverrides,
  toNodeNextImportSpecifier,
} from "../src/admin-tool-overrides.js";

function op(partial: AdminHttpOperation): AdminHttpOperation {
  return partial;
}

const miniModel: AdminOpenApiIntermediateModel = {
  openapi: "3.0.0",
  info: { title: "t", version: "1" },
  servers: [],
  operations: [
    op({
      method: "get",
      pathTemplate: "/items",
      operationId: "listItems",
      toolName: "listItems",
      toolNameDerivation: { kind: "operationId" },
      tags: [],
      summary: "List",
      description: undefined,
      parameters: [],
      requestBody: undefined,
      responses: {
        "200": { description: "ok", content: { "application/json": { schema: {} } } },
      },
    }),
    op({
      method: "get",
      pathTemplate: "/other",
      operationId: "otherOp",
      toolName: "otherOp",
      toolNameDerivation: { kind: "operationId" },
      tags: [],
      summary: "Other",
      description: undefined,
      parameters: [],
      requestBody: undefined,
      responses: {
        "200": { description: "ok", content: { "application/json": { schema: {} } } },
      },
    }),
  ],
};

describe("parseAdminToolOverrideManifest", () => {
  it("parses a valid v1 manifest", () => {
    const m = parseAdminToolOverrideManifest(
      JSON.stringify({
        version: 1,
        overrides: [{ toolName: "listItems", importPath: "./a.ts", exportName: "x" }],
      }),
    );
    expect(m.version).toBe(1);
    expect(m.overrides).toHaveLength(1);
    expect(m.overrides[0]?.toolName).toBe("listItems");
  });

  it("rejects invalid JSON with a clear error", () => {
    expect(() => parseAdminToolOverrideManifest("{")).toThrow(/Invalid overrides manifest JSON/u);
  });

  it("rejects non-object root", () => {
    expect(() => parseAdminToolOverrideManifest("[]")).toThrow(/root must be an object/u);
  });

  it("rejects wrong version", () => {
    expect(() => parseAdminToolOverrideManifest(JSON.stringify({ version: 2, overrides: [] }))).toThrow(
      /expected version 1/u,
    );
  });

  it("rejects non-array overrides", () => {
    expect(() => parseAdminToolOverrideManifest(JSON.stringify({ version: 1, overrides: {} }))).toThrow(
      /"overrides" must be an array/u,
    );
  });

  it("rejects bad override rows", () => {
    expect(() =>
      parseAdminToolOverrideManifest(JSON.stringify({ version: 1, overrides: [{ toolName: "" }] })),
    ).toThrow(/toolName/u);
  });

  it("rejects empty importPath with tool context", () => {
    expect(() =>
      parseAdminToolOverrideManifest(
        JSON.stringify({ version: 1, overrides: [{ toolName: "listItems", importPath: "", exportName: "x" }] }),
      ),
    ).toThrow(/importPath/u);
  });

  it("rejects empty exportName with tool context", () => {
    expect(() =>
      parseAdminToolOverrideManifest(
        JSON.stringify({
          version: 1,
          overrides: [{ toolName: "listItems", importPath: "./a.ts", exportName: "" }],
        }),
      ),
    ).toThrow(/exportName/u);
  });

  it("rejects non-object override rows", () => {
    expect(() =>
      parseAdminToolOverrideManifest(JSON.stringify({ version: 1, overrides: [null] })),
    ).toThrow(/must be an object/u);
  });
});

describe("toNodeNextImportSpecifier", () => {
  it("prefixes relative paths that omit ./", () => {
    expect(toNodeNextImportSpecifier("handlers/foo.ts")).toBe("./handlers/foo.js");
  });

  it("rewrites .tsx to .js", () => {
    expect(toNodeNextImportSpecifier("./widget.tsx")).toBe("./widget.js");
  });

  it("leaves extension-less specifiers untouched aside from ./", () => {
    expect(toNodeNextImportSpecifier("pkg")).toBe("./pkg");
  });
});

describe("resolveAdminToolOverrides", () => {
  it("resolves import specifiers relative to the generated file", () => {
    const manifest = parseAdminToolOverrideManifest(
      JSON.stringify({
        version: 1,
        overrides: [{ toolName: "listItems", importPath: "./handlers/list.ts", exportName: "adminTool_listItems" }],
      }),
    );
    const base = path.join(os.tmpdir(), "teachable-pkg-root");
    const manifestPath = path.join(base, "overrides", "registry.json");
    const outputPath = path.join(base, "generated", "teachable-admin-tools", "admin-api-tools.ts");
    const { resolved, overrideToolNames } = resolveAdminToolOverrides({
      manifest,
      manifestFilePath: manifestPath,
      outputFilePath: outputPath,
      operations: miniModel.operations,
    });
    expect(overrideToolNames.has("listItems")).toBe(true);
    expect(resolved).toEqual([
      {
        toolName: "listItems",
        importSpecifier: "../../overrides/handlers/list.js",
        exportName: "adminTool_listItems",
      },
    ]);
  });

  it("fails fast on duplicate toolName entries in the manifest", () => {
    const manifest = parseAdminToolOverrideManifest(
      JSON.stringify({
        version: 1,
        overrides: [
          { toolName: "listItems", importPath: "./a.ts", exportName: "x" },
          { toolName: "listItems", importPath: "./b.ts", exportName: "y" },
        ],
      }),
    );
    expect(() =>
      resolveAdminToolOverrides({
        manifest,
        manifestFilePath: "/x/registry.json",
        outputFilePath: "/x/gen/out.ts",
        operations: miniModel.operations,
      }),
    ).toThrow(/duplicate toolName "listItems"/u);
  });

  it("fails when manifest references an unknown toolName", () => {
    const manifest = parseAdminToolOverrideManifest(
      JSON.stringify({
        version: 1,
        overrides: [{ toolName: "missingTool", importPath: "./a.ts", exportName: "x" }],
      }),
    );
    expect(() =>
      resolveAdminToolOverrides({
        manifest,
        manifestFilePath: "/x/registry.json",
        outputFilePath: "/x/gen/out.ts",
        operations: miniModel.operations,
      }),
    ).toThrow(/unknown toolName "missingTool"/u);
  });

  it("rejects absolute import paths that resolve outside the package root", () => {
    const importPath = process.platform === "win32" ? "D:\\hand.ts" : "/tmp/teachable-override-abs.ts";
    const manifest = parseAdminToolOverrideManifest(
      JSON.stringify({
        version: 1,
        overrides: [{ toolName: "listItems", importPath, exportName: "x" }],
      }),
    );
    const pkg = path.join(os.tmpdir(), "teachable-codegen-pkg-root");
    const manifestPath = path.join(pkg, "overrides", "registry.json");
    expect(() =>
      resolveAdminToolOverrides({
        manifest,
        manifestFilePath: manifestPath,
        outputFilePath: path.join(pkg, "generated", "out.ts"),
        operations: miniModel.operations,
      }),
    ).toThrow(/escapes package root/u);
  });

  it("rejects override modules outside the package root (sibling directories are forbidden)", () => {
    const manifest = parseAdminToolOverrideManifest(
      JSON.stringify({
        version: 1,
        overrides: [{ toolName: "listItems", importPath: "../../other-root/hand.ts", exportName: "x" }],
      }),
    );
    const pkg = path.join(os.tmpdir(), "teachable-codegen-pkg-a");
    const manifestPath = path.join(pkg, "overrides", "registry.json");
    expect(() =>
      resolveAdminToolOverrides({
        manifest,
        manifestFilePath: manifestPath,
        outputFilePath: path.join(pkg, "generated", "out.ts"),
        operations: miniModel.operations,
      }),
    ).toThrow(/escapes package root/u);
  });
});
