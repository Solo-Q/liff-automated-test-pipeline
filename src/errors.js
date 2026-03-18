export class CliError extends Error {
  constructor(message, exitCode, options = {}) {
    super(message);
    this.name = "CliError";
    this.exitCode = exitCode;
    this.stage = options.stage ?? "cli";
    this.errorCode = options.errorCode ?? "CLI_ERROR";
    this.suggestion = options.suggestion;
  }
}
