import { useEffect, useState } from "react";
import type { SandboxScope } from "./sandbox-base-scope";
import { loadSandboxScope } from "./sandbox-scope";

/** A program together with the scope it was loaded for. */
export interface LoadedProgram {
  code: string;
  /** Travels with the code it belongs to, so the two cannot drift while an edit loads. */
  noInline: boolean;
  scope: SandboxScope;
}

/**
 * Loads the registry packages a program references and returns the last
 * program whose packages have all arrived.
 *
 * The code and its scope travel together: while an edit that references a
 * new package is still loading, the previous program keeps rendering with its
 * own scope instead of flashing a "not defined" error for the new one.
 *
 * @param program the program to load, or null while there is none
 * @returns the loaded program (null until the first load) and a load error, if any
 */
export const useSandboxScope = (
  program: Pick<LoadedProgram, "code" | "noInline"> | null,
): { program: LoadedProgram | null; error: string | null } => {
  const code = program?.code ?? null;
  const noInline = program?.noInline ?? false;
  const [loaded, setLoaded] = useState<LoadedProgram | null>(null);
  const [failure, setFailure] = useState<{ code: string; message: string }>();

  useEffect(() => {
    if (code === null) return undefined;
    let current = true;
    loadSandboxScope(code).then(
      (scope) => {
        if (current) {
          setLoaded({ code, noInline, scope });
          setFailure(undefined);
        }
      },
      (error: unknown) => {
        if (current)
          setFailure({
            code,
            message: error instanceof Error ? error.message : String(error),
          });
      },
    );
    return () => {
      current = false;
    };
  }, [code, noInline]);

  return {
    program: loaded,
    error: failure && failure.code === code ? failure.message : null,
  };
};
