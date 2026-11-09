import {
  DynamicScheme,
  Hct,
  MaterialDynamicColors,
  SchemeContent,
  SchemeExpressive,
  SchemeFidelity,
  SchemeMonochrome,
  SchemeNeutral,
  SchemeTonalSpot,
  SchemeVibrant,
  TonalPalette,
  argbFromHex,
  hexFromArgb,
} from "@material/material-color-utilities";

/**
 * The Material Design 3 colour engine behind the site's own theme and the
 * theme builder page. One function, `buildScheme`, turns a handful of seed
 * colours into every `--md-sys-color-*` role for the light and the dark
 * scheme, using Google's own algorithm (`@material/material-color-utilities`,
 * the reference implementation of MD3 dynamic colour). The same module runs at build
 * time (the catalog generator writes `src/generated/theme.css` from
 * `registry.config.json#site.theme`) and in the browser (the builder), so what
 * a visitor downloads is exactly what the docs site renders.
 *
 * Pure: no DOM, no Node APIs.
 */

/** The scheme variants MD3 defines; `tonalspot` is the Material default. */
export const SCHEME_VARIANTS = [
  "tonalspot",
  "vibrant",
  "expressive",
  "fidelity",
  "content",
  "neutral",
  "monochrome",
] as const;
export type SchemeVariant = (typeof SCHEME_VARIANTS)[number];

/** MD3 contrast levels: 0 is the spec, 0.5 medium, 1 high. */
export const CONTRAST_LEVELS = { standard: 0, medium: 0.5, high: 1 } as const;
export type ContrastLevel = keyof typeof CONTRAST_LEVELS;

/** The seeds and options a theme is built from — what `site.theme` holds. */
export interface ThemeSeeds {
  /** The primary seed, `#rrggbb`. Required. */
  primary: string;
  /** A pinned secondary seed; omitted, MD3 derives a muted secondary from the primary. */
  secondary?: string | null;
  /** A pinned tertiary seed; omitted, MD3 derives one by hue rotation. */
  tertiary?: string | null;
  /** A neutral seed: surfaces take its hue at low chroma; omitted, they follow the primary. */
  neutral?: string | null;
  scheme?: SchemeVariant | null;
  contrast?: ContrastLevel | null;
  /** Hand edits to individual roles, laid over the generated values. */
  overrides?: ThemeOverrides | null;
}

/** The colour roles emitted per scheme, in the token sheet's order, as camelCase `MaterialDynamicColors` keys. */
export const ROLES = [
  "primary",
  "onPrimary",
  "primaryContainer",
  "onPrimaryContainer",
  "secondary",
  "onSecondary",
  "secondaryContainer",
  "onSecondaryContainer",
  "tertiary",
  "onTertiary",
  "tertiaryContainer",
  "onTertiaryContainer",
  "error",
  "onError",
  "errorContainer",
  "onErrorContainer",
  "background",
  "onBackground",
  "surface",
  "onSurface",
  "surfaceVariant",
  "onSurfaceVariant",
  "surfaceDim",
  "surfaceBright",
  "surfaceContainerLowest",
  "surfaceContainerLow",
  "surfaceContainer",
  "surfaceContainerHigh",
  "surfaceContainerHighest",
  "outline",
  "outlineVariant",
  "inverseSurface",
  "inverseOnSurface",
  "inversePrimary",
  "scrim",
  "shadow",
] as const;
export type Role = (typeof ROLES)[number];

/** Every role's hex value for one scheme. */
export type SchemeColors = Record<Role, string>;

export interface Theme {
  light: SchemeColors;
  dark: SchemeColors;
}

/** Per-role hand edits laid over the generated values, per scheme. */
export interface ThemeOverrides {
  light?: Partial<Record<Role, string>>;
  dark?: Partial<Record<Role, string>>;
}

