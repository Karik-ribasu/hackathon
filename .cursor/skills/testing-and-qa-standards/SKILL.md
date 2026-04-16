---
name: testing-and-qa-standards
description: Mandatory unit and integration coverage, container-only integration execution, and QA automated-manual E2E with Chromium. Read for delivery, architecture, infra, QA, and EM payloads.
---

# Testing and QA standards (mandatory)

## When to use (mandatory)

- **`delivery-agent`**, **`architecture-agent`:** when tasks touch tests, CI, coverage, or quality gate; add **`architecture_refs`** ids from this file and acceptance criteria that reference this skill.
- **`engineering-manager-agent`:** attach this skill path to **`infra-engineer`**, **`backend-agent`**, **`frontend-agent`**, and **`qa-agent`** assignments when tests or QA gates are in scope.
- **`infra-engineer`:** CI, compose/Kubernetes jobs, coverage enforcement, **integration-test-only** container orchestration.
- **`qa-agent`:** validation, coverage verification where assigned, **automated-manual E2E** (Chromium) per §4, **visual evidence** per §4.1 when design acceptance is in scope, and **Stitch fidelity** per §4.2 when **`design_package.json`** requires it.

---

## 1. Coverage — unit tests (mandatory)

- **100% coverage is required** for the **unit test scope** as defined in the repo’s coverage config (or, until configured, all non-generated TypeScript/JavaScript under `src/` that is eligible for unit testing—**exclude** only what the config explicitly excludes, e.g. `*.d.ts`, entry manifests, with documented rationale in the architecture brief or `quality-gate` acceptance).
- Coverage metric: **line coverage at 100%** minimum (project may add branch/function thresholds; they must not **lower** the 100% line bar for the declared scope).
- **CI must fail** if unit coverage falls below 100% for that scope.
- Unit tests run on the **default CI runner** (no Docker requirement unless the team chooses parity); they **must not** depend on real networked services—use fakes/in-memory doubles.

**Stable id:** `unit-tests-full-coverage`

---

## 2. Coverage — integration tests (mandatory)

- **100% coverage is required** for the **integration test scope** (modules that integration tests are responsible for exercising—**declare** the glob or package list in the architecture brief or `task.json` acceptance so the bar is auditable).
- **Integration test jobs must execute only inside isolated containers** (see §3). The same 100% rule applies to coverage collected from that job.
- **CI must fail** if integration coverage falls below 100% for the declared integration scope.

**Stable id:** `integration-tests-full-coverage`

---

## 3. Integration tests — containers only (mandatory)

- **Never** run integration tests that need process/network isolation (DB, cache, queues, message brokers, etc.) directly on the bare CI VM **without** containers, unless exploration/discovery documents an approved exception (rare).
- Use **one container (or one service) per concern**: e.g. one **PostgreSQL** container, one **Redis** container, one **queue** worker image, etc. Composition is **flexible** by feature, but **each auxiliary runtime must map to a single logical role** (one job = one reason to exist).
- The **application under test** and **test runner** may each run in their own container(s); keep blast radius small and logs attributable per service.
- **`infra-engineer`** owns compose/K8s manifests, CI job wiring, healthchecks, and teardown; implementation agents own test code that **consumes** those services by documented hostnames/ports.

**Stable id:** `integration-tests-isolated-containers`

---

## 4. QA — automated-manual E2E with Chromium (mandatory for `quality-gate` when UI exists)

This is **not** a substitute for unit/integration coverage; it is an **additional** gate.

- **`qa-agent`** must run (or extend) an **automated-manual** suite: the **application runs in an isolated container** (or isolated compose stack), and **Chromium** drives the UI to simulate **real user behavior** across **all shipped features of the MVP/slice**, **every** time this gate runs for that scope.
- **All features** means every user-visible capability in scope for the release (CRUD, navigation, error states called out in acceptance, etc.)—**no sampling** unless discovery explicitly documents a reduced gate and delivery updates `quality-gate` acceptance.
- **Failures to collect and report (structured, for EM handoff):**
  - **Browser console** errors and warnings attributable to the app (filter noise per QA judgment; document filters in the report).
  - **Network** failures (4xx/5xx, failed fetch/WebSocket) relevant to app APIs.
