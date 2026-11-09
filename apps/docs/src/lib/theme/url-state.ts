import {
  CONTRAST_LEVELS,
  ROLES,
  SCHEME_VARIANTS,
  isHex,
  normalizeHex,
  type ContrastLevel,
  type Role,
  type SchemeVariant,
  type ThemeOverrides,
  type ThemeSeeds,
} from "./scheme";

/**
 * A theme in a URL fragment, so a builder session is a link: `#p=2c1760&s=43b505
 * &v=vibrant&c=high&ol=primary:112233,onPrimary:ffffff&od=…`. Hex values
 * travel without the `#`. Pure, so it is unit tested; the builder reads it
 * on mount and rewrites it on every change.
 */

const strip = (hex: string) => hex.replace(/^#/, "");
const seedParam = (value: string | null | undefined) =>
  value ? strip(value) : null;

function overridesParam(edits: Partial<Record<Role, string>> | undefined): string | null {
  const entries = Object.entries(edits ?? {}).filter(([, v]) => isHex(v));
  if (entries.length === 0) return null;
  return entries.map(([role, hex]) => `${role}:${strip(hex)}`).join(",");
}

export function serializeTheme(seeds: ThemeSeeds): string {
  const params = new URLSearchParams();
  const put = (key: string, value: string | null) => {
    if (value) params.set(key, value);
  };
  put("p", seedParam(seeds.primary));
  put("s", seedParam(seeds.secondary));
  put("t", seedParam(seeds.tertiary));
  put("n", seedParam(seeds.neutral));
  if (seeds.scheme && seeds.scheme !== "tonalspot") put("v", seeds.scheme);
  if (seeds.contrast && seeds.contrast !== "standard") put("c", seeds.contrast);
  put("ol", overridesParam(seeds.overrides?.light));
  put("od", overridesParam(seeds.overrides?.dark));
  return params.toString();
}

const hexParam = (params: URLSearchParams, key: string): string | null => {
  const raw = params.get(key);
  if (!raw) return null;
  return normalizeHex(raw.startsWith("#") ? raw : `#${raw}`);
};

function parseOverrides(raw: string | null): Partial<Record<Role, string>> | undefined {
  if (!raw) return undefined;
  const out: Partial<Record<Role, string>> = {};
  for (const pair of raw.split(",")) {
    const [role, hex] = pair.split(":");
    if (!role || !hex || !(ROLES as readonly string[]).includes(role)) continue;
    const value = normalizeHex(`#${hex.replace(/^#/, "")}`);
    if (value) out[role as Role] = value;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** The seeds a fragment describes, or null when it names no primary. */
export function parseTheme(fragment: string): ThemeSeeds | null {
  const params = new URLSearchParams(fragment.replace(/^#/, ""));
  const primary = hexParam(params, "p");
  if (!primary) return null;
  const scheme = params.get("v");
  const contrast = params.get("c");
  const overrides: ThemeOverrides = {};
  const light = parseOverrides(params.get("ol"));
  const dark = parseOverrides(params.get("od"));
  if (light) overrides.light = light;
  if (dark) overrides.dark = dark;
  return {
    primary,
    secondary: hexParam(params, "s"),
    tertiary: hexParam(params, "t"),
    neutral: hexParam(params, "n"),
    scheme: (SCHEME_VARIANTS as readonly string[]).includes(scheme ?? "")
      ? (scheme as SchemeVariant)
      : "tonalspot",
    contrast:
      contrast && Object.hasOwn(CONTRAST_LEVELS, contrast) ? (contrast as ContrastLevel) : "standard",
    overrides: light || dark ? overrides : null,
  };
}

/** The `site.theme` object for registry.config.json: only what differs from the defaults. */
export function configSnippet(seeds: ThemeSeeds): string {
  const theme: Record<string, unknown> = { primary: seeds.primary };
  if (seeds.secondary) theme.secondary = seeds.secondary;
  if (seeds.tertiary) theme.tertiary = seeds.tertiary;
  if (seeds.neutral) theme.neutral = seeds.neutral;
  if (seeds.scheme && seeds.scheme !== "tonalspot") theme.scheme = seeds.scheme;
  if (seeds.contrast && seeds.contrast !== "standard") theme.contrast = seeds.contrast;
  const overrides: Record<string, unknown> = {};
  if (seeds.overrides?.light && Object.keys(seeds.overrides.light).length > 0)
    overrides.light = seeds.overrides.light;
  if (seeds.overrides?.dark && Object.keys(seeds.overrides.dark).length > 0)
    overrides.dark = seeds.overrides.dark;
  if (Object.keys(overrides).length > 0) theme.overrides = overrides;
  return JSON.stringify({ theme }, null, 2).replace(/^\{\n|\n\}$/g, "");
}
