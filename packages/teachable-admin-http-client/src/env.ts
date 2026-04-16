import { TEACHABLE_ADMIN_BASE_URL_ENV, TEACHABLE_ADMIN_CONSUMER_CUSTOM_ID_ENV } from "./constants.js";
import { TeachableAdminConfigError } from "./errors.js";

export function assertValidTeachableAdminBaseUrl(baseUrl: string): void {
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new TeachableAdminConfigError(
      `Invalid ${TEACHABLE_ADMIN_BASE_URL_ENV}: "${baseUrl}" is not a valid URL. Use an absolute http(s) URL (example: https://developers.teachable.com).`,
    );
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new TeachableAdminConfigError(
      `Invalid ${TEACHABLE_ADMIN_BASE_URL_ENV}: only http and https URLs are allowed (received protocol "${parsed.protocol}").`,
    );
  }
}

export type TeachableAdminClientConfig = {
  baseUrl: string;
  consumerCustomId: string;
};

export function readTeachableAdminClientConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): TeachableAdminClientConfig {
  const baseRaw = env[TEACHABLE_ADMIN_BASE_URL_ENV];
  const consumerRaw = env[TEACHABLE_ADMIN_CONSUMER_CUSTOM_ID_ENV];

  if (baseRaw === undefined || baseRaw === "") {
    throw new TeachableAdminConfigError(
      `Missing required environment variable ${TEACHABLE_ADMIN_BASE_URL_ENV}. Set it to the Teachable Admin API base URL. This client does not apply a silent default.`,
    );
  }

  const baseUrl = baseRaw.trim();
  if (!baseUrl) {
    throw new TeachableAdminConfigError(
      `${TEACHABLE_ADMIN_BASE_URL_ENV} is set but empty after trimming whitespace. Provide a non-empty http(s) base URL.`,
    );
  }
  assertValidTeachableAdminBaseUrl(baseUrl);

  if (consumerRaw === undefined || consumerRaw === "") {
    throw new TeachableAdminConfigError(
      `Missing required environment variable ${TEACHABLE_ADMIN_CONSUMER_CUSTOM_ID_ENV}. It is sent as the X-Consumer-Custom-ID header on every request; set it before calling the Admin API.`,
    );
  }

  const consumerCustomId = consumerRaw.trim();
  if (!consumerCustomId) {
    throw new TeachableAdminConfigError(
      `${TEACHABLE_ADMIN_CONSUMER_CUSTOM_ID_ENV} is set but empty after trimming whitespace. Provide the consumer custom ID value.`,
    );
  }

  return { baseUrl, consumerCustomId };
}
