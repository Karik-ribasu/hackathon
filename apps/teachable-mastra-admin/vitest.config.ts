import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/mastra/agents/**/*.ts"],
      exclude: ["**/*.test.ts"],
      thresholds: {
        lines: 100,
      },
    },
  },
});
