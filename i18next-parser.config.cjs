/**
 * i18next-parser config — scans the source tree for t("key") calls and
 * writes the discovered keys back to the locale JSON files. The English
 * file is the source of truth (defaultValue: "{{key}}" leaves the value
 * as the key name so it's obvious which strings still need real English
 * copy). Hebrew gets empty strings for any newly-discovered key so the
 * translator can fill them in.
 *
 * Run via:
 *   npm run i18n:extract       # update locale JSON files
 *   npm run i18n:check         # exit non-zero if any keys are missing
 */
module.exports = {
  input: [
    "src/**/*.{ts,tsx}",
    "!src/i18n/**",
    "!**/*.test.{ts,tsx}",
    "!**/node_modules/**",
  ],
  output: "src/i18n/locales/$LOCALE/$NAMESPACE.json",
  locales: ["en", "he"],
  namespaceSeparator: ":",
  keySeparator: ".",
  defaultNamespace: "common",
  defaultValue(locale, _ns, key) {
    // For English keep the key visible if unset; the developer should fill
    // it in. Hebrew defaults to empty so it shows up clearly in code review
    // as still-untranslated.
    if (locale === "en") return key;
    return "";
  },
  sort: true,
  createOldCatalogs: false,
  failOnWarnings: false,
  // The parser is conservative — it only picks up t("literal") calls. The
  // `find-hardcoded.mjs` script below is the complement: it finds JSX text
  // that should be wrapped in t() but isn't yet.
};
