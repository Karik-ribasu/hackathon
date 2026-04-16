---
name: ui-critique
description: Structured critique contract (ui_critique.json) for ui_critic_agent with severities, categories, and good/bad examples.
---

# UI critique (`ui_critique.json`)

## Role

Translate layout analysis + heuristics into a **machine-readable critique** suitable for `ui_refiner_agent`, with severities, categories, and evidence.

## When to use

- **`ui_critic_agent`** whenever reviewing a UI artifact, the active Stitch screen, or **QA captures** for **design visual acceptance** (see `design_visual_acceptance.skill.md`).

## Inputs (required)

- **Layout Analysis Record** per `layout_analysis.skill.md`.
- **Task context + constraints** (density, breakpoints, accessibility target).
- **Artifact references** (image ids, Stitch outputs).

## Outputs (required)

Emit **`ui_critique.json`** as JSON with this schema (field semantics fixed). After writing, set `references.ui_critique` in **`design_package.json`**.

- **`meta`**
  - `artifact_ids`: string[]
  - `viewport`: `mobile` | `tablet` | `desktop` | `multi`
  - `critique_version`: semantic string (e.g., `1.0.0`)
- **`summary`**
  - `top_issues`: string[3] (short, user-facing)
  - `risk_statement`: string (what breaks task success)
- **`findings`**: array of objects, each with:
  - `id`: stable string (`H-001`, `S-002`, …)
  - `category`: `hierarchy` | `spacing` | `ux` | `clarity`
  - `severity`: `low` | `medium` | `high`
  - `title`: ≤80 chars
  - `evidence`: string (what is visible / measurable)
  - `impact`: string (user/task consequence)
  - `recommendation`: string (directional fix; not implementation)
  - `related_sections`: string[] (from layout inventory)

**Severity rubric (deterministic)**

- **`high`:** blocks core task, causes mis-taps/mis-reads, violates obvious contrast/focus needs, or creates dead ends without recovery.
- **`medium`:** increases cognitive load, hides P0 actions, inconsistent spacing/hierarchy that slows scanning.
- **`low`:** polish, minor inconsistency, non-blocking clarity improvements.

**Category definitions**

- **`hierarchy`:** emphasis, heading order, competing primaries, weak focal path.
- **`spacing`:** spacing system violations, proximity mistakes, edge crowding, rhythm breaks.
- **`ux`:** flows, affordances, errors/empty/loading gaps, navigation model issues.
- **`clarity`:** labeling, grouping semantics, icon/text mismatch, ambiguous metadata.

## Rules

1. Minimum **5** findings for non-trivial screens unless explicitly scoped smaller.
2. At least **1** finding in **`hierarchy`** and **1** in **`spacing`** when both apply.
3. **`evidence` must cite structure**, not taste (e.g., “H1 competes with 48px chart title; both full-width”).
4. **`recommendation` must be one actionable direction**, not a list of alternatives.
5. Map every **`high`** severity to a **P0** section from layout analysis when possible.

## GOOD vs BAD examples (shape, not code)

### GOOD (finding)

- **`title`:** Primary action buried under secondary filters
- **`category`:** `ux`
- **`severity`:** `high`
- **`evidence`:** Primary CTA appears after 720px of filters; on mobile it lands below fold in the described layout.
- **`impact`:** Users abandon before starting the core task.
- **`recommendation`:** Move primary CTA above filter cluster; collapse advanced filters.

### BAD (finding)

- **`title`:** Looks weird
- **`category`:** `clarity`
- **`severity`:** `medium`
- **`evidence`:** Not modern enough
- **`impact`:** Bad vibes
- **`recommendation`:** Make it more modern

### GOOD (finding)

- **`title`:** Ambiguous grouping in results list
- **`category`:** `clarity`
- **`severity`:** `medium`
- **`evidence`:** Metadata for item A is closer to item B than to A due to uneven right rail spacing.
- **`impact`:** Users misassociate price with the wrong SKU during scanning.
- **`recommendation`:** Normalize vertical rhythm; align metadata into a dedicated column cluster per item.

### BAD (finding)

- **`title`:** Spacing off
- **`category`:** `spacing`
- **`severity`:** `low`
- **`evidence`:** Inconsistent
- **`impact`:** Looks unprofessional
- **`recommendation`:** Fix spacing

## Anti-patterns

- Findings without **`evidence`** tied to visible structure.
- Duplicate findings restated with new ids.
- Mixing personal preference where **`impact`** cannot be tied to a user task.
- Emitting prose-only critique when JSON is required.

## Philosophy alignment

Critique exists to improve task success and clarity; beauty is out of scope unless it interferes with scanning or comprehension.