/** The custom-property suffix for a role: `onPrimaryContainer` → `on-primary-container`. */
export const roleToken = (role: Role) =>
  `--md-sys-color-${role.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;

export const HEX = /^#[0-9a-fA-F]{6}$/;
export const isHex = (value: unknown): value is string =>
  typeof value === "string" && HEX.test(value);

/** `#ABC123` → `#abc123`; a 3-digit form expands. Returns null for anything else. */
export function normalizeHex(value: string): string | null {
  const text = value.trim();
  if (HEX.test(text)) return text.toLowerCase();
  const short = /^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/.exec(text);
  if (short) return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`.toLowerCase();
  return null;
}

const VARIANT_SCHEMES = {
  tonalspot: SchemeTonalSpot,
  vibrant: SchemeVibrant,
  expressive: SchemeExpressive,
  fidelity: SchemeFidelity,
  content: SchemeContent,
  neutral: SchemeNeutral,
  monochrome: SchemeMonochrome,
} as const;

/**
 * A pinned accent seed keeps its own hue and chroma: the point of pinning
 * `secondary` to a brand green is a green secondary, not MD3's muted take on
 * the primary. Very grey seeds are floored so the role still reads as a colour.
 */
const ACCENT_MIN_CHROMA = 16;
const accentPalette = (hex: string) => {
  const hct = Hct.fromInt(argbFromHex(hex));
  return TonalPalette.fromHueAndChroma(hct.hue, Math.max(hct.chroma, ACCENT_MIN_CHROMA));
};

/** Neutral palettes stay nearly grey whatever the seed: MD3's own chroma (4 and 8), tinted toward the seed's hue. */
const NEUTRAL_CHROMA = 4;
const NEUTRAL_VARIANT_CHROMA = 8;

function dynamicScheme(seeds: ThemeSeeds, isDark: boolean): DynamicScheme {
  const variant = seeds.scheme ?? "tonalspot";
  const contrast = CONTRAST_LEVELS[seeds.contrast ?? "standard"];
  const Scheme = VARIANT_SCHEMES[variant];
  const source = Hct.fromInt(argbFromHex(seeds.primary));
  const base = new Scheme(source, isDark, contrast);
  const neutralHue = seeds.neutral
    ? Hct.fromInt(argbFromHex(seeds.neutral)).hue
    : null;
  const pinned =
    seeds.secondary || seeds.tertiary || neutralHue !== null
      ? new DynamicScheme({
          sourceColorHct: source,
          variant: base.variant,
          contrastLevel: contrast,
          isDark,
          primaryPalette: base.primaryPalette,
          secondaryPalette: seeds.secondary
            ? accentPalette(seeds.secondary)
            : base.secondaryPalette,
          tertiaryPalette: seeds.tertiary
            ? accentPalette(seeds.tertiary)
            : base.tertiaryPalette,
          neutralPalette:
            neutralHue === null
              ? base.neutralPalette
              : TonalPalette.fromHueAndChroma(neutralHue, NEUTRAL_CHROMA),
          neutralVariantPalette:
            neutralHue === null
              ? base.neutralVariantPalette
              : TonalPalette.fromHueAndChroma(neutralHue, NEUTRAL_VARIANT_CHROMA),
          errorPalette: base.errorPalette,
        })
      : base;
  return pinned;
}

function colorsOf(scheme: DynamicScheme): SchemeColors {
  const out = {} as SchemeColors;
  for (const role of ROLES) {
    out[role] = hexFromArgb(
      MaterialDynamicColors[role].getArgb(scheme),
    ).toLowerCase();
  }
  return out;
}

/**
 * Every MD3 colour role for both schemes, from the seeds. Throws on a seed
 * that is not `#rrggbb` so a typo in registry.config.json fails the build
 * with a clear message instead of a black site.
 */
export function buildScheme(seeds: ThemeSeeds): Theme {
  for (const key of ["primary", "secondary", "tertiary", "neutral"] as const) {
    const value = seeds[key];
    if (value == null || value === "") continue;
    if (!isHex(value))
      throw new Error(
        `site.theme.${key}: "${value}" is not a hex colour of the form #rrggbb.`,
      );
  }
  if (!isHex(seeds.primary))
    throw new Error("site.theme.primary is required and must be #rrggbb.");
  return {
    light: colorsOf(dynamicScheme(seeds, false)),
    dark: colorsOf(dynamicScheme(seeds, true)),
  };
}

/** `buildScheme` plus the seeds' own overrides: what the site and the builder both render. */
export function buildTheme(seeds: ThemeSeeds): Theme {
  return applyOverrides(buildScheme(seeds), seeds.overrides);
}

/** The theme with hand overrides applied (invalid or unknown entries are ignored). */
export function applyOverrides(theme: Theme, overrides?: ThemeOverrides | null): Theme {
  if (!overrides) return theme;
  const merge = (base: SchemeColors, edits?: Partial<Record<Role, string>>) => {
    const out = { ...base };
    for (const [role, value] of Object.entries(edits ?? {})) {
      if ((ROLES as readonly string[]).includes(role) && isHex(value))
        out[role as Role] = value.toLowerCase();
    }
    return out;
  };
  return {
    light: merge(theme.light, overrides.light),
    dark: merge(theme.dark, overrides.dark),
  };
}

const declarations = (colors: SchemeColors, indent: string) =>
  ROLES.map((role) => `${indent}${roleToken(role)}: ${colors[role]};`).join("\n");

/**
 * The stylesheet for a theme, in the same three blocks as the token sheet so
 * it layers over it by cascade order alone: light on `:root`, dark for the OS
 * preference unless the page forces light, and dark when the page forces it.
 * `--site-dark-*` are the dark scheme's surface roles as fixed values, for
 * chrome that stays dark in both schemes (the site header with a light
 * wordmark). `header` names what produced the sheet, for the file's own record.
 */
export function themeCss(theme: Theme, header = "Generated Material Design 3 theme."): string {
  const dark = theme.dark;
  return [
    `/* ${header} */`,
    `/* Import your token sheet first; this file overrides its colour roles. */`,
    `:root {`,
    declarations(theme.light, "  "),
    `  --site-dark-surface: ${dark.surfaceContainer};`,
    `  --site-dark-on-surface: ${dark.onSurface};`,
    `  --site-dark-on-surface-variant: ${dark.onSurfaceVariant};`,
    `  --site-dark-primary: ${dark.primary};`,
    `}`,
    ``,
    `@media (prefers-color-scheme: dark) {`,
    `  :root:not([data-theme="light"]) {`,
    declarations(dark, "    "),
    `  }`,
    `}`,
    ``,
    `:root[data-theme="dark"] {`,
    declarations(dark, "  "),
    `}`,
    ``,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Contrast — WCAG 2.x relative luminance, so the builder can flag a pair that
// a hand edit (or an unusual seed) pushed below 4.5:1.
// ---------------------------------------------------------------------------

const channel = (v: number) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return (
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255)
  );
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** The `on-*` role for each coloured role: text that must read on it. */
export const CONTRAST_PAIRS: [text: Role, background: Role][] = [
  ["onPrimary", "primary"],
  ["onPrimaryContainer", "primaryContainer"],
  ["onSecondary", "secondary"],
  ["onSecondaryContainer", "secondaryContainer"],
  ["onTertiary", "tertiary"],
  ["onTertiaryContainer", "tertiaryContainer"],
  ["onError", "error"],
  ["onErrorContainer", "errorContainer"],
  ["onBackground", "background"],
  ["onSurface", "surface"],
  ["onSurfaceVariant", "surfaceVariant"],
  ["inverseOnSurface", "inverseSurface"],
  ["primary", "surface"],
];

export const MIN_TEXT_CONTRAST = 4.5;

export interface ContrastEntry {
  text: Role;
  background: Role;
  ratio: number;
  /** False when the pair is below 4.5:1, WCAG AA for body text. */
  passes: boolean;
}

/** Every pair's ratio for one scheme, lowest first. */
export function contrastReport(colors: SchemeColors): ContrastEntry[] {
  return CONTRAST_PAIRS.map(([text, background]) => {
    const ratio = contrastRatio(colors[text], colors[background]);
    return {
      text,
      background,
      ratio: Math.round(ratio * 100) / 100,
      passes: ratio >= MIN_TEXT_CONTRAST,
    };
  }).sort((a, b) => a.ratio - b.ratio);
}
