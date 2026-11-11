import {
  exportIndex,
  registryDependencies,
  registryLoaders,
  registryStyles,
  type RegistryModule,
} from "@/generated/registry-scope";
import { BASE_SCOPE, type SandboxScope } from "./sandbox-base-scope";
import {
  analyzeProgram,
  resolvePackages,
  stylePackages,
} from "./sandbox-resolve";

// One load per package per document (each sandbox frame is its own document,
// so this is the per-frame cache). The promise is cached, so programs that
// need the same package at once share one request.
const loaded = new Map<string, Promise<RegistryModule>>();

const loadPackage = (packageName: string): Promise<RegistryModule> => {
  let pending = loaded.get(packageName);
  if (!pending) {
    pending = registryLoaders[packageName]!();
    loaded.set(packageName, pending);
    // A failed chunk request must not poison the cache: the next program retries.
    pending.catch(() => loaded.delete(packageName));
  }
  return pending;
};

const styled = new Set<string>();
// Stylesheets go in one at a time, in the order asked for: a sheet is added to
// the document when its load starts, and the cascade follows that order.
let styleQueue: Promise<unknown> = Promise.resolve();

const loadStyles = (packageNames: string[]): Promise<unknown> => {
  const wanted = packageNames.filter(
    (name) => registryStyles[name] && !styled.has(name),
  );
  const done = wanted.reduce(
    (queue, name) =>
      queue.then(async () => {
        await registryStyles[name]!();
        styled.add(name);
      }),
    styleQueue,
  );
  // A failed sheet must not block every later program.
  styleQueue = done.catch(() => undefined);
  return done;
};

/**
 * The scope for one program: React and the hooks, plus the exports of only
 * the registry packages the program references.
 *
 * Examples and README snippets are written against package imports, which the
 * catalog generator strips, so the sandbox puts the same names in scope. An
 * example for `FormFieldManaged` uses `TextField`, `Select` and `Button` from
 * three other packages; resolving by exported name finds all of them. A name
 * in no package is simply absent, and react-live reports it as not defined.
 *
 * @param code the program source
 * @returns the scope, once every package the program needs has loaded
 */
export const loadSandboxScope = async (code: string): Promise<SandboxScope> => {
  const packages = resolvePackages(code, exportIndex);
  const [modules] = await Promise.all([
    Promise.all(packages.map(loadPackage)),
    loadStyles(stylePackages(packages, registryDependencies)),
  ]);
  // A name the program declares itself stays out of the scope: both in scope
  // and declared would be "Identifier already declared".
  const { declarations } = analyzeProgram(code);
  const exports = modules.flatMap((loadedModule) =>
    Object.entries(loadedModule).filter(
      ([name]) => name !== "default" && !declarations.has(name),
    ),
  );
  return { ...BASE_SCOPE, ...Object.fromEntries(exports) };
};
