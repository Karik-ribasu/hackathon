---
name: responsiveness-rules
description: Breakpoint behaviors and layout transformations for ui_refiner_agent (mobile 320–480, tablet ~768, desktop 1280+).
---

# Responsiveness rules

## Role

Define **deterministic** responsive behavior: how layout, navigation, and components transform across breakpoints—without backend assumptions.

## When to use

- **`ui_refiner_agent`** whenever producing or revising `ui_spec` layouts.
- **`ui-generator-agent`** Stitch prompts that must explicitly set responsive expectations.

## Inputs (required)

- **Primary tasks per breakpoint** (may differ: read vs act).
- **Navigation inventory** (global, local, tabs, filters).
- **Component list** with priority (P0 always reachable).

## Outputs (required)

Add a `responsive` section to `ui_spec` with (and ensure `design_package.json` references that `ui_spec` path when on disk):

- **`breakpoints`:** `mobile (320–480)`, `tablet (768)`, `desktop (1280+)`
- **`layout_transforms`:** per breakpoint mapping: grids, columns, `max-width`, stacking order.
- **`nav_model`:** per breakpoint: `topbar` | `bottom` | `drawer` | `rail` | `combined` + rationale.
- **`component_resize`:** per critical component: `behavior` (`reflow` | `scroll` | `collapse` | `hide-secondary`) + triggers.

## Rules — mobile (320–480px)

- **Default stack:** single column; **no horizontal scroll** for primary content.
- **Touch targets:** minimum **44×44px** where platform guidelines apply; keep primary actions reachable **thumb zone** (bottom half) for frequent actions when using bottom nav or FAB policies.
- **Tables/lists:** convert wide tables to **row cards** or **two-line rows** with selective fields; hide **P2** columns behind “details” disclosure.
- **Filters:** collapse to **sheet/drawer** or a **single filter entry** button; avoid persistent multi-column filter rails.

## Rules — tablet (~768px)

- **Two-column allowed** for “list + detail” patterns; maintain **minimum 320px** readable column for text-heavy panels.
- **Navigation:** prefer **persistent slim side rail** *or* **top bar + tabs**; avoid duplicating nav in two places.
- **Density:** midway between mobile and desktop; do not reintroduce desktop-only multi-rails unless task-critical.

## Rules — desktop (1280px+)

- **Max width:** cap text-heavy layouts (typically **1040–1280px** content width) with intentional side margins.
- **Multi-column:** allowed for dashboards; still enforce **one primary** focal region.
- **Hover-dependent affordances:** never the only signal; keyboard/focus equivalents must exist at all breakpoints (documented at UX layer, not code).

## Layout transformations (canonical)

- **`dashboard`:** mobile stacks KPIs → tablet 2-column KPI grid → desktop 3–4 column KPI grid + retained detail region.
- **`split`:** mobile stacks panes **in task order** (primary pane first) → tablet side-by-side 40/60 → desktop 32/68 or 30/70.
- **`cards`:** mobile 1-column → tablet 2-column → desktop 3-column; card internals never exceed **3** text roles.
- **`feed`:** mobile full-width items → tablet unchanged or slightly wider gutters → desktop optional **reading rail** (filters/summary) without shrinking feed text below `caption` role for body content.

## Navigation changes (canonical)

- **Mobile:** prioritize **bottom nav** for ≤4 top-level sections; otherwise **drawer** + **contextual page actions** in top app bar.
- **Tablet:** move to **icon rail** or **top tabs**; reduce drawer depth.
- **Desktop:** **persistent left rail** acceptable for deep apps; top bar for marketing/simple tools.

## Component resizing (canonical)

- **Primary CTA:** full width on mobile; auto width on tablet/desktop with consistent min width token.
- **Data tables:** mobile cards; tablet sticky first column optional; desktop full table with truncation rules.
- **Charts:** mobile simplified series + taller aspect; desktop more series only if task requires; never “tiny chart with 12 legends.”
- **Search:** expands to full width on mobile; constrained field on desktop with typeahead panel anchored.

## Anti-patterns

- Hiding **P0** actions inside overflow menus on mobile without an alternate obvious path.
- Scaling down font sizes instead of reflowing columns.
- Using desktop multi-panel layouts unchanged on mobile “with pinch zoom.”
- Assuming specific framework breakpoints; always map to the three canonical bands here.

## Philosophy alignment

Responsive design is task preservation across constraints, not shrinking a desktop page.
