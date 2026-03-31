import TurndownService from "turndown";
// @ts-expect-error — no types available for this package
import { gfm } from "turndown-plugin-gfm";

const turndown = new TurndownService({
  headingStyle: "atx",
  hr: "---",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
  fence: "```",
  emDelimiter: "*",
  strongDelimiter: "**",
});

// Add GFM support (tables, strikethrough, task lists)
turndown.use(gfm);

// Preserve line breaks in code blocks
turndown.addRule("codeBlock", {
  filter: (node) => {
    return (
      node.nodeName === "PRE" &&
      node.firstChild !== null &&
      node.firstChild.nodeName === "CODE"
    );
  },
  replacement: (_content, node) => {
    const code = node.firstChild as HTMLElement;
    const lang = code.getAttribute("class")?.replace("language-", "") || "";
    const text = code.textContent || "";
    return `\n\`\`\`${lang}\n${text}\n\`\`\`\n`;
  },
});

// Convert wiki-links back to [[Page Name]] syntax
turndown.addRule("wikiLink", {
  filter: (node) => {
    return (
      node.nodeName === "A" &&
      node.getAttribute("data-wiki-link") === "true"
    );
  },
  replacement: (content, node) => {
    const pageName =
      (node as HTMLElement).getAttribute("data-page-name") || content;
    return `[[${pageName}]]`;
  },
});

export function htmlToMarkdown(html: string): string {
  return turndown.turndown(html);
}
