import { TEACHABLE_ADMIN_CONSUMER_CUSTOM_ID_HEADER } from "./constants.js";
import type { TeachableAdminClientConfig } from "./env.js";
import { assertValidTeachableAdminBaseUrl, readTeachableAdminClientConfigFromEnv } from "./env.js";
import { TeachableAdminConfigError } from "./errors.js";

export type TeachableAdminHttpClientOptions = TeachableAdminClientConfig & {
  fetchImpl?: typeof fetch;
};

export class TeachableAdminHttpClient {
  private readonly normalizedBaseUrl: string;
  private readonly consumerCustomId: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: TeachableAdminHttpClientOptions) {
    const baseUrl = options.baseUrl.trim();
    const consumerCustomId = options.consumerCustomId.trim();

    if (!baseUrl) {
      throw new TeachableAdminConfigError(
        "TeachableAdminHttpClient: baseUrl must be a non-empty string after trimming.",
      );
    }
    if (!consumerCustomId) {
      throw new TeachableAdminConfigError(
        "TeachableAdminHttpClient: consumerCustomId must be non-empty after trimming. Without it the X-Consumer-Custom-ID header cannot be set.",
      );
    }

    assertValidTeachableAdminBaseUrl(baseUrl);

    this.normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
    this.consumerCustomId = consumerCustomId;
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  /**
   * Joins the configured base URL with an API path. The path may be absolute (`/v1/...`) or relative (`v1/...`).
   */
  buildRequestUrl(path: string): string {
    const trimmedPath = path.trim();
    if (!trimmedPath) {
      throw new TeachableAdminConfigError(
        "TeachableAdminHttpClient.buildRequestUrl: path must be a non-empty string after trimming.",
      );
    }

    const relativePath = trimmedPath.replace(/^\/+/, "");
    return `${this.normalizedBaseUrl}/${relativePath}`;
  }

  /**
   * Performs a request with native `fetch`, always attaching `X-Consumer-Custom-ID`.
   * No other authentication headers are injected by this client.
   */
  async adminFetch(path: string, init?: RequestInit): Promise<Response> {
    const url = this.buildRequestUrl(path);
    const headers = new Headers(init?.headers);
    headers.set(TEACHABLE_ADMIN_CONSUMER_CUSTOM_ID_HEADER, this.consumerCustomId);
    return this.fetchImpl(url, { ...init, headers });
  }

  /**
   * High-level request shape consumed by generated Mastra admin tools (method, path, optional query/body).
   * Uses {@link adminFetch} so `X-Consumer-Custom-ID` is always applied.
   */
  async adminRequest(init: {
    readonly method: string;
    readonly path: string;
    readonly query?: Readonly<Record<string, string | undefined>>;
    readonly headers?: Readonly<Record<string, string>>;
    readonly jsonBody?: unknown;
  }): Promise<{ readonly status: number; readonly json: unknown }> {
    let path = init.path.trim();
    if (path.length === 0) {
      throw new TeachableAdminConfigError(
        "TeachableAdminHttpClient.adminRequest: path must be a non-empty string after trimming.",
      );
    }

    const q = init.query;
    if (q !== undefined) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(q)) {
        if (value !== undefined) {
          params.set(key, value);
        }
      }
      const serialized = params.toString();
      if (serialized.length > 0) {
        path = `${path}${path.includes("?") ? "&" : "?"}${serialized}`;
      }
    }

    const headers = new Headers(init.headers as HeadersInit | undefined);
    let body: string | undefined;
    if (init.jsonBody !== undefined) {
      body = JSON.stringify(init.jsonBody);
      if (!headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }
    }

    const response = await this.adminFetch(path, {
      method: init.method,
      headers,
      ...(body !== undefined ? { body } : {}),
    });

    const status = response.status;
    const text = await response.text();
    if (text.length === 0) {
      return { status, json: null };
    }
    try {
      return { status, json: JSON.parse(text) as unknown };
    } catch {
      return { status, json: text };
    }
  }
}

export function createTeachableAdminHttpClientFromEnv(options?: {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}): TeachableAdminHttpClient {
  const cfg = readTeachableAdminClientConfigFromEnv(options?.env);
  if (options?.fetchImpl !== undefined) {
    return new TeachableAdminHttpClient({ ...cfg, fetchImpl: options.fetchImpl });
  }
  return new TeachableAdminHttpClient(cfg);
}
