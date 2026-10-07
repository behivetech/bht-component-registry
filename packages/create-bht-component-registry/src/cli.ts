import { parseArgs } from "node:util";
import { create } from "./commands/create.js";
import { update } from "./commands/update.js";
import { errorMessage, log } from "./lib/log.js";
import { CLI_NAME, readOwnVersion } from "./lib/version.js";

const HELP = `
  ${CLI_NAME} — scaffold a component registry that stays in git, and keep it current.

  Usage
    npx ${CLI_NAME} <dir> [options]            scaffold a new registry
    npx ${CLI_NAME} create <dir> [options]     same, spelled out
    npx ${CLI_NAME} update [options]           run inside an existing registry

  create options
    --scope <name>               npm scope without the @ (required; prompted if missing)
    --registry <url>             registry to publish to (default: https://registry.npmjs.org)
    --categories <a,b,c>         starter categories (default: atoms,molecules,organisms,templates,forms)
    --template-version <x.y.z>   template release to download (default: this CLI's version)
    --no-install                 skip \`pnpm install\` and \`pnpm build\`
    -y, --yes                    accept defaults instead of prompting

  update options
    --to <x.y.z>                 template version to update to (default: this CLI's version)
    --dry-run                    list what would change and change nothing
    -y, --yes                    apply without asking

  both
    --from <path>                dev mode: use a local checkout of the template instead of downloading
    -h, --help                   show this help
    -v, --version                print the version

  Hosted & expanded version: https://platform.behivetech.com
`;

/**
 * Dispatch only. Commands return exit codes instead of calling process.exit,
 * so the same functions run under vitest; this file is the one place that
 * talks to the process.
 */
async function main(argv: string[]): Promise<number> {
  let parsed: ReturnType<typeof parseArgs>;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        scope: { type: "string" },
        registry: { type: "string" },
        categories: { type: "string" },
        "template-version": { type: "string" },
        to: { type: "string" },
        from: { type: "string" },
        "no-install": { type: "boolean" },
        "dry-run": { type: "boolean" },
        yes: { type: "boolean", short: "y" },
        help: { type: "boolean", short: "h" },
        version: { type: "boolean", short: "v" },
      },
    });
  } catch (error) {
    log.error(`${errorMessage(error)} Run with --help for usage.`);
    return 1;
  }
  const { values, positionals } = parsed;
  const string = (key: string): string | undefined => {
    const value = values[key];
    return typeof value === "string" ? value : undefined;
  };
  const flag = (key: string): boolean => values[key] === true;

  if (flag("version")) {
    console.log(readOwnVersion());
    return 0;
  }
  if (flag("help") || positionals.length === 0) {
    console.log(HELP);
    return flag("help") ? 0 : 1;
  }

  const [command, ...rest] = positionals;
  if (command === "update") {
    return update({ to: string("to"), from: string("from"), dryRun: flag("dry-run"), yes: flag("yes") });
  }

  const dir = command === "create" ? rest[0] : command;
  const categories = string("categories");
  return create({
    dir,
    scope: string("scope"),
    registry: string("registry"),
    categories: categories === undefined ? undefined : categories.split(","),
    templateVersion: string("template-version"),
    from: string("from"),
    install: !flag("no-install"),
    yes: flag("yes"),
  });
}

main(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    log.error(errorMessage(error));
    process.exitCode = 1;
  },
);
