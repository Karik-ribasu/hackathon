---
name: architecture-standards
description: Canonical engineering architecture and patterns for this repo (Clean Architecture, DDD, UI composition, styling). Must be read when generating or refining delivery tasks and when implementing features.
---

# Architecture standards (engineering)

## When to use this skill (mandatory)

- **`delivery-agent`:** before splitting epics/tasks and **while** writing `task.json` and acceptance criteria—each task must stay traceable to these rules (use `architecture_refs` per task where relevant).
- **`architecture-agent`:** when producing or updating per-feature **`architecture-brief.json`** (narrows this document to the feature; must not contradict it).
- **`engineering-manager-agent`:** when turning tasks into assignments—payloads to specialists must include the brief path and require compliance with this skill + brief.
- **Implementation specialists** (`frontend-agent`, `backend-agent`, …): before coding; deviations need an explicit decision recorded in the architecture brief or a new exploration/discovery cycle—no silent drift.
- **Testing / QA / CI:** also read **`.cursor/skills/testing-and-qa-standards/SKILL.md`** whenever tasks touch tests, coverage, containerized integration, or the **`quality-gate`**.

---

## 1. Baseline (layered + domain-aware)

### Clean Architecture (ports & adapters) ###
`.cursor/skills/architecture-standards/SKILL.md`  

**Purpose:** Dependencies point inward: domain rules and use cases do not depend on frameworks. UI, HTTP, DB, and queues are replaceable adapters.

**Next.js (App Router):** keep **domain + application use cases** in pure modules (no `react` / `next/*` / ORM imports). Routes, server actions/handlers, and components sit at the edge and call use cases through interfaces (ports). Prefer unit tests on the core.

---

### DDD (tactical, pragmatic) ###
`.cursor/skills/architecture-standards/SKILL.md`  

**Purpose:** Ubiquitous language; aggregates where invariants exist; value objects for concepts without identity; domain services only when the rule does not belong to one entity. **Bounded contexts** when the MVP spans more than one domain; avoid one giant “global model” without need.

**Limits:** no event sourcing or microservices for the MVP unless exploration/discovery justified it.

---

### Creational — Singleton policy ###
`.cursor/skills/architecture-standards/SKILL.md`  

**Purpose:** Avoid global **mutable** singletons (hurts testing, hides coupling). Prefer explicit injection (parameters/factories) or per-request instances on the server. **Rare exceptions:** immutable HTTP clients, stateless loggers—document in `architecture-brief.json` if used.

---

## 2. Frontend architecture

### Atomic Design ###
`.cursor/skills/architecture-standards/SKILL.md`  

**Purpose:** Structure UI as **atoms → molecules → organisms**; pages/templates compose from them. **One visual responsibility per component**; complex state lifts to parents or dedicated hooks, not scattered across atoms.

**Suggested folders:** `components/ui/atoms`, `.../molecules`, `.../organisms` (adapt to existing layout; do not invent parallel trees without reason).

---

### Styled Components ###
`.cursor/skills/architecture-standards/SKILL.md`  

**Purpose:** Co-locate styles with components; avoid untyped dynamic styled factories; prefer a typed theme (`DefaultTheme`) and centralized tokens (color, spacing). Follow SSR/hydration guidance for the installed library version with Next (registry/provider if required).

**Alternative:** CSS Modules or Tailwind only if `architecture-brief.json` states it—default remains **styled-components** until the brief says otherwise.

---

## 3. Delivery task generation rules

- Every task in the delivery JSON must include **`architecture_refs`**: array of stable ids from this skill, e.g. `["clean-architecture", "atomic-design"]`, whenever the task touches affected code.
- Do **not** mix pure domain work with UI in the same task; split by `task_slug` / sector per `production-workflow`.
- Acceptance criteria must be checkable against these rules (examples: “no `react` imports under `domain/`”, “component classified as molecule in Atomic tree”).

### Stable ids (use in `architecture_refs`)

- `clean-architecture`
- `ddd-tactical`
- `singleton-policy`
- `atomic-design`
- `styled-components`
- `qa-validation` (use on **`quality-gate`** / QA-only tasks)
- `unit-tests-full-coverage` — see **`.cursor/skills/testing-and-qa-standards/SKILL.md`**
- `integration-tests-full-coverage` — same
- `integration-tests-isolated-containers` — same
- `qa-manual-automated-e2e-chromium` — same

---

## 4. Evolving this document

Global stack changes (e.g. replace styled-components) are proposed by **`architecture-agent`** as an edit to this `SKILL.md` plus a recorded decision in `architecture-brief.json`; human approval is implied when the change is accepted in review.

---

## 5. Summary (“who does what”)

| Layer | Artifact | One-line purpose |
|--------|-----------|------------------|
| Policy | This skill | Cross-cutting standards and traceable ids for tasks. |
| Per feature | `architecture-agent` + `architecture-brief.json` | Narrows architecture for the feature without breaking the skill. |
| Backlog | `delivery-agent` | Creates tasks and `task.json` with `architecture_refs` + brief alignment. |
| Execution | `engineering-manager-agent` + specialists | Ensures every assignee receives brief path + this skill as mandatory input. |
| Post-QA governance | `improvement-agent` → `orchestrator-agent` Step 11 | Records improvement plans under `tasks/<feature_slug>/improvements/`; orchestrator may apply allowlisted edits to this skill or other `.cursor/**` assets—**not** product code. |
