import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts", "src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        /** Thin process entrypoint; covered indirectly via `run-codegen` tests. */
        "src/cli.ts",
        /** Pure re-exports for package consumers. */
        "src/index.ts",
      ],
      thresholds: {
        lines: 100,
      },
    },
  },
});
