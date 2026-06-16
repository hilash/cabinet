/**
 * Slugify a heading's text into an in-page anchor id (PRD §11). Shared by the
 * editor's HeadingAnchors decoration and the markdown preview renderer so a
 * `#section` link resolves to the same element in both surfaces.
 */
export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * Inject `id` attributes into bare `<h1>`–`<h6>` tags of a rendered HTML
 * string, deduping repeats with a `-N` suffix (same scheme as the editor's
 * decoration). Assumes remark/rehype output (headings carry no attributes);
 * skips any heading that already has attributes.
 */
export function addHeadingIds(html: string): string {
  const seen = new Map<string, number>();
  return html.replace(/<(h[1-6])>([\s\S]*?)<\/\1>/g, (match, tag, inner) => {
    const text = String(inner).replace(/<[^>]+>/g, "");
    const base = slugifyHeading(text);
    if (!base) return match;
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    const id = n === 0 ? base : `${base}-${n}`;
    return `<${tag} id="${id}">${inner}</${tag}>`;
  });
}
