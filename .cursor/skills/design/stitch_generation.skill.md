---
name: stitch-generation
description: MCP Stitch layout generation for ui-generator-agent — default one variation per attempt with bounded retry; source-of-truth batch mode delegated to stitch_workflow.skill.md.
---

# Stitch generation (MCP Stitch)

## Role

Produce Stitch screen layouts using **MCP Stitch only**.

- **Default:** **one** new/replaced exploration screen per **attempt** for a stated surface. **Variation across time** uses the **retry loop** driven by critique/refinement (see `design_package.skill.md` → `retry`), not parallel variants in one pass.
- **Source-of-truth (`stitch_workflow`):** when **`engineering-manager-agent`** assigns SoT, follow **`.cursor/skills/design/stitch_workflow.skill.md`** instead for **2–4** variants, exports, and **`design/stitch/`** persistence in that assignment—this skill still governs **prompt quality**, **anti-generic** rules, and **MCP schema** discipline.

## When to use

- **`ui-generator-agent`** at the start of UI exploration for a screen, flow, or component set, and on **each retry** after structured feedback.
- When the brief is visual/layout-first and needs a **Stitch-backed baseline** for downstream `ui_spec` and visual acceptance.

## Inputs (required)

- **Product context:** user/job, primary task, success criteria, constraints (brand, density, accessibility level).
- **Content inventory:** real labels, representative data counts, empty/error states needed (as copy placeholders, not backend contracts).
- **Viewport targets:** at minimum mobile + desktop widths from `responsiveness_rules.skill.md`.
- **Non-goals:** what must not appear (e.g., charts, social feed) to prevent default “dashboard soup.”
- **On retry:** latest `ui_critique.json` (per `ui_critique.skill.md`) and/or EM-authored **`last_prompt_delta`** constraints.

## Outputs (required)

- **Single active layout (this attempt):**
  - **Pattern tag:** one of `dashboard` | `split` | `cards` | `feed` (pick the best fit for the brief; retries may change tag if critique demands).
  - **Layout thesis:** one sentence on why this pattern fits the primary task.
  - **Information architecture:** ordered list of sections top→bottom (or left→-right for split).
  - **Primary CTA:** single focal action per screen.
  - **Stitch artifact reference:** MCP result id / filename / URL returned by Stitch (whatever Stitch provides).
- **Update `design_package.json`:** increment `retry.attempt`, set `retry.last_prompt_delta`, keep `stitch.screen_ids` pointing at the **current** canonical screen for this surface.

## Rules

1. **MCP Stitch only:** before each generation call, **read the Stitch MCP tool schema** (tool name + required fields) and comply exactly.
1b. **Stitch project reuse:** for a given **`feature_slug`**, **prefer** `list_projects` / existing **`stitch.project_id`** from **`artifacts/design_package.json`** or the EM handoff. **Do not** call **`create_project`** when a reusable id already exists unless the EM payload includes **`stitch_project_policy: create_new`** (documented supersession). Proliferating parallel Stitch projects for the same feature is an anti-pattern—see **`stitch_workflow.skill.md`**.
2. **Layouts per attempt:** in **default** mode, exactly **one** new or replaced exploration screen per generation phase—**do not** output 2–4 alternatives in one pass. In **`stitch_workflow` SoT** mode, output **2–4** screens in the same assignment as required by **`stitch_workflow.skill.md`**, with **`stitch.screen_ids[0]`** as the canonical baseline.
3. **Retry loop (design workflow):**
   - **Trigger retry** when `ui_critique.json` has any **`high`** severity **or** when EM explicitly requests regeneration.
   - **Hard cap:** `retry.max_attempts` from `design_package.json` (default **4** unless delivery overrides). On exhaustion, set `retry.exit_reason: max_attempts` and stop generating; EM escalates.
   - **Success exit:** when critique has **no `high`** and EM policy accepts the layout as baseline → set `status: baseline_frozen`, `stitch.approved_baseline: true`, `retry.exit_reason: accepted`.
4. **Prompt structure (fill in this order):**
   - **Goal + primary task** (first line).
   - **User type + context** (second line).
   - **Hard constraints** (density, nav, banned widgets).
   - **Section list** with **priority weights** (P0/P1/P2).
   - **Visual direction** as **functional adjectives** (legible, scannable, calm), not style buzzwords.
   - **Negative prompts:** “no generic AI landing hero,” “no meaningless gradient backgrounds,” “no decorative blobs,” “no lorem ipsum except short placeholders,” “no fake metrics.”
   - **On retry:** append a bullet list **“CHANGE SINCE ATTEMPT N-1”** sourced from critique `finding.id` + `recommendation` (paraphrased, actionable).
5. **Anti-generic layout forcing (single-attempt version):**
   - Require **one justified structural choice** tied to the primary task (e.g., “filters pinned left in split”).
   - Require **explicit grouping** (“related items share a container; unrelated items are separated by spacing rules, not lines”).
   - Ban **centered single-column marketing templates** unless the surface is literally marketing.
6. **Determinism aids:** reuse the same ordered template every attempt; only change content via **critique-driven deltas**.

## Anti-patterns

- Emitting multiple competing Stitch screens in one pass without EM assigning **`stitch_workflow: source_of_truth`** or separate `surface_id`s.
- Retrying without recording **`last_prompt_delta`** / critique linkage in `design_package.json`.
- Stitch prompts that are pure adjectives (“modern, sleek, stunning”) without IA/sections.
- Default **hero + 3 feature cards + testimonial grid** compositions for app/tool UIs.
- Assuming backend fields, APIs, or persistence.
- Emitting implementation code to “help” downstream agents.

## Philosophy alignment

Clarity and structure beat decoration; retries are for **task fit**, not random resampling.
