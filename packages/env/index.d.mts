import type { Options } from "tsup";

export declare function createComponentConfig(overrides?: Partial<Options> & { esbuildPlugins?: Options["esbuildPlugins"] }): Options;
