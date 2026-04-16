---
name: stitch-workflow
description: Deterministic Stitch source-of-truth pipeline — engineering-manager enforced; ui-generator owns MCP + repo exports; design refines without regenerating layout; frontend implements from exports; QA validates structural/visual fidelity vs Stitch.
---

# Stitch workflow (source of truth)

## Role

Make **Stitch** a **mandatory, ordered** step for in-scope UI work—not an optional MCP detour. **`engineering-manager-agent`** enforces this workflow **before** **`frontend-agent`** on applicable tasks. **`ui-generator-agent`** is the **only** agent that calls Stitch MCP for **generation** and **export persistence** into the repository paths below.

## When to use (mandatory)

- **`engineering-manager-agent`:** for **every** assignment whose task title/description/`sector` indicates **new or materially changed user-facing layout** (keywords such as `ui`, `frontend`, `layout`, `screen`, `dashboard`, `design-system` surface delivery, or explicit `architecture_refs` / acceptance naming UI). Attach this skill to the **`ui-generator-agent`** assignment and all downstream design + **`frontend-agent`** + **`qa-agent`** rows for that surface.
- **`ui-generator-agent`:** when the EM payload includes **`stitch_workflow: source_of_truth`** (or equivalent flag in `task.json` / handoff prose).
- **`frontend-agent`:** whenever **`artifacts/design_package.json`** exists for the surface and **`stitch.source_of_truth`** is **`true`** (or exports exist under **`design/stitch/`** for the same `feature_slug`).
- **`qa-agent`:** when **`acceptance.requires_stitch_fidelity_qa`** is **`true`** in **`design_package.json`** **or** EM explicitly requires Stitch parity in the QA assignment.

## Trigger (normative)

| Signal | Action |
|--------|--------|
| Task touches **new/changed layout** in `app/` / `src/` UI | EM **must** run **`stitch_workflow`** steps **before** frontend implementation of that layout. |
| Task is **logic-only** (no visual structure change) | EM **may** skip full export if delivery/architecture documents the exception; still keep **`design_package.json`** consistent. |
| Unclear scope | EM defaults to **run workflow**; bounce to delivery if that would overscope. |

## Machine-readable workflow (contract)

Emit or copy this JSON into EM plans / `task.json` notes when useful; **`steps`** are authoritative prose in this file.

```json
{
  "stitch_workflow": {
    "version": 1,
    "trigger": {
      "condition": "task contains UI/frontend/layout semantics OR delivery registers a new/changed surface",
      "enforced_by": "engineering-manager-agent"
    },
    "steps": [
      {
        "step": 1,
        "name": "resolve_stitch_project",
        "agent": "ui-generator-agent",
        "responsibility": [
          "Via MCP: list/get projects and **prefer reuse**: if **`design_package.json`** or EM handoff already defines **`stitch.project_id`** for this **`feature_slug`**, use that project for all new screens/variants in the feature unless EM explicitly sets **`stitch_project_policy: create_new`** with a written reason (supersession / new product line).",
          "Call **`create_project` only** when there is **no** reusable project id for the feature and EM did not forbid creation.",
          "If replacing **`design/stitch/meta.json`** for a **different** `feature_slug` or `surface_id`, **archive** the previous `meta.json` to **`design/stitch/archive/<ISO8601_Z>_<previous_feature_slug>_meta.json`** (create `archive/` as needed) so older exports remain traceable on disk."
        ],
        "output": { "project_id": "string", "status": "existing | created" }
      },
      {
        "step": 2,
        "name": "generate_screens",
        "agent": "ui-generator-agent",
        "responsibility": [
          "Structured prompt to Stitch (see stitch_generation.skill.md + design_package)",
          "Produce 2–4 realistic, production-like layout variants for the same surface intent (layout diversity required)",
          "Record every screen_id in design_package.json stitch.screen_ids (canonical first)"
        ],
        "constraints": [
          "Avoid generic marketing templates for app/tool surfaces",
          "Reflect real product IA, labels, and density from the brief"
        ],
        "output": { "screen_ids": ["string"], "variants_min": 2 }
      },
      {
        "step": 3,
        "name": "export_artifacts",
        "agent": "ui-generator-agent",
        "responsibility": [
          "For each screen_id: via MCP retrieve image (PNG) and layout/code (HTML or structured payload Stitch returns)"
        ],
        "output": {
          "screens": [{ "id": "string", "image_file": "string", "code_file": "string" }]
        }
      },
      {
        "step": 4,
        "name": "persist_artifacts",
        "agent": "ui-generator-agent",
        "responsibility": [
          "Write files under repository paths below",
          "Write design/stitch/meta.json (see Meta schema)",
          "Update artifacts/design_package.json: stitch.project_id, stitch.screen_ids, stitch.source_of_truth: true, stitch.export_paths, acceptance.requires_stitch_fidelity_qa: true (default for SoT)"
        ],
        "paths": {
          "images": "design/stitch/screens/",
          "code": "design/stitch/code/",
          "meta": "design/stitch/meta.json"
        }
      },
      {
        "step": 5,
        "name": "design_pipeline",
        "agents": ["design-system-agent", "ui-critic-agent", "ui-refiner-agent"],
        "responsibility": [
          "Use exported Stitch code/images + meta.json as primary layout input",
          "Do NOT call Stitch to invent a replacement layout unless EM explicitly escalates a blocked generation",
          "Critique and refine tokens/structure into ui_spec.json; preserve IA from Stitch unless brief contradicts (then escalate)"
        ]
      },
      {
        "step": 6,
        "name": "frontend_implementation",
        "agent": "frontend-agent",
        "responsibility": [
          "Implement UI strictly from ui_spec.json + design_system.json + Stitch export code structure",
          "Canonical Stitch screen is stitch.screen_ids[0]"
        ],
        "forbidden": ["Inventing a new layout not traceable to Stitch/ui_spec", "Ignoring exported section order without documented EM approval"]
      },
      {
        "step": 7,
        "name": "qa_validation",
        "agent": "qa-agent",
        "responsibility": [
          "Structural/visual fidelity vs canonical Stitch PNG + ui_spec (see testing-and-qa-standards SKILL §4.2)",
          "Responsiveness at declared breakpoints",
          "Emit artifacts/stitch_fidelity_report.json (or equivalent path EM assigns) with pass | fail + mismatches[]"
        ],
        "validation_rules": [
          "Major sections/regions from Stitch export appear in implementation",
          "Spacing/typography follow design_system.json within declared tolerance",
          "Required interactive states from acceptance exist"
        ],
        "output": { "status": "pass | fail", "diff_report": "structured mismatches[]" }
      }
    ]
  }
}
```

