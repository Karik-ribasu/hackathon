#!/usr/bin/env node
import process from "node:process";

import { runCodegenCli } from "./run-codegen.js";

void runCodegenCli(process.argv.slice(2)).catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
