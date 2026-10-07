import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  CONFIG_FILE,
  compareVersions,
  findRegistryRoot,
  isVersion,
  parseRegistryConfig,
  readRegistryConfig,
  scopeProblemMessage,
  serializeRegistryConfig,
  titleCaseScope,
  writeRegistryConfig,
  type RegistryConfig,
} from "./config.js";

const sample: RegistryConfig = {
  $schema: "./registry.config.schema.json",
  scope: "acme",
  npmRegistry: "https://registry.npmjs.org",
  templateVersion: "0.1.0",
  site: { title: "Acme Component Registry", description: "Docs.", links: [{ label: "GitHub", href: "https://x" }] },
};

describe("registry.config.json", () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), "bht-config-"));
  });

  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true });
  });

  it("round-trips through write and read, with a trailing newline", async () => {
    await writeRegistryConfig(tmp, sample);
    expect(await readRegistryConfig(tmp)).toEqual(sample);
    expect(serializeRegistryConfig(sample).endsWith("}\n")).toBe(true);
  });

  it("keeps fields it does not know about", () => {
    const text = JSON.stringify({ ...sample, future: { flag: true }, site: { ...sample.site, theme: "dark" } });
    const parsed = parseRegistryConfig(text) as RegistryConfig & { future?: unknown; site: { theme?: string } };
    expect(parsed.future).toEqual({ flag: true });
    expect(parsed.site.theme).toBe("dark");
  });

  it("names the missing field and the file", () => {
    expect(() => parseRegistryConfig(JSON.stringify({ ...sample, scope: "" }))).toThrow(
      `${CONFIG_FILE}: "scope" must be a non-empty string.`,
    );
    expect(() => parseRegistryConfig(JSON.stringify({ ...sample, site: { description: "x" } }))).toThrow(/"title"/);
    expect(() => parseRegistryConfig("{ nope")).toThrow(/not valid JSON/);
    expect(() => parseRegistryConfig("[]")).toThrow(/must be a JSON object/);
  });

  it("finds the registry root from a nested directory", async () => {
    await writeRegistryConfig(tmp, sample);
    const nested = join(tmp, "registry", "acme", "atoms");
    await mkdir(nested, { recursive: true });
    expect(findRegistryRoot(nested)).toBe(tmp);
    expect(findRegistryRoot(tmp)).toBe(tmp);
  });

  it("returns null when no ancestor has a config", async () => {
    const empty = join(tmp, "elsewhere");
    await mkdir(empty);
    await writeFile(join(empty, "package.json"), "{}");
    expect(findRegistryRoot(empty)).toBeNull();
  });
});

describe("scopeProblemMessage", () => {
  it("explains an empty scope", () => {
    expect(scopeProblemMessage("")).toMatch(/Scope is required/);
  });

  it("explains the format for 'Bad Scope'", () => {
    expect(scopeProblemMessage("Bad Scope")).toBe(
      "Scope must be lowercase letters, digits and hyphens, 1–40 chars, e.g. acme → @acme/*.",
    );
  });

  it("names a reserved word", () => {
    expect(scopeProblemMessage("dashboard")).toBe("'dashboard' is reserved; pick another scope.");
  });

  it("accepts 'acme'", () => {
    expect(scopeProblemMessage("acme")).toBeNull();
    expect(scopeProblemMessage("bobsburgers")).toBeNull();
    expect(scopeProblemMessage("acme-corp")).toBeNull();
  });
});

describe("titleCaseScope", () => {
  it("capitalises each hyphenated part", () => {
    expect(titleCaseScope("bobsburgers")).toBe("Bobsburgers");
    expect(titleCaseScope("acme-corp")).toBe("Acme Corp");
    expect(titleCaseScope("example")).toBe("Example");
  });
});

describe("versions", () => {
  it("compares x.y.z numerically", () => {
    expect(compareVersions("0.1.0", "0.2.0")).toBe(-1);
    expect(compareVersions("0.10.0", "0.9.0")).toBe(1);
    expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
  });

  it("rejects anything that is not x.y.z", () => {
    expect(isVersion("1.2.3")).toBe(true);
    expect(isVersion("v1.2.3")).toBe(false);
    expect(isVersion("1.2.3-beta.1")).toBe(false);
    expect(() => compareVersions("main", "0.1.0")).toThrow(/not a version/);
  });
});
