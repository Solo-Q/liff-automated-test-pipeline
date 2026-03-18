# LIFF Mock Automated Test Pipeline Implementation Spec

Version: v1.0-draft
Document Type: Future Development Spec
Audience: Frontend engineers, QA/SDET, tooling engineers, reviewers

## 1. Document Purpose

This document defines the v1 implementation specification for the LIFF Mock Automated Test Pipeline. It is intended to be used directly for engineering work, review, and maintenance.

This is not a vision document. Every section must be actionable, testable, and bounded.

## 2. Product Goal

Build a CLI tool that can perform the following for LIFF frontend projects:

1. Analyze whether the target project uses LIFF
2. Check and ensure `@line/liff-mock`
3. Create standardized LIFF testing scaffolding
4. Extract high-value features and LIFF dependency points
5. Generate unit and integration test skeletons
6. Run the project test pipeline
7. Produce machine-readable and human-readable reports

## 3. Scope

### 3.1 In Scope for v1

- Single frontend repository analysis
- Basic monorepo detection, with output restricted to a single target workspace
- `@line/liff` usage detection
- `@line/liff-mock` installation check and remediation
- Standard LIFF testing scaffold creation
- Feature map generation
- Unit and integration test case generation
- Minimal E2E case generation
- Test execution orchestration
- JSON and Markdown report output
- Dry-run mode
- Basic idempotent rerun support

### 3.2 Out of Scope for v1

- Real LINE credential and production container integration
- Automatic understanding of complex business rules
- Backend contract testing
- Patching multiple workspaces in one run
- Cross-repository analysis
- AI-based scenario enrichment
- PR comment bots

### 3.3 Deferred

- Smarter feature clustering
- Flaky classification enhancements
- Incremental partial regeneration
- Full test-stack plugin architecture
- Manual review UI

## 4. V1 Constraints

### 4.1 Repository Constraints

- Target must be a readable and writable repository
- `package.json` must exist
- Package manager must resolve to `npm`, `pnpm`, or `yarn`
- For monorepos, the tool must resolve a single LIFF workspace or fail

### 4.2 Framework Constraints

v1 guarantees support for:

- React + TypeScript
- React + JavaScript

Other frameworks may be analyzed, but patching and generation are not guaranteed.

### 4.3 Test Stack Constraints

v1 support priority:

1. Vitest
2. Jest
3. Playwright for E2E

If no supported test framework exists:

- `analyze` may still succeed
- `prepare` must not auto-install a brand new test stack
- `generate` should emit a plan and scaffold only, not executable tests

### 4.4 Safety Constraints

- New tool files and generated tests may be added
- Existing user-authored tests must not be overwritten by default
- Config updates must follow safe patch rules
- Re-running the same command must not duplicate scaffolding

## 5. Success Criteria

v1 is considered complete only when all of the following are true:

1. LIFF projects can be detected correctly
2. `@line/liff-mock` can be checked correctly
3. Missing `@line/liff-mock` can be installed in the correct place
4. Standard `testing/liff` scaffolding can be created
5. High-risk features receive a feature map and recommended test levels
6. At least success and failure scenarios are generated for each selected feature
7. Unit and integration flows can run, or a blocking reason is clearly reported
8. `summary.json` and `test-report.md` are produced

## 6. Architecture

### 6.1 Runtime

- Node.js
- TypeScript

### 6.2 Top-Level Modules

- CLI
- Orchestrator
- Analyzer
- Preparer
- Feature Extractor
- Test Generator
- Test Runner
- Report Builder
- Shared Schema, Logging, and File Mutation Utilities

### 6.3 Module Ownership

- CLI: command parsing and exit code handling
- Orchestrator: stage sequencing and state handoff
- Analyzer: repository profile and LIFF usage detection
- Preparer: dependency ensure, scaffold creation, config patching
- Feature Extractor: feature map and risk scoring
- Test Generator: test definitions and generated files
- Test Runner: test execution and artifact collection
- Report Builder: report generation

## 7. File Layout

```text
project/
  testing/
    liff/
      setupLiffMock.ts
      fixtures.ts
      applyFixture.ts
      resetFixture.ts
      types.ts
  tests/
    generated/
      unit/
      integration/
      e2e/
  reports/
    latest/
      test-report.md
      summary.json
      coverage-summary.json
      failure-analysis.json
      risk-analysis.md
  .liff-testgen/
    project-profile.json
    liff-usage-report.json
    existing-test-map.json
    feature-map.json
    generation-plan.json
    pipeline-state.json
```

