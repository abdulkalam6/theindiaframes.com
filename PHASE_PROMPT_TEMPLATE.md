# Antigravity Phase Prompt Template

Use this template for each implementation phase after Phase 0. Replace the bracketed fields before submitting it to Antigravity.

---

You are continuing development of **The India Frames**. Follow `ANTIGRAVITY_MASTER_PROMPT.md` and the project documentation as the source of truth.

## Requested phase

**Phase:** `[PHASE NUMBER AND NAME]`

**Scope:** `[COPY THE DELIVERABLES FOR THIS PHASE FROM docs/DEVELOPMENT_PLAN.md]`

## Before coding

1. Read `README.md` and `ANTIGRAVITY_MASTER_PROMPT.md`.
2. Read the relevant requirements, architecture, database, API, user-flow, billing, UI/UX and security documents for this phase.
3. Inspect the current repository and report what already exists.
4. Identify dependencies on earlier phases and verify their exit gates.
5. If a business rule is genuinely missing or conflicts with existing documentation, stop and report the issue rather than inventing it.

## Implementation rules

- Implement only this phase. Do not jump ahead to later phases.
- Preserve working code and avoid unrelated rewrites.
- Follow the documented architecture and API/data contracts.
- Enforce permissions and validation in FastAPI, not only in the UI.
- Add tests for the new behaviour and high-risk edge cases.
- Add loading, empty, error and success states for user-facing functionality.
- Update documentation if an approved contract/detail changes.
- Do not add out-of-scope features, secrets or paid integrations.

## Acceptance criteria

`[LIST PHASE-SPECIFIC ACCEPTANCE CRITERIA HERE]`

## Verification

Run relevant formatting, lint, typecheck, unit tests, integration tests and builds. Report exact commands and whether each passed. Never claim a test ran if it did not.

## Required completion report

- Summary of implementation.
- Files created/modified.
- API/database changes.
- Tests added and commands executed.
- Actual test/lint/build results.
- Known issues and unverified items.
- Documentation changes.
- Confirmation that work stayed within the requested phase.
- Recommendation for the next phase.

Do not deploy or perform destructive/irreversible data operations unless explicitly authorized.

---
