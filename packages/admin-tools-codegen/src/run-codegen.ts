import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

import { parseAdminOpenApiYaml } from "@teachable/admin-openapi-parser";

import { parseAdminToolOverrideManifest, resolveAdminToolOverrides } from "./admin-tool-overrides.js";
import { emitAdminToolsTypeScript } from "./emit-admin-tools-module.js";

export async function runCodegenCli(argv: readonly string[]): Promise<void> {
  const { values } = parseArgs({
    args: argv,
    options: {
      input: { type: "string", short: "i" },
      output: { type: "string", short: "o" },
      overrides: { type: "string" },
    },
  });

  const inputPath = values.input;
  const outputPath = values.output;
  if (inputPath === undefined || outputPath === undefined) {
    throw new Error(
      "Usage: admin-tools-codegen --input <admin-api.yaml> --output <out.ts> [--overrides <registry.json>]",
    );
  }

  const yamlText = await readFile(inputPath, "utf8");
  const model = parseAdminOpenApiYaml(yamlText);

  const overridesArg = values.overrides;
  const resolvedOverrides =
    overridesArg === undefined ?
      undefined
    : resolveAdminToolOverrides({
        manifest: parseAdminToolOverrideManifest(await readFile(overridesArg, "utf8")),
        manifestFilePath: path.resolve(overridesArg),
        outputFilePath: path.resolve(outputPath),
        operations: model.operations,
      }).resolved;

  const ts = emitAdminToolsTypeScript(
    model,
    resolvedOverrides === undefined || resolvedOverrides.length === 0 ?
      undefined
    : { overrides: resolvedOverrides },
  );
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${ts}\n`, "utf8");
}
