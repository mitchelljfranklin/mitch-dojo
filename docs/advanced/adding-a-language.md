# Adding a Language

The app ships with twelve languages: English, Spanish, Portuguese, French, German, Italian, Japanese, Korean, Chinese, Arabic, Hindi, and Russian. Adding another language is a code change — there is no in-app "install language" button — but it is deliberately mechanical. The ten languages after English/Spanish are initial machine-assisted translations; native review is recommended before treating them as final copy.

There is no `[locale]` URL segment. The active language comes from a cookie (`NEXT_LOCALE`), then the school default in Admin → General, then `Accept-Language`, then English.

## 1. Add the message catalog

Create `messages/<code>.json`, using the ISO language code as the filename (`nl.json`).

Copy `messages/en.json` as the starting point and translate the **values only**:

- Keep every key exactly as-is. The catalog parity test fails if any locale is missing a key.
- Never put a dot inside a key name — next-intl uses dots for nesting.
- Keep placeholders such as `{appName}`, `{count}`, and `{date}` unchanged.
- Keep ICU plural syntax intact, for example `{count, plural, one {# student} other {# students}}`.
- Keep rich-text tags such as `<strong>…</strong>` and `<code>…</code>`; only translate the text around them.
- Include the `Email` and `Pdf` namespaces too — outbound emails and generated PDFs read from the same catalog.

## 2. Register the locale

Edit `lib/i18n/config.ts`:

```ts
export const LOCALES = ["en", "es", "fr", "nl"] as const;

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  nl: "Nederlands",
};
```

Use the language's **native name** in `LOCALE_LABELS` — language names are always shown in their own language, not translated.

## 3. Add the loader

Edit `lib/i18n/request.ts`:

```ts
const MESSAGE_LOADERS: Record<
  Locale,
  () => Promise<{ default: Record<string, unknown> }>
> = {
  en: () => import("../../messages/en.json"),
  es: () => import("../../messages/es.json"),
  fr: () => import("../../messages/fr.json"),
  nl: () => import("../../messages/nl.json"),
};
```

The `Record<Locale, …>` type makes TypeScript fail until the loader exists.

## What updates automatically

Once the three changes above are in place:

- The header/public-page language selector lists the new language.
- **Admin → General → Default language** offers it as a school-wide default.
- `organizationSettingsSchema` accepts it as `defaultLocale`.
- Cookie and `Accept-Language` validation accept it (`isLocale()`).
- Dates, times, numbers, currency, percentages, relative times, and plurals use the browser/Node `Intl` data for that locale.
- Emails use it as the school default; generated PDFs use it when the viewer has selected it.

## Verify

```bash
npm run precheck
npm test
npm run build
npm run docs:build
```

Relevant tests:

- `lib/i18n/messages.test.ts` — key parity, no dotted keys.
- `lib/settings/schema.test.ts` — if the new code is the current "unsupported language" fixture (`zz`), change that example.
- Add the new language to the smoke/visual checks if you maintain them.

Then run the app, switch to the new language, and spot-check:

- Staff dashboard and Admin → General
- Public booking page and member portal
- An automated email (the shell/footer; authored template text does not change)
- An invoice or report-card PDF
- A form with unsaved input, then switch language and confirm the values survive

## Language-specific caveats

- **Country names** have committed maps for all twelve shipped locales (`lib/country-names.ts`). Adding a new language means generating one more map (or accepting English fallback) and extending `countryName()` if full country-name coverage is required. CSV import accepts the shipped names; add the new map there too.
- **PDF fonts**: PDFs bundle Noto Sans families for Latin/Cyrillic, Arabic, Devanagari, and Japanese/Korean/Simplified Chinese (`lib/pdf/fonts/`), selected per locale. Arabic/Hindi complex-script shaping and Arabic RTL pagination are best-effort and should be verified visually. The fonts add roughly 36 MB to the repository/image; keep that in mind when adding more scripts.
- **UI fonts**: Geist is configured with the `latin` subset. CJK, Devanagari, and Arabic glyphs rely on the operating system's fallback fonts; bundle Noto UI fonts if consistent rendering across devices matters.
- **Right-to-left languages**: Arabic sets `dir="rtl"` on the root element, but the layout has not had a full RTL audit; treat Arabic as best-effort until physical `left`/`right` utilities and icons are reviewed.
- **Authored content is not translated automatically**: seeded email templates, agreement documents, course/plan names, and custom role names stay as written. Translate templates in Admin → Templates, and documents in Admin → Documents, if needed.
- **`app/global-error.tsx`** stays English by design — it renders outside the i18n provider when the root layout itself has failed.
- **`app/style-guide`** is developer-only and stays English.
- **The docs site (`docs/`)** is English-only today; adding UI languages does not translate it.

## Checklist

- [ ] `messages/<code>.json` with full key parity
- [ ] `LOCALES` updated
- [ ] `LOCALE_LABELS` updated with the native name
- [ ] `MESSAGE_LOADERS` updated
- [ ] Placeholders and ICU plurals preserved
- [ ] Tests, build, and docs build pass
- [ ] Runtime smoke check in the new language
- [ ] README/AGENTS language list updated
- [ ] Country names / fonts / RTL assessed if applicable