### 7.1 Rules

- `testing/liff/*` is scaffolded by the tool
- `tests/generated/*` is tool-owned output
- `.liff-testgen/*` stores pipeline state and intermediate metadata
- `reports/latest/*` stores the most recent report set

## 8. CLI Contract

### 8.1 Commands

```bash
liff-testgen analyze <repoPath>
liff-testgen prepare <repoPath>
liff-testgen extract-features <repoPath>
liff-testgen generate <repoPath>
liff-testgen run <repoPath>
liff-testgen report <repoPath>
liff-testgen pipeline <repoPath>
```

### 8.2 Common Options

- `--dry-run`
- `--workspace <name>`
- `--json`
- `--verbose`

### 8.3 Exit Codes

- `0`: success
- `1`: unexpected internal error
- `2`: invalid CLI arguments
- `3`: unsupported project type
- `4`: repository not writable
- `5`: package manager unresolved
- `6`: workspace resolution failed
- `7`: prepare failed
- `8`: generation failed
- `9`: test execution failed
- `10`: report build failed

### 8.4 Stdout and Stderr Rules

- stdout: stage summaries and human-readable progress
- stderr: error summaries
- when `--json` is set, stdout must contain a single structured payload only

## 9. Shared Data Contracts

### 9.1 `project-profile.json`

```ts
interface ProjectProfile {
  schemaVersion: '1'
  repoPath: string
  packageManager: 'npm' | 'pnpm' | 'yarn'
  framework: 'react' | 'unknown'
  language: 'ts' | 'js' | 'mixed'
  monorepo: boolean
  workspaces: string[]
  targetWorkspace: string | null
  unitTestFramework: 'vitest' | 'jest' | null
  e2eFramework: 'playwright' | null
  usesLiff: boolean
  hasLiffMock: boolean
  hasLiffAdapter: boolean
}
```

### 9.2 `liff-usage-report.json`

```ts
interface LiffUsageReport {
  schemaVersion: '1'
  importFiles: string[]
  directCallFiles: string[]
  adapterCandidateFiles: string[]
  detectedApis: string[]
}
```

### 9.3 `feature-map.json`

```ts
interface FeatureMapItem {
  featureId: string
  name: string
  files: string[]
  dependsOnLiff: boolean
  risk: 'low' | 'medium' | 'high'
  recommendedTests: Array<'unit' | 'integration' | 'e2e'>
  existingTests: string[]
  extractionSource: Array<'route' | 'component' | 'hook' | 'handler' | 'liff-entry'>
  reviewStatus: 'auto' | 'confirmed' | 'skipped'
}
```

### 9.4 `generation-plan.json`

```ts
interface TestCaseDefinition {
  id: string
  featureId: string
  level: 'unit' | 'integration' | 'e2e'
  scenarioType: 'success' | 'failure' | 'boundary'
  title: string
  fixture: string
  outputPath: string
  expectedOutcome: string[]
}
```

### 9.5 `pipeline-state.json`

```ts
interface PipelineState {
  schemaVersion: '1'
  lastRunAt: string
  completedStages: string[]
  generatorVersion: string
  dryRun: boolean
  fileMutations: Array<{
    path: string
    action: 'create' | 'update' | 'skip' | 'conflict'
  }>
}
```

## 10. Module Specs

## 10.1 Analyzer

### Responsibility

- Scan basic repository metadata
- Detect LIFF usage
- Detect test stack
- Build initial profile and usage report

### Inputs

- repository path
- optional workspace override

### Outputs

- `.liff-testgen/project-profile.json`
- `.liff-testgen/liff-usage-report.json`
- `.liff-testgen/existing-test-map.json`

### Detection Rules

LIFF usage is true when any of the following holds:

- `package.json` includes `@line/liff`
- source code imports `@line/liff`
- source code contains `liff.init(`
- source code contains known API calls such as `liff.getProfile(` or `liff.isLoggedIn(`

Test framework detection:

- Vitest: dependency or config file exists
- Jest: dependency or config file exists
- Playwright: dependency or config file exists

### Failure Modes

- missing `package.json`
- package manager cannot be resolved
- repository unreadable
- monorepo workspace cannot be uniquely resolved

### Acceptance Criteria

- produces a valid `project-profile.json`
- `usesLiff` detection is testable against sample repos
- non-LIFF repos return a clear unsupported result

## 10.2 Preparer

### Responsibility

- Ensure `@line/liff-mock`
- Create `testing/liff` scaffold
- Create or patch test config fragments
- Build fixture vocabulary

### Inputs

