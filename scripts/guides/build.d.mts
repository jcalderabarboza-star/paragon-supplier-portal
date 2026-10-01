// Types for `build.mjs`, so the spec surface (`tsc -p tsconfig.vitest.json`)
// can import the parser the gates run. The shapes are the JSON's; the app reads
// them through `src/guides/types.ts`, which is the authority.
import type { GuideRegistry, ProcessGuide } from '../../src/guides/types';

export declare const DEFAULT_SRC: string;
export declare const DEFAULT_OUT: string;
export declare const SECTION_KEYS: readonly string[];
export declare const STEP_KINDS: readonly string[];
export declare const OWNERS: readonly string[];
export declare const LOCALES: readonly string[];
export declare class GuideBuildError extends Error {
  readonly code: string;
  readonly file: string;
  constructor(code: string, file: string, message: string);
}
export declare function parseGuide(text: string, file: string): ProcessGuide;
export declare function guideFiles(srcDir: string): string[];
export declare function buildGuides(srcDir?: string): GuideRegistry;
export declare function serialize(registry: GuideRegistry): string;
export declare function writeIfChanged(out: string, text: string): boolean;
