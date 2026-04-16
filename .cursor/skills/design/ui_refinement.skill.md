---
name: ui-refinement
description: Critique-to-layout refinement patterns for ui_refiner_agent (Stripe/Linear/Vercel-like restraint), hierarchy/spacing/states rules, anti-overdesign.
---

# UI refinement

## Role

Convert `ui_critique.json` + design system tokens into a **revised layout specification** that improves hierarchy, spacing, and required states—without shipping implementation code.

## When to use

- **`ui_refiner_agent`** after critique and/or after Stitch exploration stabilization.

## Inputs (required)

- **`ui_critique.json`** (latest).
- **Token table + component specs** from `design_system_enforcement.skill.md` (or a declared subset).
- **Responsiveness targets** from `responsiveness_rules.skill.md`.

## Outputs (required)

Produce a **`ui_spec`** structured document with (and set `references.ui_spec` in **`design_package.json`** when persisted):

- **`layout`:** section order, grid behavior per breakpoint, alignment rules, max widths.
- **`components`:** per component: chosen variant, spacing keys used, truncation rules.
- **`states`:** explicit list of screens/sections with `hover`, `loading`, `empty`, `error` behaviors (copy + structure, not backend).
- **`changelog`:** bullet list mapping `finding.id` → resolved/mitigated/deferred (with reason).

## Rules — applying critique

- Resolve **all `high`** findings or explicitly **defer** with a task-blocking reason in `changelog`.
- **`medium`** must be majority-addressed; **`low`** pick ≤3 if timeboxed (list cuts).
- Each change must cite **`finding.id`** it addresses.

## Rules — improving hierarchy

- **One primary:** enforce a single dominant title + single primary CTA per view state.
- **Tiering:** downgrade secondary headlines by **one text role**, not by faint gray alone.
- **Scan path:** reorder sections so P0 content appears before P1 unless safety requires otherwise.

## Rules — improving spacing

- Replace ad-hoc gaps with **allowed spacing keys** only.
- Prefer **spacing over lines** to separate groups; dividers require justification (`dense tool` exception).

## Rules — states (minimum expectations)

- **`hover`:** subtle (border/background shift using tokenized deltas); never-only-color cue.
- **`loading`:** skeleton or structured placeholder mirroring final layout (no spinners alone for large panels).
- **`empty`:** instructive headline + one next action + optional secondary link.
- **`error`:** what happened (plain language) + recovery action + support path policy if applicable.

## Refinement patterns (style references, not copying)

### Stripe-like restraint

- Calm surfaces, strong typographic hierarchy, generous **balanced** density, precise tables.
- Use **one** accent color role sparingly for primary actions and key metrics.

### Linear-like density

- **Compact** interactive rows, tight vertical rhythm **within** lists, but **clear cluster breaks** between unrelated regions.
- Fast-scan headers; minimal chrome; crisp focus rings.

### Vercel-like simplicity

- Clear max width, lots of negative space, **few** type sizes, restrained borders.
- Marketing clarity: short sentences; avoid feature walls.

**Pattern selection rule:** pick **one** primary reference for the surface and reject mixing unless sections differ by intent (e.g., app shell = Linear-like, public landing = Vercel-like).

## Rules — not overdesigning

- No new components unless a **`high`** finding requires it.
- No decorative gradients, blobs, glassmorphism, or illustrative stock motifs unless brand mandates.
- Avoid **>2** accent colors on a screen.
- Do not add “nice-to-have” animations; specify motion only when it aids comprehension.

## Anti-patterns

- Reintroducing decorative elements to “balance whitespace.”
- “Fixing” hierarchy solely by shrinking text until illegible.
- Adding modals where inline disclosure suffices.
- Writing implementation code or pseudo-code as the deliverable.

## Philosophy alignment

Clarity and consistency first; refinement reduces decisions and preserves scanability.
