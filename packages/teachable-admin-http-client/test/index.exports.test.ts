import { describe, expect, it } from "vitest";

import * as PublicApi from "../src/index.js";

describe("package exports", () => {
  it("exports the HTTP client, env reader, and configuration constants", () => {
    expect(PublicApi.TeachableAdminHttpClient).toBeTypeOf("function");
    expect(PublicApi.createTeachableAdminHttpClientFromEnv).toBeTypeOf("function");
    expect(PublicApi.readTeachableAdminClientConfigFromEnv).toBeTypeOf("function");
    expect(PublicApi.TEACHABLE_ADMIN_BASE_URL_ENV).toBeTruthy();
    expect(PublicApi.TEACHABLE_ADMIN_CONSUMER_CUSTOM_ID_ENV).toBeTruthy();
    expect(PublicApi.TEACHABLE_ADMIN_CONSUMER_CUSTOM_ID_HEADER).toBeTruthy();
  });
});
