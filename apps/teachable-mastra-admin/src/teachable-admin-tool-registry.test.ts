import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  TEACHABLE_ADMIN_BASE_URL_ENV,
  TEACHABLE_ADMIN_CONSUMER_CUSTOM_ID_ENV,
} from "../../../packages/teachable-admin-http-client/dist/constants.js";
import { parseAdminOpenApiYaml } from "@teachable/admin-openapi-parser";
import { afterEach, describe, expect, it, vi } from "vitest";

import { buildTeachableAdminToolsRecord, createTeachableAdminAgent } from "./mastra/agents/teachable-admin-agent.js";
import { makeAllTeachableAdminTools } from "./mastra/tools/admin-api-tools.js";
import type { TeachableAdminToolsDeps } from "./mastra/tools/admin-api-tools.js";

const dir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(dir, "../../..");
const adminApiYaml = path.join(repoRoot, "open-api", "admin-api.yaml");

const mockHttp: TeachableAdminToolsDeps["http"] = {
  adminRequest: () => Promise.resolve({ status: 204, json: null }),
};

describe("teachable admin tool registry", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("emits one Mastra tool per OpenAPI operation (67) with matching ids", async () => {
    const model = parseAdminOpenApiYaml(await readFile(adminApiYaml, "utf8"));
    const expected = model.operations.map((o) => o.toolName).sort((a, b) => a.localeCompare(b));

    const tools = makeAllTeachableAdminTools({ http: mockHttp });
    const ids = tools.map((t) => t.id).sort((a, b) => a.localeCompare(b));

    expect(ids).toEqual(expected);
    expect(ids).toHaveLength(67);

    const record = buildTeachableAdminToolsRecord(mockHttp);
    expect(Object.keys(record).sort((a, b) => a.localeCompare(b))).toEqual(expected);
  });

  it("wires the admin agent with the full tool record", async () => {
    const agent = createTeachableAdminAgent({ http: mockHttp });
    const tools = await agent.listTools();
    expect(Object.keys(tools).length).toBe(67);
  });

  it("uses createTeachableAdminHttpClientFromEnv when http is not injected", async () => {
    vi.stubEnv(TEACHABLE_ADMIN_BASE_URL_ENV, "https://admin.example.test");
    vi.stubEnv(TEACHABLE_ADMIN_CONSUMER_CUSTOM_ID_ENV, "test-consumer-id");
    const agent = createTeachableAdminAgent();
    const tools = await agent.listTools();
    expect(Object.keys(tools).length).toBe(67);
  });
});
