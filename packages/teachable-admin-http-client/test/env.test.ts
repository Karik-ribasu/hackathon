import { describe, expect, it } from "vitest";

import {
  TEACHABLE_ADMIN_BASE_URL_ENV,
  TEACHABLE_ADMIN_CONSUMER_CUSTOM_ID_ENV,
} from "../src/constants.js";
import { readTeachableAdminClientConfigFromEnv } from "../src/env.js";
import { TeachableAdminConfigError } from "../src/errors.js";

describe("readTeachableAdminClientConfigFromEnv", () => {
  it("throws an actionable error when the base URL env var is missing", () => {
    expect(() =>
      readTeachableAdminClientConfigFromEnv({
        [TEACHABLE_ADMIN_CONSUMER_CUSTOM_ID_ENV]: "consumer-1",
      }),
    ).toThrowError(TeachableAdminConfigError);

    expect(() =>
      readTeachableAdminClientConfigFromEnv({
        [TEACHABLE_ADMIN_CONSUMER_CUSTOM_ID_ENV]: "consumer-1",
      }),
    ).toThrowError(new RegExp(TEACHABLE_ADMIN_BASE_URL_ENV));
  });

  it("throws when the base URL env var is only whitespace", () => {
    expect(() =>
      readTeachableAdminClientConfigFromEnv({
        [TEACHABLE_ADMIN_BASE_URL_ENV]: "   ",
        [TEACHABLE_ADMIN_CONSUMER_CUSTOM_ID_ENV]: "consumer-1",
      }),
    ).toThrowError(TeachableAdminConfigError);
  });

  it("throws when the base URL is not a valid absolute URL", () => {
    expect(() =>
      readTeachableAdminClientConfigFromEnv({
        [TEACHABLE_ADMIN_BASE_URL_ENV]: "not-a-url",
        [TEACHABLE_ADMIN_CONSUMER_CUSTOM_ID_ENV]: "consumer-1",
      }),
    ).toThrowError(TeachableAdminConfigError);
  });

  it("throws when the base URL uses a non-http(s) scheme", () => {
    expect(() =>
      readTeachableAdminClientConfigFromEnv({
        [TEACHABLE_ADMIN_BASE_URL_ENV]: "ftp://example.com",
        [TEACHABLE_ADMIN_CONSUMER_CUSTOM_ID_ENV]: "consumer-1",
      }),
    ).toThrowError(TeachableAdminConfigError);
  });

  it("throws an actionable error when the consumer id env var is missing", () => {
    expect(() =>
      readTeachableAdminClientConfigFromEnv({
        [TEACHABLE_ADMIN_BASE_URL_ENV]: "https://example.com",
      }),
    ).toThrowError(TeachableAdminConfigError);

    expect(() =>
      readTeachableAdminClientConfigFromEnv({
        [TEACHABLE_ADMIN_BASE_URL_ENV]: "https://example.com",
      }),
    ).toThrowError(/X-Consumer-Custom-ID/);
  });

  it("throws when the consumer id env var is only whitespace", () => {
    expect(() =>
      readTeachableAdminClientConfigFromEnv({
        [TEACHABLE_ADMIN_BASE_URL_ENV]: "https://example.com",
        [TEACHABLE_ADMIN_CONSUMER_CUSTOM_ID_ENV]: " \t ",
      }),
    ).toThrowError(TeachableAdminConfigError);
  });

  it("returns trimmed config when env vars are valid", () => {
    expect(
      readTeachableAdminClientConfigFromEnv({
        [TEACHABLE_ADMIN_BASE_URL_ENV]: "  https://example.com/path/  ",
        [TEACHABLE_ADMIN_CONSUMER_CUSTOM_ID_ENV]: "  my-id  ",
      }),
    ).toEqual({
      baseUrl: "https://example.com/path/",
      consumerCustomId: "my-id",
    });
  });
});
