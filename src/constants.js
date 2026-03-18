export const COMMANDS = new Set([
  "analyze",
  "prepare",
  "extract-features",
  "generate",
  "run",
  "report",
  "pipeline",
]);

export const EXIT_CODES = {
  SUCCESS: 0,
  INTERNAL_ERROR: 1,
  INVALID_ARGUMENTS: 2,
  UNSUPPORTED_PROJECT: 3,
  REPOSITORY_NOT_WRITABLE: 4,
  PACKAGE_MANAGER_UNRESOLVED: 5,
  WORKSPACE_RESOLUTION_FAILED: 6,
  PREPARE_FAILED: 7,
  GENERATION_FAILED: 8,
  TEST_EXECUTION_FAILED: 9,
  REPORT_BUILD_FAILED: 10,
};
