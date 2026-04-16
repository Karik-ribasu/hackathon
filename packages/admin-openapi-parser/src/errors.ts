export type AdminOpenApiParseErrorCode =
  | "invalid_yaml"
  | "invalid_openapi_document"
  | "invariant_violation";

export class AdminOpenApiParseError extends Error {
  readonly code: AdminOpenApiParseErrorCode;

  constructor(code: AdminOpenApiParseErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AdminOpenApiParseError";
    this.code = code;
  }
}
