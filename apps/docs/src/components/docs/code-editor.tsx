"use client";

import { Editor } from "react-live";
import { themes } from "prism-react-renderer";

export interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  className?: string;
}

/**
 * The editable source under a live example.
 *
 * Its own module so that the editor, its highlighter and their themes load
 * only when a reader opens "Edit code" (see `LiveExample`), not with every page
 * that has a live block.
 */
export default function CodeEditor({
  code,
  onChange,
  className,
}: CodeEditorProps) {
  return (
    <Editor
      code={code}
      onChange={onChange}
      language="tsx"
      theme={themes.nightOwl}
      className={className}
    />
  );
}
