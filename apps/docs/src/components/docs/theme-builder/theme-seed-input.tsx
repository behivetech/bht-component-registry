"use client";

import { useId, useState } from "react";
import { getClassName } from "@bht-component-registry/class-names";
import { normalizeHex } from "@/lib/theme/scheme";
import styles from "./theme-seed-input.module.scss";

/**
 * One seed colour: a native colour picker and a hex field that agree, plus a
 * clear button for the optional seeds (cleared, MD3 derives the role from the
 * primary again). Typing is forgiving — `abc`, `#ABC123`, with or without the
 * hash — and an unfinished value is held locally until it parses.
 */
export function ThemeSeedInput({
  label,
  hint,
  value,
  required = false,
  onChange,
}: {
  label: string;
  /** What happens when the seed is empty. */
  hint?: string;
  value: string | null;
  required?: boolean;
  onChange: (value: string | null) => void;
}) {
  const id = useId();
  const [text, setText] = useState(value ?? "");
  // A new value from outside (the picker, a URL change) replaces what was
  // typed: derived state, adjusted during render as React recommends.
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    setSeen(value);
    setText(value ?? "");
  }

  const [rootClass, getChildClass] = getClassName({
    rootClass: "ThemeSeedInput",
    styles,
    modifiers: { empty: !value },
  });

  const commit = (raw: string) => {
    setText(raw);
    if (raw.trim() === "") {
      if (!required) onChange(null);
      return;
    }
    const hex = normalizeHex(raw.startsWith("#") ? raw : `#${raw}`);
    if (hex) onChange(hex);
  };

  return (
    <div className={rootClass}>
      <label htmlFor={`${id}-hex`} className={getChildClass("label")}>
        {label}
        {!required && hint && !value && (
          <span className={getChildClass("hint")}> · {hint}</span>
        )}
      </label>
      <div className={getChildClass("controls")}>
        <input
          type="color"
          className={getChildClass("picker")}
          aria-label={`${label} colour picker`}
          value={value ?? "#808080"}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          id={`${id}-hex`}
          type="text"
          className={getChildClass("hex")}
          inputMode="text"
          spellCheck={false}
          placeholder={required ? "#rrggbb" : "auto"}
          value={text}
          onChange={(e) => commit(e.target.value)}
        />
        {!required && value && (
          <button
            type="button"
            className={getChildClass("clear")}
            onClick={() => onChange(null)}
            aria-label={`Clear ${label}`}
            title="Derive from the primary again"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
