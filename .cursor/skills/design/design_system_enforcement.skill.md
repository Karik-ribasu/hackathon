---
name: design-system-enforcement
description: Normalization rules, token patterns, and component standards for design_system_agent (8px spacing, type scale, consistency).
---

# Design system enforcement

## Role

Normalize exploratory UI into a **token-driven, component-consistent** baseline suitable for engineering handoff—without inventing backend behavior.

## When to use

- **`design_system_agent`** when stabilizing tokens, spacing, typography, and component API after exploration or critique.

## Inputs (required)

- **Current UI inventory:** components list + states needed (default, hover, focus, disabled, loading, empty, error).
- **Brand constraints:** if any (color families, corner radius policy, monospace usage).
- **Density target:** `compact` | `balanced` | `airy` (pick one as default).

## Outputs (required)

- **Token table (structured):** rows for `space`, `radius`, `color`, `border`, `shadow`, `type`, `z`, `motion` groups.
- **Component specs:** per component: `anatomy`, `slots`, `size variants`, `state matrix`, `do/don’t`.
- **Migration notes:** mapping from messy ad-hoc values → canonical tokens (no code).
- **Registry update:** set `references.design_system` in **`design_package.json`** and move `status` toward `tokens_applied` when tokens are authoritative for the slice.

## Rules — 8px spacing system

- **Base unit:** `4` and `8` are the only fundamental steps; allowed spacing keys: `0, 4, 8, 12, 16, 24, 32, 40, 48, 64` (stop at 64 unless documented exception).
- **Component internal padding:** prefer `12/16/24` based on t-shirt size (`sm/md/lg`), never arbitrary odd numbers.
- **Layout gutters:** `16` mobile, `24` tablet, `32` desktop unless contraints say otherwise.
- **Normalize:** round all raw measurements to nearest allowed token; if ambiguous, choose the **smaller** gap before adding containers.

## Rules — typography scale

- **Roles, not fonts:** define `display`, `title`, `subtitle`, `body`, `label`, `caption`, `mono` (optional) with **size/line-height/weight/letter-spacing** intent.
- **Limits:** max **4** distinct sizes on a single screen for text classes (excluding numeric tabular exceptions).
- **Line length:** target **45–75 characters** for body in desktop layouts; enforce via layout, not smaller-than-caption text.
- **Contrast:** text roles must declare **contrast tier** (`AA text` / `AA large` / `non-text only`).

## Rules — consistent components

- **One component, one behavior:** identical visuals must share the same spec; if behavior differs, name differs (`Button` vs `IconButton`).
- **Sizes:** every interactive component offers at least `sm/md` (add `lg` only if touch targets require).
- **States completeness:** defaults are incomplete if hover/focus/disabled are undefined for interactives.
- **Icon policy:** stroke width, corner style, and padding rules are fixed globally.

## Token creation pattern (mandatory shape)

For each token group, output entries as:

- `name` (stable, kebab-case)
- `intent` (what it is for)
- `value rule` (allowed steps / formula, not a codebase variable)
- `usage constraints` (where allowed / forbidden)

## Component standardization pattern (mandatory shape)

For each component:

- `purpose`
- `anatomy` (slots)
- `variants` (size, emphasis, tone)
- `layout rules` (alignment, min heights, truncation)
- `content rules` (max lines, ellipsis policy)
- `accessibility` (focus ring policy, label patterns)

## Anti-patterns

- Token sprawl (`space-7`, `gray-213`) without merge plan.
- Using opacity as a crutch for hierarchy instead of spacing/type roles.
- “Pixel-perfect” recreation of inconsistent source instead of normalization.
- Hard-coding product copy into the system layer.

## Philosophy alignment

Consistency beats novelty; tokens exist to remove micro-decisions during implementation.
