export function createLogger({ json = false, verbose = false } = {}) {
  function log(level, message, meta = {}) {
    if (json) {
      console.error(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level,
          message,
          ...meta,
        }),
      );
      return;
    }

    if (level === "debug" && !verbose) {
      return;
    }

    const suffix = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
    console.log(`[${level}] ${message}${suffix}`);
  }

  return {
    info(message, meta) {
      log("info", message, meta);
    },
    debug(message, meta) {
      log("debug", message, meta);
    },
    error(message, meta) {
      if (json) {
        log("error", message, meta);
        return;
      }
      const suffix = meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
      console.error(`[error] ${message}${suffix}`);
    },
  };
}
