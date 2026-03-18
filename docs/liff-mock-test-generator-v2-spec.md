# LIFF Mock Test Generator V2 Spec

Version: v2.0-draft
Document Type: Generator Upgrade Spec
Audience: Frontend engineers, QA/SDET, tooling engineers

## 1. Purpose

This document defines the v2 upgrade scope for the LIFF Mock Automated Test Pipeline test generator.

The goal of v2 is to narrow the gap between:

- executable auto-generated tests
- hand-authored AiCard QA testcase documents in `docs/AI card測試案例`

v2 does not try to replicate the full manual testcase library 1:1. It adds the minimum structure required to make generated cases more useful for QA, more precise for engineering, and more explainable in reports.

## 2. Problem Statement

The current generator can:

- detect LIFF projects
- extract features
- build scenario pools
- generate runnable tests
- execute and report results

However, compared to the AiCard manual testcase set, the generated cases are still too coarse in four areas:

1. failure taxonomy is too flat
2. test data is too abstract
3. case priority is missing
4. feature granularity is too page-oriented and not module-aware enough

As a result:

- one generated feature often represents many manual cases
- generated reports explain coverage at a high level only
- generated tests are less suitable for regression planning
- QA cannot easily compare generated coverage against manual testcase inventory

## 3. V2 Goals

v2 must add the following capabilities:

1. finer failure taxonomy
2. structured test data metadata
3. case priority and generation policy
4. module-aware feature decomposition

v2 should preserve:

- current CLI commands
- current scaffold ownership model
- current rerun/idempotency behavior
- current runnable `aicard_app` pipeline flow

## 4. Non-Goals

v2 explicitly does not include:

- full conversion of every manual testcase into executable generated tests
- product-specific PM decision automation for all `待釐清` cases
- full domain-specific support for every AiCard module family
- automatic generation of real E2E coverage for all manual smoke scenarios

## 5. Source of Requirements

The primary comparison set for v2 is:

- `docs/AI card測試案例/01_註冊流程_測試案例_63條.md`
- `docs/AI card測試案例/02_我的名片_測試案例_57條.md`
- `docs/AI card測試案例/03_收入流程_測試案例_120條.md`
- `docs/AI card測試案例/04_名片夾_測試案例_65條.md`
- `docs/AI card測試案例/05_掃描名片_測試案例_35條.md`
- `docs/AI card測試案例/06_好友申請與通知_測試案例_79條.md`
- `docs/AI card測試案例/07_設定_測試案例_98條.md`

These files define the shape of the desired testcase richness, but not every row should become a generated test.

## 6. Core Design Principles

### 6.1 Two-Layer Model

v2 separates testcase modeling into two layers:

- `Scenario Spec Layer`
  - rich testcase metadata
  - close to QA testcase language
  - may include manual-only cases

- `Execution Case Layer`
  - cases selected for generated unit/integration/e2e output
  - must be runnable and maintainable

### 6.2 Generate Only Automation-Suitable Cases

The generator must not blindly emit every known testcase.

Cases may be:

- `auto_required`
- `auto_optional`
- `manual_only`
- `blocked_pending_product_rule`

### 6.3 Domain-Aware Decomposition

A page is not always the right test unit.

The generator should decompose page-level features into smaller module-aware targets where useful.

Example:

- `cardholder-page`
  - `search`
  - `tabs`
  - `list-pagination`
  - `favorite-toggle`
  - `contact-line`
  - `contact-phone`
  - `contact-email`
  - `empty-state`
  - `count-display`

## 7. V2 Data Model Changes

## 7.1 Feature Map Additions

Each feature item must add:

```ts
interface FeatureMapItemV2 {
  moduleType?: string
  parentFeatureId?: string | null
  childFeatureIds?: string[]
  decompositionSource?: 'page' | 'service' | 'hook' | 'qa-module-rule'
}
```

Meaning:

- `moduleType`: logical module such as `search`, `favorite-toggle`, `scan-quota`, `notification-menu`
- `parentFeatureId`: optional parent page/flow feature
- `childFeatureIds`: module children for aggregate reporting
- `decompositionSource`: why this feature exists

## 7.2 Generation Plan Additions

The generation plan must add:

```ts
interface TestCaseDefinitionV2 {
  priority: 'P0' | 'P1' | 'P2'
  generationMode: 'auto_required' | 'auto_optional' | 'manual_only' | 'blocked_pending_product_rule'
  failureMode?: string | null
  testData?: {
    kind: string
    values: Array<string | number | boolean | null>
    source?: 'fixture' | 'literal' | 'derived'
    note?: string
  }[]
  moduleType?: string | null
  parentFeatureId?: string | null
  manualReferenceIds?: string[]
}
```

Meaning:

- `priority`: execution and reporting priority
- `generationMode`: whether the case should be generated
- `failureMode`: concrete failure class
- `testData`: structured sample data or boundary values
- `manualReferenceIds`: link back to manual testcase IDs where possible

## 7.3 Report Additions

Summary and report outputs must add:

```ts
interface ScenarioCoverageSummaryV2 {
  byPriority: Record<string, number>
  byGenerationMode: Record<string, number>
  byFailureMode: Record<string, number>
  byModuleType: Record<string, number>
  manualCoverage?: {
    referenced: number
    autoGenerated: number
    manualOnly: number
    blockedPendingProductRule: number
  }
}
```

## 8. Failure Taxonomy

v2 must replace generic `failure` buckets with specific failure modes.

Initial required taxonomy:

- `api_error`
- `network_timeout`
- `empty_result`
- `duplicate_data`
- `validation_error`
- `permission_denied`
- `auth_missing`
- `liff_init_failed`
- `liff_profile_failed`
- `external_app_unavailable`
- `rate_limit_reached`
- `state_conflict`
- `retry_exhausted`

### 8.1 Mapping Rules

Examples:

- LIFF init failure -> `liff_init_failed`
- duplicated phone number -> `duplicate_data`
- phone too short / too long / invalid prefix -> `validation_error`
- scan quota used up -> `rate_limit_reached`
- API 5xx -> `api_error`
- request timeout -> `network_timeout`

### 8.2 Generation Rules

The generator must not emit generic `failure` if a more specific failure mode is known.

Fallback to generic `failure` is allowed only when:

- the module is still generic
- no known taxonomy mapping exists

## 9. Test Data Granularity

v2 must allow cases to carry concrete data values.

### 9.1 Required Data Shapes

Examples:

- duplicate phone:
  - `0912345678`
- registered user phone:
  - `0912888999`
- empty string:
  - `""`
- whitespace:
  - `"   "`
- too short phone:
  - `09123456`
- too long phone:
  - `091234567890`
- invalid prefix:
  - `0212345678`
- special chars:
  - `"!@#$%^&*()"`

### 9.2 Usage Rules

Test data metadata must be used for:

- generated test names where useful
- fixture selection
- value injection into templates
- report output

### 9.3 Limits

The generator should not explode one scenario into dozens of near-duplicate tests by default.

Use this policy:

- `P0`: include representative valid/invalid/boundary values
- `P1`: include one representative non-default data case
- `P2`: only include data detail in extended mode or report-only mode

## 10. Priority Model

### 10.1 Meaning

- `P0`
  - must generate if automation is possible
  - must be visible in summary and risk report

- `P1`
  - should generate when target adapter exists
  - may downgrade to report-only if execution is unstable

- `P2`
  - may stay report-only in default mode
  - only generate in `expanded` mode or when tied to a high-risk feature

### 10.2 Default Assignment Rules

- high-risk LIFF services -> `P0`
- auth entry / guard / share / scan quota / duplicate detection -> `P0`
- primary page-flow modules -> `P1`
- UI-only or display-only modules -> `P2`

### 10.3 CLI Policy Hooks

Future-compatible generation policy:

- default mode:
  - generate `P0` + supported `P1`
- expanded mode:
  - generate `P0` + `P1` + selected `P2`
- report-only mode:
  - include all modeled cases in report, even if not generated

v2 does not need a new CLI flag yet, but data contracts must support this.

## 11. Module-Aware Decomposition

## 11.1 Motivation

Current page-level features are too coarse compared with the manual testcase docs.

Example:

- a page with search, tabs, infinite scroll, favorite toggle, and contact actions should not remain one feature with three scenarios only