## Repository layout (canonical)

Paths are **repository-relative** from the workspace root:

| Path | Content |
|------|---------|
| **`design/stitch/screens/`** | PNG (or MCP-provided raster) per exported screen |
| **`design/stitch/code/`** | HTML or structured layout export per screen |
| **`design/stitch/meta.json`** | Index linking `feature_slug`, `surface_id`, `project_id`, `screen_ids`, files on disk |

### `meta.json` schema (version `1`)

| Field | Type | Required |
|-------|------|----------|
| `schema_version` | `1` | yes |
| `feature_slug` | string | yes |
| `surface_id` | string | yes |
| `project_id` | string | yes |
| `exported_at` | string (ISO-8601) | yes |
| `screens` | array | yes |
| `screens[].id` | string | yes |
| `screens[].image` | string (repo-relative path) | yes |
| `screens[].code` | string (repo-relative path) | yes |

## `design_package.json` extensions (SoT)

When this workflow runs, **`ui-generator-agent`** must set:

| Field | Meaning |
|-------|---------|
| **`stitch.source_of_truth`** | `true` — frontend/QA treat Stitch exports as authoritative layout source alongside **`ui_spec.json`**. |
| **`stitch.screen_ids`** | Ordered: **`[0]`** = canonical baseline for implementation and primary QA comparison; additional ids = variants (breadth / audit). |
| **`stitch.screens`** | Array of `{ "id", "image", "code" }` with **repository-root-relative** paths for **every** id in **`screen_ids`** (PNG + HTML/code per screen). Enables **`engineering-manager-agent`** to register **both** image and code paths on **`task.json`** / EM payloads without re-querying MCP. |
| **`stitch.export_paths`** | Object with **`meta`**, **`images_dir`**, **`code_dir`** — repository-relative strings matching the table above. |
| **`acceptance.requires_stitch_fidelity_qa`** | Default **`true`** when **`stitch.source_of_truth`** is **`true`**; QA produces **`stitch_fidelity_report.json`**. |

## Rules

1. **No silent opt-out:** If MCP Stitch is unavailable, **`ui-generator-agent`** reports **`blocked`** with tool errors; EM does not send **`frontend-agent`** to “freehand” the layout without discovery/architecture-documented waiver.
2. **Single generator:** Only **`ui-generator-agent`** performs Stitch **generation** MCP calls; design agents consume exports.
2b. **Single project reference:** Treat **one Stitch `project_id` per `feature_slug`** as the default contract. Additional exploratory “mystery” projects fragment QA and frontend parity—avoid unless EM **`stitch_project_policy: create_new`** is on record.
3. **Traceability:** Every frontend PR-sized slice for a SoT surface must cite **`ui_spec.json`** + **`design/stitch/meta.json`** (or **`design_package.json`**) in EM handoff.
4. **QA vs design:** **`qa-agent`** checks **documented, structural** parity (regions, order, breakpoints, states). **Subjective** “brand feel” remains with **`ui-critic-agent`** / **`design_visual_acceptance.skill.md`** when enabled—both can run; QA stitch fidelity is **not** optional when **`requires_stitch_fidelity_qa`** is **`true`**.

## Anti-patterns

- **Multiple Stitch `project_id` values** for the same **`feature_slug`** without EM-documented **`stitch_project_policy: create_new`** (fragments QA, frontend parity, and registry truth).
- Frontend “sketching” UI before **`design_package.json`** + exports exist for a SoT surface.
- QA **`pass`** without **`stitch_fidelity_report.json`** when **`requires_stitch_fidelity_qa`** is **`true`**.
- Multiple unversioned “mystery” Stitch baselines not reflected in **`meta.json`** / **`design_package.json`**.

## Philosophy alignment

**Design-driven delivery:** Stitch is the **layout camera**; **`ui_spec.json`** is the **build contract**; the app is the **implementation**, not the brainstorming space.