- `project-profile.json`
- `liff-usage-report.json`

### Outputs

- `testing/liff/*`
- optional config patch results
- updated `pipeline-state.json`

### File Mutations

May create:

- `testing/liff/setupLiffMock.ts`
- `testing/liff/fixtures.ts`
- `testing/liff/applyFixture.ts`
- `testing/liff/resetFixture.ts`
- `testing/liff/types.ts`

May patch:

- `package.json`
- test config files

### Patch Rules

- if a scaffold file does not exist: create
- if a scaffold file is tool-owned and manual blocks are intact: update
- if a file exists but is not tool-owned: skip and record
- if a config patch cannot be safely anchored: conflict and fail `prepare`

### Acceptance Criteria

- missing `@line/liff-mock` can be installed correctly
- reruns do not duplicate scaffold files
- dry-run lists every planned mutation

## 10.3 Feature Extractor

### Responsibility

- Build feature map
- Evaluate risk
- Recommend test levels

### Inputs

- source tree
- `project-profile.json`
- `existing-test-map.json`
- `liff-usage-report.json`

### Extraction Rules

Feature candidates may come from:

- route or page files
- container components
- submit handlers
- async business actions
- hooks with LIFF or API side effects

### Risk Score Rules

- depends on login state: +2
- uses profile or token data: +2
- has side effects: +2
- lacks existing tests: +1
- contains multiple error branches: +1

Risk mapping:

- `0-1`: low
- `2-4`: medium
- `5+`: high

### Output Rules

- every feature must have a stable `featureId`
- every feature must include primary files
- if a name cannot be inferred, derive from file path

### Acceptance Criteria

- sample repos produce a non-empty feature map
- high-risk features recommend `integration` or `e2e`
- reruns on the same repo produce stable `featureId` values

## 10.4 Test Generator

### Responsibility

- Turn feature maps into test definitions
- Generate test files for the detected stack
- Preserve manual extension blocks

### Inputs

- `feature-map.json`
- `project-profile.json`
- scaffold files

### Outputs

- `generation-plan.json`
- `tests/generated/unit/*`
- `tests/generated/integration/*`
- `tests/generated/e2e/*`

### Generation Rules

Each selected feature must generate:

- 1 success case
- 1 failure case
- 1 boundary case when inferable

Unit targets:

- adapter or service
- hooks
- isolated utils

Integration targets:

- page-level flow
- LIFF + API + router interaction

E2E generation is allowed only when:

- `risk = high`
- an entry flow can be identified
- Playwright is present

### Manual Block Rules

Every generated test file must include:

```ts
// <autogen:start>
// generated content
// <autogen:end>

// <manual:start>
// custom cases
// <manual:end>
```

### Acceptance Criteria

- reruns update only the autogen block
- manual block content remains unchanged
- unsupported stacks produce a generation plan but no invalid executable test files

## 10.5 Test Runner

### Responsibility

- Run the test stages
- Collect coverage and artifacts
- Normalize results

### Inputs

- `project-profile.json`
- generated tests
- local test config

### Execution Order

1. optional lint
2. optional typecheck
3. unit
4. integration
5. e2e

### Retry Rules

- unit: 0
- integration: 0 or 1
- e2e: 0 or 1

### Outputs

- raw runner outputs
- junit xml when available
- coverage summary when available
- execution summary

### Acceptance Criteria

- runner failures and test failures are distinguishable
- each stage reports pass or fail status
- missing coverage is explicitly marked unavailable

## 10.6 Report Builder

### Responsibility

- Aggregate pipeline state
- Generate reports
- Produce failure and risk summaries

### Inputs

- runner outputs
- feature map
- pipeline state

### Outputs

- `reports/latest/test-report.md`
- `reports/latest/summary.json`
- `reports/latest/coverage-summary.json`
- `reports/latest/failure-analysis.json`
- `reports/latest/risk-analysis.md`

### Failure Categories

- `LIFF_INIT_MISSING`
- `PROFILE_ERROR_UNHANDLED`
- `LOADING_STATE_MISSING`
- `ASYNC_TIMING_ISSUE`
- `FIXTURE_MISMATCH`
- `API_ERROR_UNSURFACED`
- `NAVIGATION_LOOP`
- `ENVIRONMENT_CONFIG_ISSUE`

### Acceptance Criteria

- Markdown report is human-readable
- JSON summary is machine-readable
- report contains stage results, failure summary, and risk summary

## 11. File Mutation Rules

### 11.1 General

All write operations must resolve to exactly one of:

- `create`
- `update`
- `skip`
- `conflict`