## 11.2 Required Module Types for AiCard-Like Projects

Initial module taxonomy:

- `search`
- `tab-switch`
- `pagination`
- `empty-state`
- `count-display`
- `favorite-toggle`
- `contact-line`
- `contact-phone`
- `contact-email`
- `scan-permission`
- `scan-quota`
- `scan-field-mapping`
- `duplicate-check`
- `notification-read-state`
- `notification-menu`
- `settings-form`
- `settings-validation`

### 11.3 Extraction Rules

Feature Extractor v2 must:

1. keep top-level page/flow features
2. optionally decompose known page families into child module features
3. add parent/child linkage
4. preserve stable IDs

Example:

```ts
{
  featureId: "src-features-cardholder-pages-cardholderpage",
  moduleType: "page-flow"
}

{
  featureId: "src-features-cardholder-pages-cardholderpage-search",
  parentFeatureId: "src-features-cardholder-pages-cardholderpage",
  moduleType: "search"
}
```

## 12. Manual Testcase Reference Mapping

v2 should support optional mapping from generated cases back to manual testcase IDs.

Examples:

- `TC-04-SEARCH-001`
- `TC-SCAN-024`

### 12.1 Mapping Strategy

Mapping may be derived from:

- module family
- known failure mode
- target type
- explicit adapter rule

### 12.2 Acceptance

For supported AiCard module families, generated cases should carry `manualReferenceIds` when a stable mapping is known.

## 13. Generator Behavior Changes

## 13.1 Scenario Pool Builder

The scenario pool builder must become module-aware.

Instead of:

- `S01 success`
- `S02 failure`
- `S03 boundary`

it should support:

- `S01 happy_path`
- `S02 api_error`
- `S03 network_timeout`
- `S04 duplicate_data`
- `S05 validation_error`
- `S06 boundary_whitespace`

Not every module gets every scenario.

Scenarios must be selected by:

- module type
- target type
- risk
- known manual testcase family

## 13.2 Template Builders

Template builders must start consuming:

- `failureMode`
- `priority`
- `testData`
- `moduleType`

At minimum:

- service adapters must use `failureMode`
- validation modules must use `testData.values`
- report comments in generated files must show priority and failure mode

## 14. Report Behavior Changes

## 14.1 Markdown Report

`test-report.md` must add:

- scenario counts by priority
- scenario counts by failure mode
- scenario counts by module type
- top uncovered P0 cases
- manual-reference coverage summary

## 14.2 Failure Analysis

`failure-analysis.json` must include:

- `featureId`
- `featureName`
- `moduleType`
- `priority`
- `failureMode`
- `scenarioId`
- `scenarioName`
- `manualReferenceIds`

## 14.3 Risk Report

`risk-analysis.md` must highlight:

- uncovered `P0` cases
- uncovered cases for high-risk features
- blocked pending product-rule cases

## 15. Compatibility

v2 must remain backward-compatible with current v1 generated data where possible.

Rules:

- missing v2 fields must be tolerated
- report builder should infer safe defaults
- current adapters must continue working even before all module-aware decomposition rules are implemented

## 16. Implementation Scope Recommendation

Recommended rollout order:

1. add new generation-plan schema fields
2. add failure taxonomy rules
3. add priority assignment rules
4. add module-aware decomposition for one family first
   - recommended pilot: `cardholder`
5. add test data metadata for validation-heavy modules
6. upgrade reports
7. add manual testcase reference mapping

## 17. Acceptance Criteria

v2 is acceptable when all of the following are true:

1. generation plan supports `priority`, `failureMode`, `testData`, `moduleType`, and `manualReferenceIds`
2. at least one AiCard page family is decomposed into child modules
3. generated cases distinguish concrete failure types instead of using only generic `failure`
4. report outputs show scenario stats by priority, failure mode, and module type
5. `aicard_app` still completes full pipeline successfully
6. at least one generated feature family can be directly compared to its manual testcase document with meaningful overlap

## 18. Deferred After V2

The following should wait until after the above is stable:

- automated parsing of markdown testcase tables into structured JSON
- product-rule decision engine for `待釐清` cases
- expanded-mode CLI policy switches
- complete manual testcase coverage dashboard across all module families