- Use the same **pass / fail + `issues` list** contract as the rest of `qa-agent` output; attach logs/screenshots paths if the pipeline supports artifacts.

**Stable id:** `qa-manual-automated-e2e-chromium`

---

## 4.1 QA — visual evidence for design acceptance (when required)

When **`task.json` acceptance** or **`artifacts/design_package.json`** sets **`acceptance.requires_design_visual_acceptance`: `true`** for a surface:

- **`qa-agent`** must produce **`artifacts/qa_visual_evidence.json`** and companion captures under **`artifacts/visual/`**, following **`.cursor/skills/design/design_visual_acceptance.skill.md`**.
- **Subjective** “brand feel” / discretionary **design judgment** vs Stitch remains **design-owned** when **`design_visual_acceptance`** runs; QA supplies **reproducible captures** + metadata (`build`, `environment`, `viewport`, `route`, `state`).
- If captures cannot be produced, document blocking reasons in **`qa_visual_evidence.json`** via **`errors`** (string array) and still report to EM.

**Stable id:** `qa-visual-evidence-for-design`

---

## 4.2 QA — Stitch structural fidelity (when `requires_stitch_fidelity_qa`)

When **`artifacts/design_package.json`** sets **`acceptance.requires_stitch_fidelity_qa`: `true`** (default expectation when **`stitch.source_of_truth`** is **`true`** per **`stitch_workflow.skill.md`**):

- **`qa-agent`** must write **`artifacts/stitch_fidelity_report.json`** in the artifact-owning task folder, with at least: **`status`** (`pass` \| `fail`), **`compared_baseline`** (path to **`design/stitch/meta.json`** or equivalent), **`canonical_screen_id`** (usually **`stitch.screen_ids[0]`**), **`viewports[]`**, and **`mismatches[]`** (each item: **`id`**, **`severity`**, **`rule`**, **`evidence`**, **`expected_reference`** e.g. Stitch section vs DOM region).
- Validate **structure first**: major regions / section order / primary CTA presence vs **`ui_spec.json`** + canonical Stitch export (PNG and/or exported code outline)—**not** pixel-perfect art direction unless acceptance explicitly demands it.
- **Responsiveness:** exercise the same realistic viewports used for functional E2E where applicable; record breakpoint-specific mismatches.
- **Relationship to §4.1:** §4.1 can still be mandatory for evidence; §4.2 adds an **objective** pass/fail gate owned by QA for Stitch-backed slices.

**Stable id:** `qa-stitch-fidelity`

---

## 5. `architecture_refs` (use in `task.json` / delivery JSON)

| Stable id | Meaning |
|-----------|---------|
| `unit-tests-full-coverage` | §1 — unit suite + 100% coverage enforced in CI |
| `integration-tests-full-coverage` | §2 — integration suite + 100% coverage |
| `integration-tests-isolated-containers` | §3 — integration runs only in multi-service containers |
| `qa-manual-automated-e2e-chromium` | §4 — QA Chromium E2E over full feature set |
| `qa-visual-evidence-for-design` | §4.1 — reproducible screenshots + `qa_visual_evidence.json` for design visual acceptance |
| `qa-stitch-fidelity` | §4.2 — `stitch_fidelity_report.json` + structural/responsive checks vs Stitch + `ui_spec` |
| `qa-validation` | Alias compatible with `architecture-standards` for **`quality-gate`** rows |

---

## 6. Practical note (non-negotiable vs. feasibility)

If 100% is **technically blocked** for a path (e.g. generated code), the **`architecture-agent`** must record the **exception list** in **`architecture-brief.json`** and **`delivery-agent`** must mirror it in **`quality-gate`** acceptance; otherwise the default remains **full 100%** for the declared scopes.