### 11.2 Safe Update Conditions

Updates are allowed only when:

- the file is tool-owned
- the update is confined to the autogen block
- the config patch anchor is unique

### 11.3 Conflict Conditions

The tool must mark `conflict` when:

- a patch anchor is not unique
- user edits are found inside a tool-owned region with no manual boundary
- the monorepo target workspace is not unique
- the detected test stack does not match the scaffold template requirements

### 11.4 Dry Run

`--dry-run` must output:

- planned stages
- planned file mutations
- planned dependency installs
- expected conflicts

## 12. Error Handling Spec

### 12.1 Error Shape

```ts
interface PipelineError {
  stage: string
  errorCode: string
  message: string
  suggestion?: string
  rawDetail?: string
}
```

### 12.2 Recoverable Errors

- missing `@line/liff-mock`
- missing scaffold
- partial feature extraction failures
- unavailable coverage

### 12.3 Blocking Errors

- non-frontend project
- unresolved package manager
- repository not writable
- workspace resolution failed
- test config patch conflict
- unsupported test stack when direct execution is requested

## 13. Observability Spec

### 13.1 Structured Log Fields

- `timestamp`
- `stage`
- `event`
- `repoPath`
- `workspace`
- `filePath`
- `featureId`
- `result`
- `durationMs`
- `errorCode`

### 13.2 Required Events

- `analysis_started`
- `analysis_completed`
- `dependency_installed`
- `scaffold_created`
- `feature_extracted`
- `test_generated`
- `test_run_started`
- `test_run_completed`
- `report_exported`

## 14. Verification Strategy

### 14.1 Golden Repositories

The verification suite must include:

- LIFF React + Vitest repo
- LIFF React + Jest repo
- monorepo with one LIFF workspace
- non-LIFF frontend repo
- repo with existing adapter
- repo with conflicting config

### 14.2 Verification Types

- schema validation
- generated file snapshot validation
- rerun idempotency checks
- dry-run output checks
- CLI exit code checks
- integration tests against sample repos

### 14.3 Done Criteria

Completion can only be claimed when:

- sample repo pipelines run successfully
- reruns produce no meaningless diffs
- manual blocks are preserved
- report files are emitted correctly

## 15. Engineering Task Breakdown

## Epic A: Core CLI and Orchestration

### A-1 CLI bootstrap

- Build the CLI entrypoint
- Support commands and common options
- Deliverable: executable CLI skeleton
- Depends on: none
- Acceptance: `analyze`, `prepare`, and `pipeline` parse correctly

### A-2 Orchestrator

- Build the stage runner and context handoff
- Deliverable: unified pipeline execution flow
- Depends on: A-1
- Acceptance: blocking errors stop subsequent stages

### A-3 Exit code and error formatter

- Implement error mapping and stdout or stderr behavior
- Deliverable: standard error output
- Depends on: A-1
- Acceptance: known error categories map to correct exit codes

## Epic B: Analyzer

### B-1 Package manager detection

- Detect npm, pnpm, and yarn
- Deliverable: package manager resolver
- Depends on: A-2
- Acceptance: sample repos resolve correctly

### B-2 Framework and language detection

- Detect React, TypeScript, and JavaScript
- Deliverable: core project profile fields
- Depends on: B-1
- Acceptance: profile contains correct language and framework

### B-3 LIFF usage detection

- Scan imports and direct calls
- Deliverable: LIFF usage report
- Depends on: B-1
- Acceptance: import files, direct call files, and detected APIs are listed

### B-4 Test stack detection

- Detect Vitest, Jest, and Playwright
- Deliverable: test stack profile
- Depends on: B-1
- Acceptance: sample repos are classified correctly

### B-5 Existing test map builder

- Scan existing test files and associations
- Deliverable: `existing-test-map.json`
- Depends on: B-4
- Acceptance: existing test file paths are captured

## Epic C: Preparer

### C-1 Dependency ensure

- Check for and install `@line/liff-mock`
- Deliverable: dependency installer
- Depends on: B-1, B-3
- Acceptance: installs only when missing

### C-2 Scaffold builder

- Create `testing/liff/*`
- Deliverable: fixed scaffold template set
- Depends on: C-1
- Acceptance: reruns are idempotent

### C-3 Config patcher

- Inject test config fragments
- Deliverable: safe patch utility
- Depends on: C-2
- Acceptance: unique anchors patch successfully, ambiguous anchors conflict

### C-4 Dry-run mutation planner

