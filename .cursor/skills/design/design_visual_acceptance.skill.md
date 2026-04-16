---
name: design-visual-acceptance
description: Post-implementation gate — QA produces reproducible screen captures; design compares implementation to frozen Stitch + ui_spec (structural fidelity).
---

# Design visual acceptance (post-QA evidence)

## Role

Separate **reproducible evidence** (QA) from **design judgment** (design agents): after engineering QA passes functional gates, **optionally** run a **design visual acceptance** task for new surfaces to confirm implementation matches the **approved baseline** (Stitch + `ui_spec`), within declared tolerances. When **`acceptance.requires_stitch_fidelity_qa`** is **`true`**, **`qa-agent`** additionally runs the **objective** structural gate in **`.cursor/skills/testing-and-qa-standards/SKILL.md`** §4.2 (`stitch_fidelity_report.json`)—this complements (does not replace) design’s discretionary verdict here.

## When to use

- **`qa-agent`:** when `task.json` **acceptance** explicitly requires **`qa-visual-evidence`** (or equivalent wording) for a `surface_id` listed in `design_package.json`.
- **`ui_critic_agent`** (or **`ui_refiner_agent`** if policy assigns): when invoked for **`design-visual-acceptance`** work after `qa_visual_evidence.json` exists.

## Inputs

### Path A — Full fidelity (approved Stitch baseline)

Use when comparing implementation to a **frozen, approved** Stitch baseline:

- **`design_package.json`** with `status: baseline_frozen` and `stitch.approved_baseline: true`.

### Path B — Waiver and interim baseline (structural judgment)

Aligned with `.cursor/skills/production-workflow/SKILL.md` Step 9: orchestrator may proceed when **`design_visual_acceptance.json`** has **`verdict: waived`** while the package is still **`refining`** or `stitch.approved_baseline` is **false**.

- **`design_package.json`** must exist with stable `surface_id` and traceability fields; **`status: baseline_frozen`** and **`stitch.approved_baseline: true`** are **not** required on this path.
- **`verdict: waived`** MUST include a non-empty **`waiver_reason`** (e.g. baseline not yet approved, token gaps, deliberate deferral of strict Stitch parity).
- Default **`fidelity_tier`** for this path is **`structural`** unless delivery explicitly demands **`strict-visual`** with documented tolerances.
- When **`acceptance.requires_design_visual_acceptance: true`**, **`qa_visual_evidence.json`** (and captures under **`artifacts/visual/`** when applicable) remain **mandatory** — QA supplies reproducible facts even when design judgment is **non-blocking** for strict Stitch parity until the baseline freezes.

**Common (paths A and B)**

- **Implemented build** reachable the same way as E2E (container URL, base path).
- **Viewport list:** at minimum widths aligned to `responsiveness_rules.skill.md` (`mobile 320–480`, `tablet 768`, `desktop 1280+`).

## Outputs (required)

1. **`artifacts/qa_visual_evidence.json`** — written/updated by **`qa-agent`** (schema below).
2. **`artifacts/design_visual_acceptance.json`** — written by **design** agent (schema below).

---

## QA artifact — `qa_visual_evidence.json` (schema version `1`)

| Field | Type | Required | Notes |
|--------|------|----------|--------|
| `kind` | `"qa-visual-evidence"` | yes | Constant. |
| `schema_version` | `1` | yes | |
| `feature_slug` | string | yes | |
| `surface_id` | string | yes | Must match `design_package.json`. |
| `build` | object | yes | `git_sha` or `image_digest` or `build_id` (string); `captured_at` ISO-8601 UTC. |
| `environment` | object | yes | `base_url`, `container_compose_service` (if any), `chromium_version` (string). |
| `captures` | array | yes | One object per capture (see row schema). |
| `errors` | string[] | no | Omit or `[]` when all captures succeed; use for blocking reasons when **`captures`** is empty or incomplete. |

**`captures[]` object**

| Field | Type | Required | Notes |
|--------|------|----------|--------|
| `capture_id` | string | yes | Stable id, e.g. `mobile-home-empty`. |
| `viewport` | `mobile` \| `tablet` \| `desktop` | yes | |
| `width_px` | number | yes | Actual viewport width. |
| `route` | string | yes | Path or deep link used. |
| `state` | string | yes | e.g. `default`, `loading`, `empty`, `error`, `hover-not-possible-in-static-capture` — document limitation honestly. |
| `file_path` | string | yes | Repo-relative path to PNG/WebP under `artifacts/visual/` (e.g. `artifacts/visual/mobile-home-default.png`). |
| `notes` | string | no | Setup steps, seed data id. |

**QA rules**

- Use the **same** deterministic data seeds documented in acceptance (or state “anonymous demo data” explicitly).
- Capture **full viewport** for the target surface; if sensitive data, use redaction policy from acceptance.
- On failure to capture, emit **`captures: []`** and put blocking reasons in top-level **`errors`**.

**QA anti-patterns**

- Subjective pass/fail on “looks like Stitch” (belongs to design).
- Missing `build` identity (cannot compare across runs).

---

## Design artifact — `design_visual_acceptance.json` (schema version `1`)

| Field | Type | Required | Notes |
|--------|------|----------|--------|
| `kind` | `"design-visual-acceptance"` | yes | Constant. |
| `schema_version` | `1` | yes | |
| `feature_slug` | string | yes | |
| `surface_id` | string | yes | |
| `compared_to` | object | yes | `design_package_path` (repo-relative), `stitch_screen_ids` (string[]), `ui_spec_path` (repo-relative). |
| `verdict` | `pass` \| `fail` \| `waived` | yes | `waived` requires `waiver_reason`. |
| `fidelity_tier` | string | yes | Default `structural` (hierarchy, grouping, CTAs, major regions). Optional `strict-visual` only if delivery explicitly demands pixel-level and defines tolerance. |
| `findings` | array | yes | Each: `capture_id`, `severity` (`low`|`medium`|`high`), `category` (`layout`|`spacing`|`content`|`state`|`responsive`|`chrome`), `summary`, `recommendation`. |
| `waiver_reason` | string \| null | yes | |

**Design rules**

1. Compare **each** `capture_id` to **Stitch baseline** + matching section of **`ui_spec`** — not Stitch alone if `ui_spec` intentionally diverged (document which source wins per finding).
2. **Structural default:** misaligned **primary CTA**, missing **P0** section, wrong **reading order**, or missing required **state** → at least **`medium`**.
3. **Cosmetic-only** deltas that do not affect task success → **`low`** unless acceptance says otherwise.
4. **`fail`** if any **`high`** remains unresolved by waiver policy.

**Design anti-patterns**

- Declaring **`fail`** without mapping to `capture_id` + concrete structural delta.
- Pixel-diffing without a documented **`fidelity_tier`** and tolerance (flaky and non-normative here).

---

## Workflow placement (repo alignment)

- Runs **after** functional QA required by **`quality-gate`** when delivery marks a surface as **`requires_design_visual_acceptance: true`** (or equivalent in acceptance strings).
- **`engineering-manager-agent`** sequences: … → `qa-agent` (functional) → **`qa-agent` (visual evidence)** if in acceptance → **`ui_critic_agent`** (or assigned design agent) for **`design_visual_acceptance.json`** → return consolidated report to orchestrator.

## Philosophy alignment

QA supplies facts; design supplies judgment against an agreed baseline—not against an undocumented aesthetic.
