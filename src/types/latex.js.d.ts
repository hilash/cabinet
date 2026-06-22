declare module "latex.js" {
  export class Generator {
    constructor(options?: { hyphenate?: boolean; CustomMacros?: unknown });
  }

  export class HtmlGenerator {
    domFragment(): DocumentFragment;
    stylesAndScripts(baseURL?: string): DocumentFragment;
    htmlDocument(baseURL?: string): HTMLDocument;
    applyLengthsAndGeometryToDom(element: HTMLElement): void;
  }

  export function parse(
    latex: string,
    options?: { generator?: Generator }
  ): HtmlGenerator;

  export class SyntaxError extends Error {}

  export class LaTeXJSComponent extends HTMLElement {}
}
