import path from "node:path";

import type { AdminHttpOperation } from "@teachable/admin-openapi-parser";

export type AdminToolOverrideManifestV1 = {
  readonly version: 1;
  readonly overrides: readonly AdminToolOverrideEntry[];
};

export type AdminToolOverrideEntry = {
  /** Must match `AdminHttpOperation.toolName` for the operation to replace (1:1). */
  readonly toolName: string;
  /**
   * Module path relative to this manifest file (e.g. `./handlers/foo.ts`).
   * TypeScript sources use `.ts`; emitted imports use the NodeNext `.js` specifier.
   */
  readonly importPath: string;
  /** Named export that implements the same factory shape as generated tools. */
  readonly exportName: string;
};

export type ResolvedAdminToolOverride = {
  readonly toolName: string;
  readonly importSpecifier: string;
  readonly exportName: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseAdminToolOverrideManifest(jsonText: string): AdminToolOverrideManifestV1 {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText) as unknown;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Invalid overrides manifest JSON: ${msg}`);
  }
  if (!isRecord(parsed)) {
    throw new Error('Invalid overrides manifest: root must be an object.');
  }
  if (parsed["version"] !== 1) {
    throw new Error(`Invalid overrides manifest: expected version 1, got ${String(parsed["version"])}.`);
  }
  const raw = parsed["overrides"];
  if (!Array.isArray(raw)) {
    throw new Error('Invalid overrides manifest: "overrides" must be an array.');
  }
  const overrides: AdminToolOverrideEntry[] = [];
  for (const item of raw) {
    if (!isRecord(item)) {
      throw new Error('Invalid overrides manifest: each override must be an object.');
    }
    const toolName = item["toolName"];
    const importPathValue = item["importPath"];
    const exportName = item["exportName"];
    if (typeof toolName !== "string" || toolName.length === 0) {
      throw new Error('Invalid overrides manifest: override.toolName must be a non-empty string.');
    }
    if (typeof importPathValue !== "string" || importPathValue.length === 0) {
      throw new Error(`Invalid overrides manifest: override.importPath must be a non-empty string (tool "${toolName}").`);
    }
    if (typeof exportName !== "string" || exportName.length === 0) {
      throw new Error(`Invalid overrides manifest: override.exportName must be a non-empty string (tool "${toolName}").`);
    }
    overrides.push({ toolName, importPath: importPathValue, exportName });
  }
  return { version: 1, overrides };
}

/** Maps a relative path from the generated file to a NodeNext ESM import specifier. Exported for unit tests. */
export function toNodeNextImportSpecifier(relativePosixPath: string): string {
  const withPrefix = relativePosixPath.startsWith(".") ? relativePosixPath : `./${relativePosixPath}`;
  if (withPrefix.endsWith(".ts")) {
    return `${withPrefix.slice(0, -".ts".length)}.js`;
  }
  if (withPrefix.endsWith(".tsx")) {
    return `${withPrefix.slice(0, -".tsx".length)}.js`;
  }
  return withPrefix;
}

/**
 * Validates manifest entries against operations and returns import specifiers relative to the generated file.
 */
export function resolveAdminToolOverrides(args: {
  readonly manifest: AdminToolOverrideManifestV1;
  readonly manifestFilePath: string;
  readonly outputFilePath: string;
  readonly operations: readonly AdminHttpOperation[];
}): { readonly resolved: readonly ResolvedAdminToolOverride[]; readonly overrideToolNames: ReadonlySet<string> } {
  const byName = new Map<string, AdminToolOverrideEntry>();
  for (const entry of args.manifest.overrides) {
    const existing = byName.get(entry.toolName);
    if (existing !== undefined) {
      throw new Error(
        `Overrides manifest has duplicate toolName "${entry.toolName}": ` +
          `conflicting import "${existing.importPath}" vs "${entry.importPath}".`,
      );
    }
    byName.set(entry.toolName, entry);
  }

  const opNames = new Set(args.operations.map((o) => o.toolName));
  for (const entry of args.manifest.overrides) {
    if (!opNames.has(entry.toolName)) {
      throw new Error(
        `Overrides manifest references unknown toolName "${entry.toolName}". ` +
          `It must match an operation in the parsed OpenAPI model (1:1).`,
      );
    }
  }

  const manifestDir = path.dirname(path.resolve(args.manifestFilePath));
  /** Parent of the manifest directory (e.g. `overrides/registry.json` → package root). */
  const packageRoot = path.resolve(manifestDir, "..");
  const outputDir = path.dirname(path.resolve(args.outputFilePath));

  const resolved: ResolvedAdminToolOverride[] = [];
  for (const entry of args.manifest.overrides) {
    const absTarget = path.normalize(path.resolve(manifestDir, entry.importPath));
    const relFromPackage = path.relative(packageRoot, absTarget);
    if (relFromPackage.startsWith("..") || path.isAbsolute(relFromPackage)) {
      throw new Error(
        `Override module for "${entry.toolName}" escapes package root "${packageRoot}" (resolved to "${absTarget}").`,
      );
    }
    const relFromOutput = path.relative(outputDir, absTarget);
    const posix = relFromOutput.split(path.sep).join("/");
    resolved.push({
      toolName: entry.toolName,
      importSpecifier: toNodeNextImportSpecifier(posix),
      exportName: entry.exportName,
    });
  }

  return { resolved, overrideToolNames: new Set(byName.keys()) };
}
