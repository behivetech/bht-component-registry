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

export interface DocsJson {
  $schema: string;
  version: number;
  generatedAt: string;
  docs: DocComponent[];
}

export declare const isComponentSource: (file: string) => boolean;
export declare function componentSourceFiles(dir: string): string[];
export declare function createDocgen(): FileParser;
export declare function propType(prop: PropItem): string;
export declare function inheritsNative(source: string, displayName: string): boolean;
export declare function toDocs(parsed: ComponentDoc[], dir: string): DocComponent[];
export declare function documentPackage(dir: string, parser?: FileParser): DocComponent[];
export declare const DOCS_JSON_VERSION: number;
export declare function docsJsonFor(dir: string): DocsJson;
