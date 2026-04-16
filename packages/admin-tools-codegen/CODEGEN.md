# Admin tools codegen

## Stable output path

Generated Mastra tool modules are written to:

`packages/admin-tools-codegen/generated/teachable-admin-tools/admin-api-tools.ts`

This path is stable for imports from a Mastra app or other packages once that app exists under `apps/*`.

## Versioning policy (team default)

- The directory `generated/` is listed in `.gitignore` for this package: **artifacts are produced during development/CI, not committed.**
- If your team prefers reproducible diffs on every OpenAPI change, remove `generated/` from `.gitignore` and commit `admin-api-tools.ts` instead. Keep the same relative path so imports stay stable.

## Regenerate after `open-api/admin-api.yaml` changes

From `packages/admin-tools-codegen`:

```bash
npm run codegen:admin-api
```

This rebuilds the CLI (`dist/`), parses the repo-root `open-api/admin-api.yaml`, applies `overrides/registry.json`, and rewrites the generated file.

## Overrides (1:1, no duplicate tools)

1. Add a hand-written module under `overrides/` that exports a factory with the same shape as generated tools: `(deps: TeachableAdminToolsDeps) => ReturnType<typeof createTool<...>>`.
2. Register it in `overrides/registry.json` with `toolName` exactly equal to the OpenAPI model’s tool name for that operation.
3. Re-run `npm run codegen:admin-api`.

The manifest rejects duplicate `toolName` entries and unknown tool names so overrides cannot introduce extra tools or collisions.

## Coupling to build

- In a consumer package (e.g. a future Mastra app), run `npm run codegen:admin-api` in this package from `prebuild`, or invoke the same CLI with the same `--input` / `--output` / `--overrides` arguments.
