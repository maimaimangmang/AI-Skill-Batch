# Chinese and English pages

Chinese keeps the existing URLs (`/`, `/skills`, `/skills/:slug`). English uses `/en`, `/en/skills`, and `/en/skills/:slug`. The URL determines the server-rendered language. Links, search, pagination and connection handoffs retain that language; the switcher retains the page, query and hash. Both versions share the same data and sessions.

`next.config.ts` rewrites Chinese URLs to the internal `/zh-CN` route. Explicit `/zh-CN/...` requests redirect to the existing Chinese URLs. Page metadata and the sitemap expose both languages with canonical and alternate links. API and asset URLs are not localized.

Use `t()` for interface messages and `skillText()` for public Skill copy. Use `LocalizedLink`, `LocalizedAnchor`, or the `href()` helper for page navigation. Add reviewed English messages to `lib/translations/en.json` (interface) or `skill-content.en.json` (public content). Dictionary keys match exact source text so changed creator descriptions cannot silently reuse outdated translations.

Before publishing, run:

```sh
npm test
npm run build
node scripts/check-public-routes.mjs
node --import tsx scripts/check-translations.ts
```

The translation audit reads only anonymous public catalog/template endpoints. It checks names, descriptions, fields, instructions, option labels, model labels and sample values. New/changed copy produces a nonzero exit status and a list to translate and review. It can also read a saved catalog JSON as its first argument. It does not automatically invoke a paid translation service; newly published copy needs translation maintenance.

User-entered content, creator nicknames, task results, identifiers, model IDs, enum wire values and attachment references retain their original values. Public examples may be translated when explicitly inserted as a new task. A language switch transfers an existing task draft and local files once through tab memory (60-second timeout), without storing them on disk or retaining API keys/quotes. Refreshing or closing the page still clears unsaved drafts. Switching during quote/execution is blocked until the operation completes.

The English signup promotion displays an approximate USD equivalent of the fixed CN¥10 credit. Reviewed on 2026-10-27 using ECB 2026-10-26 reference rates: EUR/USD 1.1188 and EUR/CNY 7.4603; 10 × 1.1188 ÷ 7.4603 ≈ US$1.50. This is a display estimate, not a change to the actual credit or billing currency. Recheck the estimate when updating this promotion. Sources: https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/eurofxref-graph-cny.en.html and https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/eurofxref-graph-usd.en.html
