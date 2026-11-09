"use client";

import { getClassName } from "@bht-component-registry/class-names";
import {
  ROLES,
  contrastReport,
  roleToken,
  type Role,
  type Theme,
  type ThemeOverrides,
} from "@/lib/theme/scheme";
import styles from "./theme-role-grid.module.scss";

type Scheme = "light" | "dark";

/**
 * Every colour role as a light/dark swatch pair with its value. A swatch is a
 * colour input: pick a colour and that role is overridden for that scheme
 * (the override travels with the URL and into the config snippet); the ×
 * next to it puts the generated value back. Pairs whose text does not reach
 * 4.5:1 on its background are flagged below the grid.
 */
export function ThemeRoleGrid({
  theme,
  overrides,
  onOverride,
}: {
  theme: Theme;
  overrides: ThemeOverrides | null;
  onOverride: (scheme: Scheme, role: Role, value: string | null) => void;
}) {
  const [rootClass, getChildClass] = getClassName({
    rootClass: "ThemeRoleGrid",
    styles,
  });
  const failing = (["light", "dark"] as const).flatMap((scheme) =>
    contrastReport(theme[scheme])
      .filter((entry) => !entry.passes)
      .map((entry) => ({ scheme, ...entry })),
  );

  return (
    <section className={rootClass} aria-labelledby="theme-roles">
      <h2 id="theme-roles">Colour roles</h2>
      <p className={getChildClass("lead")}>
        Click a swatch to set that role by hand; × restores the generated
        value. Light and dark are edited separately.
      </p>
      <table className={getChildClass("table")}>
        <thead>
          <tr>
            <th scope="col">Role</th>
            <th scope="col">Light</th>
            <th scope="col">Dark</th>
          </tr>
        </thead>
        <tbody>
          {ROLES.map((role) => (
            <tr key={role}>
              <th scope="row">
                <code>{roleToken(role)}</code>
              </th>
              {(["light", "dark"] as const).map((scheme) => (
                <RoleCell
                  key={scheme}
                  scheme={scheme}
                  role={role}
                  value={theme[scheme][role]}
                  overridden={Boolean(overrides?.[scheme]?.[role])}
                  onOverride={onOverride}
                  getChildClass={getChildClass}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className={getChildClass("contrast")}>
        {/* Only the summary line is live, so a picker drag announces one sentence, not the list. */}
        <p role="status">
          {failing.length === 0
            ? "Every text role reaches 4.5:1 on its background in both schemes."
            : `${failing.length} pair${failing.length === 1 ? "" : "s"} below 4.5:1 (WCAG AA for text):`}
        </p>
        {failing.length > 0 && (
          <>
            <ul>
              {failing.map((entry) => (
                <li key={`${entry.scheme}-${entry.text}`}>
                  {entry.scheme}: <code>{roleToken(entry.text)}</code> on{" "}
                  <code>{roleToken(entry.background)}</code> — {entry.ratio}:1
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}

function RoleCell({
  scheme,
  role,
  value,
  overridden,
  onOverride,
  getChildClass,
}: {
  scheme: Scheme;
  role: Role;
  value: string;
  overridden: boolean;
  onOverride: (scheme: Scheme, role: Role, value: string | null) => void;
  getChildClass: (name: string) => string;
}) {
  return (
    <td className={getChildClass("cell")}>
      <label className={getChildClass("swatch-label")}>
        <input
          type="color"
          className={getChildClass("swatch")}
          aria-label={`${roleToken(role)} (${scheme})`}
          value={value}
          onChange={(e) => onOverride(scheme, role, e.target.value)}
        />
        <code>{value}</code>
      </label>
      {overridden && (
        <button
          type="button"
          className={getChildClass("reset")}
          onClick={() => onOverride(scheme, role, null)}
          aria-label={`Reset ${roleToken(role)} (${scheme}) to the generated value`}
          title="Back to the generated value"
        >
          ×
        </button>
      )}
    </td>
  );
}
