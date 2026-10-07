import pc from "picocolors";

/**
 * Every line the CLI prints goes through a Logger, so commands can be tested
 * without spying on `console`, and so the terminal shape (two-space indent,
 * one glyph per kind of line) matches the author's other create-* CLIs.
 */
export interface Logger {
  info(message: string): void;
  success(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  blank(): void;
}

export const log: Logger = {
  info: (message) => console.log(`  ${message}`),
  success: (message) => console.log(`  ${pc.green("✓")} ${message}`),
  warn: (message) => console.warn(`  ${pc.yellow("!")} ${message}`),
  error: (message) => console.error(`  ${pc.red("✗")} ${message}`),
  blank: () => console.log(),
};

export interface MemoryLogger {
  log: Logger;
  lines: string[];
}

/** Collects output in memory; tests assert on `lines` instead of stdout. */
export function createMemoryLogger(): MemoryLogger {
  const lines: string[] = [];
  return {
    lines,
    log: {
      info: (message) => lines.push(message),
      success: (message) => lines.push(`✓ ${message}`),
      warn: (message) => lines.push(`! ${message}`),
      error: (message) => lines.push(`✗ ${message}`),
      blank: () => lines.push(""),
    },
  };
}

/** A thrown value as one line, without the stack (users get the stack with DEBUG). */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
