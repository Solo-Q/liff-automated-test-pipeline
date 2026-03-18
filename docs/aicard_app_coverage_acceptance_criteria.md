# AICard App Coverage Acceptance Criteria

Version: v1.0-draft
Document Type: Project-Specific Coverage Target
Target Project: `liff_projects_for_test_only/aicard_app`

## 1. Purpose

This document defines practical coverage targets for validating the LIFF Automated Test Pipeline against `aicard_app`.

These targets are not intended to force the whole repository toward 100% coverage. The goal is to raise confidence in the highest-risk LIFF behaviors first, then improve broader page-flow coverage over time.

## 2. Current Baseline

Latest generated test run baseline:

- Statements: `14.59%`
- Branches: `42.99%`
- Functions: `21.43%`
- Lines: `14.59%`

Source of truth:

- `liff_projects_for_test_only/aicard_app/reports/latest/summary.json`
- `liff_projects_for_test_only/aicard_app/reports/latest/coverage-summary.json`

## 3. Metric Meaning

### 3.1 Statements

Percentage of executable statements that were executed by tests.

Use this to understand how much code was actually touched.

### 3.2 Branches

Percentage of conditional branches that were executed.

This is especially important for LIFF projects because login state, init state, error handling, fallback handling, and route decisions are usually branch-heavy.

### 3.3 Functions

Percentage of functions or methods that were called at least once.

Use this to understand whether important services, hooks, and handlers are being exercised at all.

### 3.4 Lines

Percentage of source lines that were executed.

This often tracks closely with statements, but still helps as a simple overall touch indicator.

## 4. Coverage Policy

Coverage targets should be risk-based.

- High-risk LIFF modules should be held to a high standard.
- Auth, guard, and LIFF-dependent flows should be covered more deeply than simple display pages.
- Low-risk wrappers, constants, and thin shells do not need to approach 100%.

Do not use repository-wide 100% coverage as the acceptance target for v1.

## 5. Recommended Targets

### 5.1 Core LIFF / LINE Services

Examples:

- `src/services/liffService.ts`
- `src/services/api/lineService.ts`

Targets:

- Statements: `85%+`
- Branches: `80%+`
- Functions: `90%+`

Reason:

These files are high-risk integration points. Failures here break login, profile retrieval, share behavior, and LIFF environment handling.

### 5.2 Auth Flow / Route Guard / LIFF Hooks

Examples:

- auth entry pages
- auth hooks
- route guards
- LIFF-dependent hooks

Targets:

- Statements: `75%+`
- Branches: `70%+`
- Functions: `80%+`

Reason:

These modules often contain fallback logic, redirect logic, loading behavior, and failure handling that should be exercised across success and error paths.

### 5.3 Primary Page Flows

Examples:

- cardholder flow
- card manage flow
- share flow
- mycash flow

Targets:

- Statements: `60%+`
- Branches: `55%+`
- Functions: `70%+`

Reason:

These page flows are important, but not every page requires the same depth as the LIFF core services. The focus is to achieve stable smoke-plus-branch coverage for key user journeys.

### 5.4 Repository-Wide v1 Threshold

Targets:

- Statements: `35%` to `45%`
- Branches: `50%+`
- Functions: `45%+`

Reason:

The current baseline is still early-stage. A realistic v1 goal is to more than double statement and function coverage while preserving reliable full-pipeline execution.

## 6. Prioritization Order

Engineering effort should improve coverage in this order:

1. `src/services/liffService.ts`
2. `src/services/api/lineService.ts`
3. Auth hooks, auth pages, and route guards
4. Cardholder, card manage, and share page flows
5. Remaining generic pages

## 7. Acceptance Criteria

The `aicard_app` validation target is considered acceptable for this stage when all of the following are true:

1. High-risk features have generated tests that do more than smoke assertions.
2. `risk-analysis.md` reports no uncovered high-risk features.
3. Core LIFF / LINE services meet or approach the service-level targets.
4. Auth and page-flow areas move materially toward their target bands.
5. Repository-wide coverage reaches the v1 threshold band.
6. Full CLI pipeline still completes successfully:
   - `analyze`
   - `prepare`
   - `extract-features`
   - `generate`
   - `run`
   - `report`

## 8. Non-Goals

The following are explicitly not required for v1 acceptance:

- 100% repository-wide coverage
- exhaustive coverage for low-risk wrappers or presentational shells
- deep business-rule verification for every generated generic template

## 9. Next Review Trigger

This document should be reviewed again when one of the following happens:

- repository-wide statements exceed `35%`
- a second LIFF project is added as an active validation target
- generator adapters are expanded enough to materially reduce `generic` coverage reliance
