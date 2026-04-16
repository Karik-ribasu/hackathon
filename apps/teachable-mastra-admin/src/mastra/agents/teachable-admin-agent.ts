import { Agent } from "@mastra/core/agent";
import { createTeachableAdminHttpClientFromEnv } from "../../../../../packages/teachable-admin-http-client/dist/index.js";
import { makeAllTeachableAdminTools } from "../tools/admin-api-tools.js";
import type { TeachableAdminToolsDeps } from "../tools/admin-api-tools.js";

export function buildTeachableAdminToolsRecord(http: TeachableAdminToolsDeps["http"]) {
  const tools = makeAllTeachableAdminTools({ http });
  return Object.fromEntries(tools.map((t) => [t.id, t])) as Record<string, (typeof tools)[number]>;
}

export function createTeachableAdminAgent(deps?: { readonly http?: TeachableAdminToolsDeps["http"] }) {
  const http = deps?.http ?? createTeachableAdminHttpClientFromEnv();
  return new Agent({
    id: "teachable-admin-agent",
    name: "Teachable Admin Assistant",
    instructions: `
You are the Teachable Admin API assistant. Each tool maps 1:1 to an HTTP operation from the Teachable Admin OpenAPI specification.
Use the appropriate tool for the user's goal. Require clear identifiers (course id, user id, etc.) before mutating data.
Explain errors returned by tools in plain language; never invent data that a tool did not return.
`,
    model: "openai/gpt-5-mini",
    tools: buildTeachableAdminToolsRecord(http),
  });
}
