import { spawn } from "node:child_process";

export type Runner = (args: string[], cwd: string) => Promise<number>;

/**
 * pnpm is spawned with inherited stdio on purpose: install and build output is
 * long, and buffering it would hide progress and the real error until the very
 * end. `shell` only on Windows, where `pnpm` is a .cmd shim spawn cannot exec.
 */
export const runPnpm: Runner = (args, cwd) =>
  new Promise((resolve, reject) => {
    const child = spawn("pnpm", args, { cwd, stdio: "inherit", shell: process.platform === "win32" });
    child.on("error", (error: NodeJS.ErrnoException) => {
      reject(
        error.code === "ENOENT"
          ? new Error(
              "pnpm was not found on your PATH. Enable it with `corepack enable` (ships with Node) or see https://pnpm.io/installation.",
            )
          : error,
      );
    });
    child.on("close", (code) => resolve(code ?? 1));
  });

export interface CaptureResult {
  code: number;
  stdout: string;
  stderr: string;
}

/** Runs a command quietly and returns what it printed. */
export function capture(command: string, args: string[], cwd: string): Promise<CaptureResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32",
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

/**
 * `update` replaces whole files, so the only safe starting point is a tree
 * where `git diff` afterwards shows exactly what the template changed and
 * nothing of the owner's is at risk. Not a git repo counts as not clean: there
 * would be no diff to review and no way back.
 */
export async function isGitTreeClean(cwd: string): Promise<boolean> {
  try {
    const result = await capture("git", ["status", "--porcelain"], cwd);
    return result.code === 0 && result.stdout.trim() === "";
  } catch {
    return false;
  }
}
