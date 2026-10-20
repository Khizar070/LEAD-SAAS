type LogLevel = "info" | "warn" | "error" | "debug";

interface LogPayload {
  [key: string]: unknown;
}

class Logger {
  private formatMessage(level: LogLevel, message: string, context?: LogPayload) {
    const timestamp = new Date().toISOString();
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...context,
    });
  }

  info(message: string, context?: LogPayload) {
    console.log(this.formatMessage("info", message, context));
  }

  warn(message: string, context?: LogPayload) {
    console.warn(this.formatMessage("warn", message, context));
  }

  error(message: string, context?: LogPayload) {
    console.error(this.formatMessage("error", message, context));
  }

  debug(message: string, context?: LogPayload) {
    if (process.env.NODE_ENV !== "production") {
      console.debug(this.formatMessage("debug", message, context));
    }
  }
}

export const logger = new Logger();
