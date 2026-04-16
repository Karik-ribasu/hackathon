---
name: layout-analysis
description: Structured decomposition of UI layouts for ui_critic_agent — hierarchy, sections, grouping, density, and defect detection.
---

# Layout analysis

## Role

Decompose a UI (screenshot, Stitch output, or described wireframe) into **auditable structure** and **actionable defects** without proposing final visual redesign.

## When to use

- **`ui_critic_agent`** before scoring issues or emitting `ui_critique.json`, or when comparing **QA captures** to baseline for **design visual acceptance**.
- Whenever critique must be **grounded in layout mechanics**, not taste.

## Inputs (required)

- **Visual reference:** image and/or structured description (sections, components, labels); include repo-relative **`design_package.json`** when the surface is registered.
- **Task context:** what the user is trying to accomplish on this surface.
- **Target breakpoints:** at least mobile (320–480), tablet (~768), desktop (1280+).

## Outputs (required)

Produce a **Layout Analysis Record** with these subsections:

1. **Hierarchy map**
   - **H1:** primary page title (if any) + salience note (`dominant`/`competes`/`missing`).
   - **H2/H3:** section headers in DOM/top-to-bottom reading order.
   - **Focal path:** 1–3 step sequence the eye should follow; mark breaks.
2. **Sections inventory**
   - Ordered list: `section_name` · `purpose` · `priority (P0/P1/P2)` · `approx vertical %` (rough).
3. **Grouping audit**
   - **Clusters:** label each cluster + items inside + **proximity cue** (spacing, container, divider).
   - **Strays:** elements visually near but not semantically grouped.
4. **Density read**
   - **Label:** `compact` | `balanced` | `airy` vs intent (tooling vs marketing).
   - **Signals:** line length, row height, control spacing category (`tight`/`ok`/`loose`).

## Rules — detecting weak hierarchy

- Flag **≥2 competing primaries** (two large headings, hero + oversized chart title, duplicated emphasis).
- Flag **missing orientation:** user cannot name what to read first in **5 seconds**.
- Flag **header inflation:** >7 visually similar “emphasized” blocks without tiering.
- Flag **orphan emphasis:** bold/color on secondary metadata.

## Rules — detecting bad spacing

- Treat **inconsistent step sizes** as defects (e.g., mixing 6, 10, 14px gaps without system).
- Flag **edge crowding:** content closer to viewport edge than to siblings.
- Flag **ambiguous proximity:** unrelated controls closer than related ones.
- Flag **ragged vertical rhythm:** alternating large/small gaps without pattern.

## Rules — detecting clutter

- **Information density > scanning capacity:** too many distinct widgets visible before first action.
- **Decorative chrome** without function (grids behind text, meaningless icons).
- **Duplicate pathways** (filters in two places doing the same thing without reason).
- **Microtext clusters:** >4 lines of small text in one cluster without grouping.

## Anti-patterns

- Critique by adjectives (“feels off”) without pointing to **hierarchy/section/group/density** evidence.
- Redesigning during analysis (keep analysis separate from recommendations).
- Ignoring mobile reflow when provided.

## Philosophy alignment

Structure and grouping are the substrate; aesthetics judgments require structural receipts.
