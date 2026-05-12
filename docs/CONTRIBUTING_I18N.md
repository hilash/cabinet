# Contributing translations

Cabinet ships in English and Hebrew today. This doc explains how to add a
string, audit what's still hardcoded, and add a third locale when the time
comes.

## Where strings live

```
src/i18n/
  index.ts                  i18next init (eager-loaded namespaces)
  use-locale.ts             useLocale() hook: { t, locale, setLocale, dir }
  formatters.ts             Intl-based date/time/number helpers
  locales/
    en/
      common.json           verbs, generic labels, nav, AI panel
      dialogs.json          New Page, New Cabinet, etc.
      editor.json           Editor toolbar + page header
      onboarding.json       Wizard intro, welcome, verify states
      settings.json         Settings page tabs + appearance copy
      sidebar.json          Sidebar tooltips + toasts
      tour.json             Onboarding tour modal
    he/                     <same namespaces, Hebrew strings>
```

App locale lives in `localStorage` under `cabinet-locale` (`en` | `he`). A
pre-hydration inline script in `src/app/layout.tsx` reads it and sets
`<html dir>` / `<html lang>` before first paint so RTL doesn't flash.

Per-document direction is separate: every page's `dir: ltr | rtl` lives in
its markdown frontmatter (`src/types/index.ts`). The editor reads it and
respects it, even if the app chrome is the opposite direction.

## Adding a string

1. **Decide on a namespace.** Use the closest fit from the table above. New
   surface? Add a new namespace file in both `en/` and `he/` and register
   it in `src/i18n/index.ts` (both `resources` and the `ns` array in
   `i18n.init`).
2. **Add the key to `en/{ns}.json`.** Prefer nested objects (`toolbar.bold`)
   over flat keys (`toolbarBold`).
3. **Add the Hebrew translation to `he/{ns}.json`.** If you can't translate
   it, leave it empty (`""`) — `i18n.init` falls back to English at
   render time, and the empty value flags it for review.
4. **Wrap the call site:**
   ```tsx
   import { useLocale } from "@/i18n/use-locale";

   export function MyComponent() {
     const { t } = useLocale();
     return <button title={t("editor:toolbar.bold")}>...</button>;
   }
   ```
5. **For interpolated values:**
   ```tsx
   t("sidebar:refreshedWithChanges", { added, removed })
   // JSON: "refreshedWithChanges": "Refreshed — {{added}} added, {{removed}} removed."
   ```

## Finding what's still hardcoded

A regex-based detector lists every file that still has user-facing English
text outside of a `t()` call:

```sh
npm run i18n:report
```

Output is grouped by file with sample hits. False positives happen (the
detector is conservative, not perfect), but it's the right starting point
for "what's left." Treat the count as a budget that should trend down.

## Extracting keys from t() calls

`i18next-parser` walks the source tree and updates the locale JSON files
in place — it adds new keys it sees in `t()` calls, preserves existing
translations, and (with our config) leaves new English values equal to
the key name so it's obvious which strings still need real copy:

```sh
npm run i18n:extract
```

Run this whenever you've added new `t()` calls and want the JSON files
caught up. Diff the JSON to review changes before committing.

## RTL polish patterns

- **Tailwind utilities:** prefer logical (`ms-2`, `pe-4`, `start-0`, `end-0`)
  over physical (`ml-2`, `pr-4`, `left-0`, `right-0`). They auto-flip when
  `<html dir="rtl">` is active.
- **Directional icons that flip meaning** (back/forward, expand/collapse):
  use the `<DirIcon ltr={IconA} rtl={IconB} />` helper from
  `src/components/ui/dir-icon.tsx`.
- **Purely decorative arrows on "next" buttons:** prefer the Tailwind
  modifier `rtl:rotate-180` over `<DirIcon>` — it's lighter.
- **Animations using `translateX`:** read `dir` from `useLocale()` and flip
  the sign in RTL so items still emerge from the leading edge. See
  `RegistryCarousel` in `src/components/home/home-screen.tsx`.
- **Keyboard ArrowLeft/ArrowRight:** in RTL, ArrowLeft = forward. See
  the `dir`-aware key handler in `src/components/onboarding/tour/tour-modal.tsx`.
- **Custom toasts / centered overlays:** generally RTL-safe. Don't touch
  unless you specifically need to.

## Adding a new locale (e.g. Spanish)

1. Add the BCP47 tag to `SUPPORTED_LOCALES` and `LOCALE_LABELS` in
   `src/i18n/index.ts`. Also add a BCP47 row to `LOCALE_TO_BCP47` in
   `src/i18n/formatters.ts`.
2. Copy `src/i18n/locales/en/` to `src/i18n/locales/es/` and translate.
3. Add an import + resources entry for the new locale in
   `src/i18n/index.ts`. Run `tsc --noEmit` to catch missing files.
4. Add the option to the Language section in
   `src/components/settings/settings-page.tsx` (`LanguageSection`).
5. If the new locale is RTL, make sure logical-property usage covers it.
   Most RTL polish for Hebrew also handles Arabic/Persian/Urdu.

## Agent locale propagation

`createConversation()` in `src/lib/agents/conversation-client.ts` reads
the user's locale from `localStorage` and adds it to every POST to
`/api/agents/conversations`. The server route in
`src/app/api/agents/conversations/route.ts` threads it into the prompt
builders in `src/lib/agents/conversation-runner.ts`, which inject a
"Respond in {{language}}" system instruction near the top of the prompt.
This is how agents reply in Hebrew when the UI is in Hebrew.

When `writePage()` (`src/lib/storage/page-io.ts`) saves a note without
explicit `dir` in frontmatter, it auto-detects Hebrew Unicode range
(U+0590–U+05FF) in the first ~600 chars and defaults `dir: rtl` when
Hebrew letters dominate. Explicit frontmatter `dir` always wins.

## What is intentionally not translated

- **Brand mark `cabinet`** — Latin script, kept in both locales. Renders
  in Cardo italic when `<html dir="rtl">`.
- **Keyboard shortcuts** (⌘K, ⌘[, ⌘]) — inline, no translation needed.
- **Provider identifiers** (`gemini-cli`, `claude-code`, etc.) — code, not
  prose.
- **Starter team names** in `src/lib/onboarding/rooms.ts` (`Cold Email
  Agency`, `SEO War Room`, etc.) — these are SaaS jargon brand-names and
  rarely have natural Hebrew equivalents. Open to revisiting if a Hebrew
  speaker wants to redesign.
- **The dictionary-card intro** in `IntroStep` (English wordplay on
  "cabinet"). The CTA + tagline translate; the dictionary stays English.
- **Auto-update prompt text** — sourced from `update-electron-app`.
