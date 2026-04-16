import { describe, expect, it } from "vitest";

import { buildIntermediateModel } from "../src/build-intermediate-model.js";
import { AdminOpenApiParseError } from "../src/errors.js";

const minimalOperation = {
  responses: {
    "200": { description: "ok" },
  },
};

function docWithPaths(paths: Record<string, unknown>): Record<string, unknown> {
  return {
    openapi: "3.0.3",
    info: { title: "t", version: "1" },
    paths,
  };
}

describe("buildIntermediateModel — invariants", () => {
  it("rejects non-3.x openapi", () => {
    expect(() =>
      buildIntermediateModel({
        openapi: "2.0",
        info: {},
        paths: {},
      }),
    ).toThrow(AdminOpenApiParseError);
  });

  it("rejects non-string openapi field", () => {
    expect(() =>
      buildIntermediateModel({
        openapi: 3,
        info: {},
        paths: {},
      }),
    ).toThrow(AdminOpenApiParseError);
  });

  it("rejects non-object info", () => {
    expect(() =>
      buildIntermediateModel({
        openapi: "3.0.0",
        info: [],
        paths: {},
      }),
    ).toThrow(AdminOpenApiParseError);
  });

  it("rejects non-object paths", () => {
    expect(() =>
      buildIntermediateModel({
        openapi: "3.0.0",
        info: {},
        paths: [],
      }),
    ).toThrow(AdminOpenApiParseError);
  });

  it("rejects servers when not an array", () => {
    expect(() =>
      buildIntermediateModel({
        openapi: "3.0.0",
        info: {},
        paths: {},
        servers: {},
      }),
    ).toThrow(AdminOpenApiParseError);
  });

  it("rejects invalid server item", () => {
    expect(() =>
      buildIntermediateModel({
        openapi: "3.0.0",
        info: {},
        paths: {},
        servers: [null],
      }),
    ).toThrow(AdminOpenApiParseError);
  });

  it("rejects path $ref", () => {
    expect(() =>
      buildIntermediateModel(
        docWithPaths({
          "/a": { $ref: "#/paths/foo" },
        }),
      ),
    ).toThrow(AdminOpenApiParseError);
  });

  it("rejects unknown path item keys", () => {
    expect(() =>
      buildIntermediateModel(
        docWithPaths({
          "/a": { get: minimalOperation, foo: 1 },
        }),
      ),
    ).toThrow(AdminOpenApiParseError);
  });

  it("allows x- extension keys on path item", () => {
    const m = buildIntermediateModel(
      docWithPaths({
        "/a": { get: minimalOperation, "x-foo": 1 },
      }),
    );
    expect(m.operations).toHaveLength(1);
  });

  it("rejects unknown operation keys", () => {
    expect(() =>
      buildIntermediateModel(
        docWithPaths({
          "/a": { get: { ...minimalOperation, foo: 1 } },
        }),
      ),
    ).toThrow(AdminOpenApiParseError);
  });

  it("allows x- keys on operation", () => {
    const m = buildIntermediateModel(
      docWithPaths({
        "/a": { get: { ...minimalOperation, "x-bar": true } },
      }),
    );
    expect(m.operations[0]?.toolName).toBe("GET_a");
  });

  it("rejects path-level parameters when not array", () => {
    expect(() =>
      buildIntermediateModel(
        docWithPaths({
          "/a": { parameters: {}, get: minimalOperation },
        }),
      ),
    ).toThrow(AdminOpenApiParseError);
  });

  it("rejects operation parameters when not array", () => {
    expect(() =>
      buildIntermediateModel(
        docWithPaths({
          "/a": { get: { ...minimalOperation, parameters: {} } },
        }),
      ),
    ).toThrow(AdminOpenApiParseError);
  });

  it("rejects malformed parameter object", () => {
    expect(() =>
      buildIntermediateModel(
        docWithPaths({
          "/a": {
            get: {
              ...minimalOperation,
              parameters: [null],
            },
          },
        }),
      ),
    ).toThrow(AdminOpenApiParseError);
  });

  it("rejects parameter without name", () => {
    expect(() =>
      buildIntermediateModel(
        docWithPaths({
          "/a": {
            get: {
              ...minimalOperation,
              parameters: [{ in: "query" }],
            },
          },
        }),
      ),
    ).toThrow(AdminOpenApiParseError);
  });

  it("rejects empty parameter name", () => {
    expect(() =>
      buildIntermediateModel(
        docWithPaths({
          "/a": {
            get: {
              ...minimalOperation,
              parameters: [{ name: "", in: "query" }],
            },
          },
        }),
      ),
    ).toThrow(AdminOpenApiParseError);
  });

  it("rejects parameter without in", () => {
    expect(() =>
      buildIntermediateModel(
        docWithPaths({
          "/a": {
            get: {
              ...minimalOperation,
              parameters: [{ name: "q" }],
            },
          },
        }),
      ),
    ).toThrow(AdminOpenApiParseError);
  });

  it("merges path and operation parameters with operation winning", () => {
    const m = buildIntermediateModel(
      docWithPaths({
        "/a": {
          parameters: [{ name: "q", in: "query", description: "path" }],
          get: {
            ...minimalOperation,
            parameters: [{ name: "q", in: "query", description: "op" }],
          },
        },
      }),
    );
    expect(m.operations[0]?.parameters).toHaveLength(1);
    expect(m.operations[0]?.parameters[0]?.["description"]).toBe("op");
  });

  it("rejects non-string summary", () => {
    expect(() =>
      buildIntermediateModel(
        docWithPaths({
          "/a": { get: { ...minimalOperation, summary: 1 } },
        }),
      ),
    ).toThrow(AdminOpenApiParseError);
  });

  it("rejects non-string description", () => {
    expect(() =>
      buildIntermediateModel(
        docWithPaths({
          "/a": { get: { ...minimalOperation, description: 1 } },
        }),
      ),
    ).toThrow(AdminOpenApiParseError);
  });

  it("rejects non-array tags", () => {
    expect(() =>
      buildIntermediateModel(
        docWithPaths({
          "/a": { get: { ...minimalOperation, tags: {} } },
        }),
      ),
    ).toThrow(AdminOpenApiParseError);
  });

  it("rejects tags with non-string entry", () => {
    expect(() =>
      buildIntermediateModel(
        docWithPaths({
          "/a": { get: { ...minimalOperation, tags: [1] } },
        }),
      ),
    ).toThrow(AdminOpenApiParseError);
  });

  it("rejects requestBody when not object", () => {
    expect(() =>
      buildIntermediateModel(
        docWithPaths({
          "/a": { get: { ...minimalOperation, requestBody: [] } },
        }),
      ),
    ).toThrow(AdminOpenApiParseError);
  });

  it("rejects missing responses", () => {
    expect(() =>
      buildIntermediateModel(
        docWithPaths({
          "/a": { get: {} },
        }),
      ),
    ).toThrow(AdminOpenApiParseError);
  });

  it("rejects non-object responses", () => {
    expect(() =>
      buildIntermediateModel(
        docWithPaths({
          "/a": { get: { responses: [] } },
        }),
      ),
    ).toThrow(AdminOpenApiParseError);
  });

  it("rejects empty responses", () => {
    expect(() =>
      buildIntermediateModel(
        docWithPaths({
          "/a": { get: { responses: {} } },
        }),
      ),
    ).toThrow(AdminOpenApiParseError);
  });

  it("rejects duplicate tool name when operationId collides with another operation's deterministic name", () => {
    expect(() =>
      buildIntermediateModel(
        docWithPaths({
          "/x": { get: { ...minimalOperation, operationId: "GET_y" } },
          "/y": { get: minimalOperation },
        }),
      ),
    ).toThrow(/Duplicate tool name/iu);
  });

  it("rejects duplicate operationId", () => {
    expect(() =>
      buildIntermediateModel(
        docWithPaths({
          "/a": { get: { ...minimalOperation, operationId: "same" } },
          "/b": { get: { ...minimalOperation, operationId: "same" } },
        }),
      ),
    ).toThrow(/Duplicate operationId/iu);
  });

  it("rejects empty operationId string", () => {
    expect(() =>
      buildIntermediateModel(
        docWithPaths({
          "/a": { get: { ...minimalOperation, operationId: "" } },
        }),
      ),
    ).toThrow(AdminOpenApiParseError);
  });

  it("rejects whitespace-only operationId", () => {
    expect(() =>
      buildIntermediateModel(
        docWithPaths({
          "/a": { get: { ...minimalOperation, operationId: "   " } },
        }),
      ),
    ).toThrow(AdminOpenApiParseError);
  });

  it("rejects non-string operationId", () => {
    expect(() =>
      buildIntermediateModel(
        docWithPaths({
          "/a": { get: { ...minimalOperation, operationId: 1 } },
        }),
      ),
    ).toThrow(AdminOpenApiParseError);
  });

  it("rejects non-object operation", () => {
    expect(() =>
      buildIntermediateModel(
        docWithPaths({
          "/a": { get: [] },
        }),
      ),
    ).toThrow(AdminOpenApiParseError);
  });

  it("uses operationId for tool name when present", () => {
    const m = buildIntermediateModel(
      docWithPaths({
        "/a": { get: { ...minimalOperation, operationId: "myOp" } },
      }),
    );
    expect(m.operations[0]?.toolName).toBe("myOp");
    expect(m.operations[0]?.toolNameDerivation.kind).toBe("operationId");
  });
});
