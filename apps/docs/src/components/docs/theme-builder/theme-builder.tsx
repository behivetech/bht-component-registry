"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useHashSeeds } from "./use-hash-seeds";
import { getClassName } from "@behivetech/bht-class-names";
import {
  CONTRAST_LEVELS,
  SCHEME_VARIANTS,
  buildTheme,
  themeCss,
  type ContrastLevel,
  type Role,
  type SchemeVariant,
  type ThemeSeeds,
} from "@/lib/theme/scheme";
import { ThemeSeedInput } from "./theme-seed-input";
import { ThemeRoleGrid } from "./theme-role-grid";
import { ThemePreview } from "./theme-preview";
import { ThemeExport } from "./theme-export";
import styles from "./theme-builder.module.scss";

const DEFAULT_PRIMARY = "#6750a4";

const SCHEME_LABELS: Record<SchemeVariant, string> = {
  tonalspot: "Tonal spot (Material default)",
  vibrant: "Vibrant",
  expressive: "Expressive",
  fidelity: "Fidelity (primary stays close to the seed)",
  content: "Content",
  neutral: "Neutral",
  monochrome: "Monochrome",
};

const normalizeSeeds = (seeds: ThemeSeeds | null): ThemeSeeds => ({
  primary: seeds?.primary ?? DEFAULT_PRIMARY,
  secondary: seeds?.secondary ?? null,
  tertiary: seeds?.tertiary ?? null,
  neutral: seeds?.neutral ?? null,
  scheme: seeds?.scheme ?? "tonalspot",
  contrast: seeds?.contrast ?? "standard",
  overrides: seeds?.overrides ?? null,
});

/**
 * The interactive theme builder. Its state is the seeds object `site.theme`
 * holds, and it lives in the URL fragment (see useHashSeeds): open the page
 * with `#p=2c1760&s=43b505` and that is the theme. Everything else (every
 * role, the CSS, the contrast report) is derived on each render from
 * `buildTheme`, the same function the build runs, so nothing here can drift
 * from what the site ships.
 */
export function ThemeBuilder({
  initial,
  tokensPackage,
}: {
  /** This site's own seeds from registry.config.json, the starting point. */
  initial: ThemeSeeds | null;
  /** The published package that carries the token sheet, for the install instructions. */
  tokensPackage: string | null;
}) {
  const fallback = useMemo(() => normalizeSeeds(initial), [initial]);
  const [seeds, setSeeds] = useHashSeeds(fallback);
  const [applied, setApplied] = useState(false);

  const theme = useMemo(() => buildTheme(seeds), [seeds]);
  const css = useMemo(
    () =>
      themeCss(
        theme,
        `Material Design 3 theme from the registry theme builder — primary ${seeds.primary}, scheme ${seeds.scheme ?? "tonalspot"}.`,
      ),
    [theme, seeds.primary, seeds.scheme],
  );

  // "Apply to this page": one <style> after everything else, so the whole
  // site previews the theme, media queries included, until unchecked.
  useEffect(() => {
    if (!applied) return;
    const style = document.createElement("style");
    style.setAttribute("data-theme-preview", "");
    style.textContent = css;
    document.head.append(style);
    return () => style.remove();
  }, [applied, css]);

  const setSeed = useCallback(
    (key: "primary" | "secondary" | "tertiary" | "neutral", value: string | null) =>
      setSeeds((prev) => ({ ...prev, [key]: value })),
    [setSeeds],
  );
  const setOverride = useCallback(
    (scheme: "light" | "dark", role: Role, value: string | null) =>
      setSeeds((prev) => {
        const current = { ...(prev.overrides?.[scheme] ?? {}) };
        if (value) current[role] = value;
        else delete current[role];
        const overrides = { ...(prev.overrides ?? {}), [scheme]: current };
        if (Object.keys(current).length === 0) delete overrides[scheme];
        return {
          ...prev,
          overrides: Object.keys(overrides).length > 0 ? overrides : null,
        };
      }),
    [setSeeds],
  );

  const [rootClass, getChildClass] = getClassName({
    rootClass: "ThemeBuilder",
    styles,
  });

  return (
    <div className={rootClass}>
      <section className={getChildClass("seeds")} aria-labelledby="theme-seeds">
        <h2 id="theme-seeds">Seeds</h2>
        <div className={getChildClass("seed-row")}>
          <ThemeSeedInput
            label="Primary"
            value={seeds.primary}
            required
            onChange={(v) => setSeed("primary", v ?? DEFAULT_PRIMARY)}
          />
          <ThemeSeedInput
            label="Secondary"
            hint="derived from the primary"
            value={seeds.secondary ?? null}
            onChange={(v) => setSeed("secondary", v)}
          />
          <ThemeSeedInput
            label="Tertiary"
            hint="derived from the primary"
            value={seeds.tertiary ?? null}
            onChange={(v) => setSeed("tertiary", v)}
          />
          <ThemeSeedInput
            label="Neutral"
            hint="surfaces follow the primary"
            value={seeds.neutral ?? null}
            onChange={(v) => setSeed("neutral", v)}
          />
        </div>
        <div className={getChildClass("seed-row")}>
          <label className={getChildClass("select")}>
            <span>Scheme</span>
            <select
              value={seeds.scheme ?? "tonalspot"}
              onChange={(e) =>
                setSeeds((prev) => ({ ...prev, scheme: e.target.value as SchemeVariant }))
              }
            >
              {SCHEME_VARIANTS.map((variant) => (
                <option key={variant} value={variant}>
                  {SCHEME_LABELS[variant]}
                </option>
              ))}
            </select>
          </label>
          <label className={getChildClass("select")}>
            <span>Contrast</span>
            <select
              value={seeds.contrast ?? "standard"}
              onChange={(e) =>
                setSeeds((prev) => ({ ...prev, contrast: e.target.value as ContrastLevel }))
              }
            >
              {(Object.keys(CONTRAST_LEVELS) as ContrastLevel[]).map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </label>
          <label className={getChildClass("apply")}>
            <input
              type="checkbox"
              checked={applied}
              onChange={(e) => setApplied(e.target.checked)}
            />
            <span>Preview on this site</span>
          </label>
        </div>
      </section>

      <ThemePreview theme={theme} />

      <ThemeRoleGrid
        theme={theme}
        overrides={seeds.overrides ?? null}
        onOverride={setOverride}
      />

      <ThemeExport seeds={seeds} css={css} tokensPackage={tokensPackage} />
    </div>
  );
}
