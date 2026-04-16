---
name: design-package
description: Canonical aggregate contract (design_package.json) for all design agents; single handoff surface to frontend, QA, and design visual acceptance.
---

# Design package (`design_package.json`)

## Role

Define the **one authoritative design delivery bundle** per `surface_id` (screen, flow, or cohesive UI slice): pointers, versions, and workflow status so **`engineering-manager-agent`**, **`frontend-agent`**, **`qa-agent`**, and design agents share the same contract.

## When to use

- **Every** design pipeline run for a registered `tasks/<feature_slug>/<task_slug>/`.
- After **`ui-generator-agent`** completes a Stitch attempt (including **`stitch_workflow`** exports); after each **retry**; when **`design-system-agent`**, **`ui-critic-agent`**, or **`ui-refiner-agent`** updates artifacts.

## Inputs (required)

- **`feature_slug`**, **`task_slug`** (or dedicated design `task_slug` that owns artifacts).
- **Artifact root:** default `tasks/<feature_slug>/<artifact_owner_task_slug>/artifacts/` (EM/delivery names the owner task).

## Outputs (required)

Write or merge **`artifacts/design_package.json`** at the artifact root. All other design outputs are **referenced** from this file (embed only small summaries if needed).

### `design_package.json` schema (version `1`)

| Field | Type | Required | Notes |
|--------|------|----------|--------|
| `kind` | `"design-package"` | yes | Constant. |
| `schema_version` | `1` | yes | Bump only on breaking contract changes. |
| `feature_slug` | string | yes | Kebab-case. |
| `surface_id` | string | yes | Stable id for this UI surface (e.g. `checkout-payment`). |
| `artifact_owner_task_slug` | string | yes | Task that owns `artifacts/`. |
| `status` | string | yes | `draft` \| `exploring` \| `critiquing` \| `refining` \| `tokens_applied` \| `baseline_frozen` \| `superseded`. |
| `stitch` | object | yes | See **Stitch sub-object**. |
| `retry` | object | yes | See **Retry sub-object**. |
| `references` | object | yes | Relative paths from artifact root. |
| `blockers` | string[] | yes | Empty array if none. |
| `acceptance` | object | no | Optional gates for downstream automation. |

**`acceptance` sub-object (optional)**

| Field | Type | Required | Notes |
|--------|------|----------|--------|
| `requires_design_visual_acceptance` | boolean | no | Default `false`. When `true`, **`qa-agent`** must emit `qa_visual_evidence.json` and design must emit `design_visual_acceptance.json` per `design_visual_acceptance.skill.md`. |
| `requires_stitch_fidelity_qa` | boolean | no | Default `false` unless **`stitch.source_of_truth`** is `true`. When `true`, **`qa-agent`** must emit **`artifacts/stitch_fidelity_report.json`** per **`stitch_workflow.skill.md`** + **`.cursor/skills/testing-and-qa-standards/SKILL.md`** §4.2. |

**Stitch sub-object**

| Field | Type | Required | Notes |
|--------|------|----------|--------|
| `project_id` | string | yes | Stitch project id if provided by MCP. |
| `screen_ids` | string[] | yes | Ordered ids. **Default exploration:** typically **one** active id per cycle (retry may replace). **Source-of-truth workflow:** **2–4** entries—**`[0]`** is the **canonical** screen for implementation + primary QA comparison; others are variants/audit. |
| `approved_baseline` | boolean | yes | `true` only when EM/human policy marks the current Stitch reference as the comparison baseline (usually when `status` → `baseline_frozen`). |
| `source_of_truth` | boolean | no | Default `false`. When `true`, Stitch exports under **`design/stitch/`** are mandatory layout input for **`frontend-agent`**; set via **`stitch_workflow.skill.md`**. |
| `export_paths` | object | no | Required when **`source_of_truth`** is `true`: repository-relative paths `{ "meta", "images_dir", "code_dir" }` per **`stitch_workflow.skill.md`**. |
| `screens` | array | no | **Strongly recommended when `source_of_truth` is `true`:** ordered list mirroring `screen_ids`, each `{ "id", "image", "code" }` with **repository-root-relative** paths to the exported **PNG** (or raster) and **HTML** (or code) files. Duplicates `design/stitch/meta.json` screen index for a **single handoff bundle** so **`engineering-manager-agent`** can copy paths into **`task.json`** / EM reports without opening `meta.json`. |

**Retry sub-object**

| Field | Type | Required | Notes |
|--------|------|----------|--------|
| `attempt` | number | yes | Starts at `1`, increments on each Stitch regeneration. |
| `max_attempts` | number | yes | Default `4` unless delivery overrides. |
| `exit_reason` | string \| null | yes | `null` until closed: `accepted` \| `max_attempts` \| `blocked` \| `superseded`. |
| `last_prompt_delta` | string | yes | Short text: what changed vs previous attempt (for audit). |

**`references` sub-object (paths relative to `artifacts/`)**

| Field | Type | Required | Notes |
|--------|------|----------|--------|
| `ui_critique` | string \| null | yes | e.g. `ui_critique.json` — schema per `ui_critique.skill.md`. |
| `design_system` | string \| null | yes | e.g. `design_system.json`. |
| `ui_spec` | string \| null | yes | e.g. `ui_spec.json` — build-oriented spec. |
| `normalized_ui` | string \| null | no | e.g. `ui-normalized.md`. |
| `layout_analysis` | string \| null | no | Optional analysis record. |
| `qa_visual_evidence` | string \| null | no | Filled after implementation per `design_visual_acceptance.skill.md`. |
| `design_visual_acceptance` | string \| null | no | Filled by design after QA evidence exists. |

## Rules

1. **Single writer discipline:** the agent that produces an artifact **updates** `design_package.json` the same turn (generator updates `stitch` + `retry`; refiner sets `references.ui_spec`; etc.).
1b. **Single Stitch project per `feature_slug` (default):** do not introduce a second `stitch.project_id` for the same feature unless **`engineering-manager-agent`** documents supersession (new baseline or spun-off product line). **`ui-generator-agent`** reuses the existing `project_id` from this package or from the prior on-disk `design_package.json` / EM handoff for that feature—see **`stitch_workflow.skill.md`**.
2. **Immutability after `baseline_frozen`:** no agent changes `stitch.screen_ids` or `references.ui_spec` without EM-approved new task or `status: superseded` + new package row (new `surface_id` version suffix).
3. **Relative paths only** inside `references` (portable across clones).
4. **`ui_critique.json` canonical schema** is defined in **`ui_critique.skill.md`** (not duplicated here).

## Anti-patterns

- Multiple competing “sources of truth” for the same surface without `superseded`.
- Embedding full `ui_spec` or screenshots inside `design_package.json` (use references).
- Missing `retry` metadata when Stitch is retried.

## Philosophy alignment

Structure and traceability over ad-hoc markdown-only handoffs.
