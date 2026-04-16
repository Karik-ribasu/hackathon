import { describe, expect, it, vi } from "vitest";

import {
  TEACHABLE_ADMIN_BASE_URL_ENV,
  TEACHABLE_ADMIN_CONSUMER_CUSTOM_ID_ENV,
  TEACHABLE_ADMIN_CONSUMER_CUSTOM_ID_HEADER,
} from "../src/constants.js";
import { TeachableAdminHttpClient, createTeachableAdminHttpClientFromEnv } from "../src/client.js";
import { TeachableAdminConfigError } from "../src/errors.js";

describe("TeachableAdminHttpClient", () => {
  it("buildRequestUrl joins base URL and path and normalizes slashes", () => {
    const client = new TeachableAdminHttpClient({
      baseUrl: "https://example.com/api/",
      consumerCustomId: "c1",
      fetchImpl: vi.fn(),
    });

    expect(client.buildRequestUrl("/v1/users")).toBe("https://example.com/api/v1/users");
    expect(client.buildRequestUrl("v1/users")).toBe("https://example.com/api/v1/users");
  });

  it("throws when buildRequestUrl receives an empty path", () => {
    const client = new TeachableAdminHttpClient({
      baseUrl: "https://example.com",
      consumerCustomId: "c1",
      fetchImpl: vi.fn(),
    });

    expect(() => client.buildRequestUrl("   ")).toThrowError(TeachableAdminConfigError);
  });

  it("adminFetch always sets X-Consumer-Custom-ID and preserves caller headers", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));

    const client = new TeachableAdminHttpClient({
      baseUrl: "https://example.com/root/",
      consumerCustomId: "consumer-xyz",
      fetchImpl: fetchImpl as typeof fetch,
    });

    await client.adminFetch("/courses", {
      headers: { "X-Custom": "1" },
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const callArgs = fetchImpl.mock.calls[0] as [string, RequestInit] | undefined;
    expect(callArgs).toBeDefined();
    if (!callArgs) {
      throw new Error("expected fetch to be called");
    }
    const [url, init] = callArgs;
    expect(url).toBe("https://example.com/root/courses");

    const headers = new Headers(init.headers);
    expect(headers.get(TEACHABLE_ADMIN_CONSUMER_CUSTOM_ID_HEADER)).toBe("consumer-xyz");
    expect(headers.get("X-Custom")).toBe("1");
    expect(headers.get("Authorization")).toBeNull();
  });

  it("overrides a conflicting X-Consumer-Custom-ID value with the configured consumer id", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));

    const client = new TeachableAdminHttpClient({
      baseUrl: "https://example.com",
      consumerCustomId: "canonical",
      fetchImpl: fetchImpl as typeof fetch,
    });

    await client.adminFetch("x", {
      headers: { [TEACHABLE_ADMIN_CONSUMER_CUSTOM_ID_HEADER]: "should-not-win" },
    });

    const callArgs = fetchImpl.mock.calls[0] as [string, RequestInit] | undefined;
    expect(callArgs).toBeDefined();
    if (!callArgs) {
      throw new Error("expected fetch to be called");
    }
    const init = callArgs[1];
    const headers = new Headers(init.headers);
    expect(headers.get(TEACHABLE_ADMIN_CONSUMER_CUSTOM_ID_HEADER)).toBe("canonical");
  });

  it("throws when consumerCustomId is empty (fail-fast before any fetch)", () => {
    expect(
      () =>
        new TeachableAdminHttpClient({
          baseUrl: "https://example.com",
          consumerCustomId: " ",
          fetchImpl: vi.fn(),
        }),
    ).toThrowError(TeachableAdminConfigError);
  });

  it("throws when baseUrl is empty after trimming (fail-fast before any fetch)", () => {
    expect(
      () =>
        new TeachableAdminHttpClient({
          baseUrl: " \t ",
          consumerCustomId: "c1",
          fetchImpl: vi.fn() as typeof fetch,
        }),
    ).toThrowError(TeachableAdminConfigError);
  });

  it("createTeachableAdminHttpClientFromEnv wires env config into an injectable client", () => {
    const fetchImpl = vi.fn();
    const client = createTeachableAdminHttpClientFromEnv({
      env: {
        [TEACHABLE_ADMIN_BASE_URL_ENV]: "https://env-driven.example",
        [TEACHABLE_ADMIN_CONSUMER_CUSTOM_ID_ENV]: "from-env",
      },
      fetchImpl,
    });

    expect(client).toBeInstanceOf(TeachableAdminHttpClient);
  });

  it("createTeachableAdminHttpClientFromEnv uses global fetch when fetchImpl is omitted", () => {
    const originalFetch = globalThis.fetch;
    const stubFetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    globalThis.fetch = stubFetch as typeof fetch;

    try {
      const client = createTeachableAdminHttpClientFromEnv({
        env: {
          [TEACHABLE_ADMIN_BASE_URL_ENV]: "https://example.com",
          [TEACHABLE_ADMIN_CONSUMER_CUSTOM_ID_ENV]: "from-env",
        },
      });

      expect(client).toBeInstanceOf(TeachableAdminHttpClient);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("adminRequest appends query params and parses JSON bodies", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = new TeachableAdminHttpClient({
      baseUrl: "https://example.com",
      consumerCustomId: "c1",
      fetchImpl: fetchImpl as typeof fetch,
    });

    const out = await client.adminRequest({
      method: "GET",
      path: "/v1/items",
      query: { a: "1", skip: undefined, b: "2" },
    });

    expect(out.status).toBe(200);
    expect(out.json).toEqual({ ok: true });
    const callArgs = fetchImpl.mock.calls[0] as [string, RequestInit] | undefined;
    expect(callArgs?.[0]).toBe("https://example.com/v1/items?a=1&b=2");
  });

  it("adminRequest sends JSON body and preserves caller Content-Type when set", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));

    const client = new TeachableAdminHttpClient({
      baseUrl: "https://example.com",
      consumerCustomId: "c1",
      fetchImpl: fetchImpl as typeof fetch,
    });

    await client.adminRequest({
      method: "POST",
      path: "/v1/items",
      jsonBody: { x: 1 },
      headers: { "Content-Type": "application/vnd.api+json" },
    });

    const callArgs = fetchImpl.mock.calls[0] as [string, RequestInit] | undefined;
    expect(callArgs).toBeDefined();
    if (!callArgs) {
      throw new Error("expected fetch");
    }
    const init = callArgs[1];
    const headers = new Headers(init.headers);
    expect(headers.get("Content-Type")).toBe("application/vnd.api+json");
    expect(init.body).toBe(JSON.stringify({ x: 1 }));
  });

  it("adminRequest defaults Content-Type to application/json when jsonBody is set without one", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));

    const client = new TeachableAdminHttpClient({
      baseUrl: "https://example.com",
      consumerCustomId: "c1",
      fetchImpl: fetchImpl as typeof fetch,
    });

    await client.adminRequest({
      method: "POST",
      path: "/v1/items",
      jsonBody: { x: 1 },
    });

    const callArgs = fetchImpl.mock.calls[0] as [string, RequestInit] | undefined;
    if (!callArgs) {
      throw new Error("expected fetch");
    }
    const headers = new Headers(callArgs[1].headers);
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("adminRequest returns null json for empty body", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));

    const client = new TeachableAdminHttpClient({
      baseUrl: "https://example.com",
      consumerCustomId: "c1",
      fetchImpl: fetchImpl as typeof fetch,
    });

    const out = await client.adminRequest({ method: "DELETE", path: "/x" });
    expect(out.status).toBe(204);
    expect(out.json).toBeNull();
  });

  it("adminRequest returns raw text as json when body is not JSON", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("not-json", { status: 500 }));

    const client = new TeachableAdminHttpClient({
      baseUrl: "https://example.com",
      consumerCustomId: "c1",
      fetchImpl: fetchImpl as typeof fetch,
    });

    const out = await client.adminRequest({ method: "GET", path: "/x" });
    expect(out.json).toBe("not-json");
  });

  it("adminRequest merges existing query string with appended params", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));

    const client = new TeachableAdminHttpClient({
      baseUrl: "https://example.com",
      consumerCustomId: "c1",
      fetchImpl: fetchImpl as typeof fetch,
    });

    await client.adminRequest({
      method: "GET",
      path: "/x?k=1",
      query: { y: "2" },
    });

    const callArgs = fetchImpl.mock.calls[0] as [string, RequestInit] | undefined;
    expect(callArgs?.[0]).toBe("https://example.com/x?k=1&y=2");
  });

  it("adminRequest throws on empty path", async () => {
    const client = new TeachableAdminHttpClient({
      baseUrl: "https://example.com",
      consumerCustomId: "c1",
      fetchImpl: vi.fn() as typeof fetch,
    });

    await expect(client.adminRequest({ method: "GET", path: "   " })).rejects.toThrowError(
      TeachableAdminConfigError,
    );
  });
});
