type LogLevel = "info" | "warn" | "error";

type SerializableContext = Record<string, unknown>;

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  if (typeof error === "string") {
    return { message: error };
  }

  return { message: "Unknown error", value: error };
}

function write(
  level: LogLevel,
  message: string,
  context?: SerializableContext,
) {
  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    context,
  };

  if (level === "error") {
    console.error(JSON.stringify(payload));
    return;
  }

  if (level === "warn") {
    console.warn(JSON.stringify(payload));
    return;
  }

  console.info(JSON.stringify(payload));
}

export const monitor = {
  info(message: string, context?: SerializableContext) {
    write("info", message, context);
  },

  warn(message: string, context?: SerializableContext) {
    write("warn", message, context);
  },

  error(message: string, error?: unknown, context?: SerializableContext) {
    write("error", message, {
      ...context,
      error: error ? serializeError(error) : undefined,
    });
  },
};