- Produce a mutation preview
- Deliverable: dry-run planning output
- Depends on: C-1, C-2, C-3
- Acceptance: no files are written during dry-run

## Epic D: Feature Extraction

### D-1 Route and component scanner

- Build candidate feature sets
- Deliverable: candidate feature list
- Depends on: B-3
- Acceptance: routes, pages, and components can seed features

### D-2 Risk scorer

- Implement fixed-weight scoring
- Deliverable: risk score calculator
- Depends on: D-1
- Acceptance: risk labels map to spec-defined thresholds

### D-3 Feature map serializer

- Emit `feature-map.json`
- Deliverable: stable feature identifiers
- Depends on: D-2
- Acceptance: reruns on the same repo keep stable IDs

## Epic E: Test Generation

### E-1 Test definition planner

- Convert feature maps to generation plans
- Deliverable: `generation-plan.json`
- Depends on: D-3
- Acceptance: each generated feature has success and failure cases

### E-2 Unit template generator

- Generate unit test files
- Deliverable: `tests/generated/unit/*`
- Depends on: E-1, C-2
- Acceptance: files include autogen and manual blocks

### E-3 Integration template generator

- Generate integration test files
- Deliverable: `tests/generated/integration/*`
- Depends on: E-1, C-2
- Acceptance: files can reference LIFF scaffolding

### E-4 Minimal E2E generator

- Generate minimal high-risk E2E cases
- Deliverable: `tests/generated/e2e/*`
- Depends on: E-1, B-4
- Acceptance: generation only occurs when Playwright exists

### E-5 Regeneration logic

- Update autogen blocks while preserving manual blocks
- Deliverable: safe regeneration utility
- Depends on: E-2, E-3, E-4
- Acceptance: manual content remains untouched

## Epic F: Test Runner

### F-1 Runner adapter

- Normalize Vitest, Jest, and Playwright execution
- Deliverable: runner abstraction
- Depends on: B-4
- Acceptance: correct runner is selected from profile

### F-2 Artifact collector

- Collect stdout, stderr, junit, and coverage
- Deliverable: normalized artifact set
- Depends on: F-1
- Acceptance: runner output is persisted in a standard shape

### F-3 Stage execution summary

- Export stage results
- Deliverable: run summary model
- Depends on: F-2
- Acceptance: execution errors and assertion failures are distinguishable

## Epic G: Report Builder

### G-1 Summary builder

- Generate `summary.json`
- Deliverable: machine-readable run summary
- Depends on: F-3
- Acceptance: total, passed, failed, skipped, and flaky are present

### G-2 Markdown report builder

- Generate `test-report.md`
- Deliverable: human-readable report
- Depends on: G-1, D-3
- Acceptance: report includes stage summary, feature coverage, and failures

### G-3 Failure classification

- Map failures to standard categories
- Deliverable: `failure-analysis.json`
- Depends on: F-3
- Acceptance: known failures classify into spec-defined categories

### G-4 Risk analysis report

- Generate untested high-risk summaries
- Deliverable: `risk-analysis.md`
- Depends on: D-3, G-1
- Acceptance: high-risk features without tests are highlighted

## Epic H: Verification

### H-1 Sample repos setup

- Create golden repositories
- Deliverable: verification fixtures
- Depends on: none
- Acceptance: at least five sample repository types are available

### H-2 CLI integration tests

- Validate commands end-to-end
- Deliverable: CLI integration test suite
- Depends on: A through G
- Acceptance: primary commands are covered

### H-3 Idempotency and dry-run tests

- Verify rerun and dry-run behavior
- Deliverable: safety test suite
- Depends on: C and E
- Acceptance: reruns avoid duplicate changes and dry-run writes nothing

## 16. Implementation Order

Recommended order:

1. A-1, A-2, A-3
2. B-1, B-2, B-3, B-4
3. C-1, C-2
4. D-1, D-2, D-3
5. E-1, E-2, E-3
6. F-1, F-2, F-3
7. G-1, G-2
8. C-3, C-4, E-4, E-5
9. G-3, G-4
10. H-1, H-2, H-3

## 17. Non-Negotiable Spec Rules

All future additions to this project must follow these rules:

- no new state file without a defined schema
- no new module without acceptance criteria
- no user file mutation without a documented mutation rule
- no deferred v1.5 or v2 scope inside blocking v1 scope
- no new CLI command without exit codes and failure modes

## 18. Immediate Next Step

The next engineering work should start with:

- CLI skeleton
- Analyzer foundation
- `@line/liff-mock` dependency ensure
- scaffold builder
- sample repositories for verification
