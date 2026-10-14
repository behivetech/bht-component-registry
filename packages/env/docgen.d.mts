import type { ComponentDoc, FileParser, PropItem } from "react-docgen-typescript";

export interface DocProp {
  name: string;
  type: string;
  required: boolean;
  defaultValue: string | null;
  description: string;
}

export interface DocComponent {
  displayName: string;
  description: string;
  props: DocProp[];
  extendsNative: boolean;
}

export interface DocParam {
  name: string;
  type: string;
  optional: boolean;
  /** The `@param` text, if any. */
  description: string;
}

export interface DocSignature {
  /** `useToggle(initial?: boolean): [boolean, () => void]` */
  text: string;
  params: DocParam[];
  returns: { type: string; description: string };
}

/** An exported hook (`useX`) or utility function, read with the TypeScript compiler API. */
export interface DocFunction {
  name: string;
  kind: "hook" | "function";
  description: string;
  signatures: DocSignature[];
  /** The `@example` blocks, as code. */
  examples: string[];
}

export interface DocsJson {
  $schema: string;
  version: number;
  generatedAt: string;
  docs: DocComponent[];
  functions: DocFunction[];
}

export declare const isComponentSource: (file: string) => boolean;
export declare function componentSourceFiles(dir: string): string[];
export declare function createDocgen(): FileParser;
export declare function propType(prop: PropItem): string;
export declare function inheritsNative(source: string, displayName: string): boolean;
export declare function toDocs(parsed: ComponentDoc[], dir: string): DocComponent[];
export declare function documentPackage(dir: string, parser?: FileParser): DocComponent[];
export declare const isFunctionSource: (file: string) => boolean;
export declare function functionSourceFiles(dir: string): string[];
export declare function createFunctionProgram(files: string[]): import("typescript").Program;
export declare function toFunctionDocs(program: import("typescript").Program, dir: string): DocFunction[];
export declare function documentFunctions(dir: string): DocFunction[];
export declare const DOCS_JSON_VERSION: number;
export declare function docsJsonFor(dir: string): DocsJson;
