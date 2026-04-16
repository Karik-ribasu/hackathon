export const HTTP_METHODS = [
  "get",
  "put",
  "post",
  "delete",
  "options",
  "head",
  "patch",
  "trace",
] as const;

export type HttpMethod = (typeof HTTP_METHODS)[number];

export const HTTP_METHOD_SET: ReadonlySet<string> = new Set(HTTP_METHODS);

/** Stable ordering for codegen and tests (not HTTP semantics). */
export const HTTP_METHOD_SORT_ORDER: Readonly<Record<HttpMethod, number>> = {
  get: 0,
  put: 1,
  post: 2,
  delete: 3,
  options: 4,
  head: 5,
  patch: 6,
  trace: 7,
};

export function isHttpMethod(value: string): value is HttpMethod {
  return HTTP_METHOD_SET.has(value);
}
