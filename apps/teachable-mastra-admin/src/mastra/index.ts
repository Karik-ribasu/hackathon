import "dotenv/config";

import { Mastra } from "@mastra/core/mastra";
import { PinoLogger } from "@mastra/loggers";
import { LibSQLStore } from "@mastra/libsql";
import { DuckDBStore } from "@mastra/duckdb";
import { MastraCompositeStore } from "@mastra/core/storage";
import { Observability, DefaultExporter, CloudExporter, SensitiveDataFilter } from "@mastra/observability";
import { createTeachableAdminAgent } from "./agents/teachable-admin-agent.js";
import { normalizeStudioAgentIdMiddleware } from "./normalize-studio-agent-id-middleware.js";

export const teachableAdminAgent = createTeachableAdminAgent();

export const mastra = new Mastra({
  agents: { teachableAdminAgent },
  server: {
    middleware: normalizeStudioAgentIdMiddleware,
  },
  storage: new MastraCompositeStore({
    id: "composite-storage",
    default: new LibSQLStore({
      id: "mastra-storage",
      url: "file:./mastra.db",
    }),
    domains: {
      observability: await new DuckDBStore().getStore("observability"),
    },
  }),
  logger: new PinoLogger({
    name: "Mastra",
    level: "info",
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: "mastra",
        exporters: [
          new DefaultExporter(),
          new CloudExporter(),
        ],
        spanOutputProcessors: [new SensitiveDataFilter()],
      },
    },
  }),
});
