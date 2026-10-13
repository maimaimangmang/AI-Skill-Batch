# Public Skill pages and SEO

Public routes:
- `/`: public introduction, actual creator trial images, featured Skill links.
- `/skills`: server-rendered catalog (24 per page); `?page=N` pages have their own canonical. Keyword search (`?q=`) is noindex/follow.
- `/skills/[slug]`: publicly listed Skills and the two supported official templates, with description, schema, usage steps, existing examples, fee disclosure and share link. Unknown, hidden and delisted records return 404. Known IDs redirect to stable descriptive aliases; other IDs remain stable URLs even if the title changes.
- `/batch-image-generation`: image workflow guide, actual creator trial and links to image Skills.
- `/tasks` and `/tasks/[runId]`: authenticated, noindex; disconnected visitors enter the home connection dialog with a validated return destination.
- `/favorites`: noindex; personal saved Skills.
- `/settings`: noindex; connects when needed, then opens account settings from the tasks page.

`/app` and `/login` have been removed and return 404, including their query variants. The old `/?demo=1` query no longer activates a demo or redirects; it renders the normal homepage.

## Data boundary

`lib/public-skills.ts` only reads the anonymous HTTPS public catalog/detail/schema endpoints. It never reads cookies or sends Authorization. Its data projection is explicit. Published/listed records only; the owner-hidden 归藏网页 PPT ID is excluded from both the catalog and direct detail routes. Fetch results revalidate every 15 minutes. Temporary upstream failures produce an error response rather than being misreported as a deleted Skill. Actual execution still uses the existing authenticated API, freshly loads the schema, and requires cost confirmation.

## Search and sharing

Unique titles, descriptions, canonical URLs, Open Graph/Twitter tags, PNG share image and escaped BreadcrumbList JSON-LD are present in initial HTML. `/robots.txt` links to `/sitemap.xml`. The sitemap enumerates all published public Skill URLs plus home/catalog/batch-image-generation; it excludes private pages, search results and hidden records. No fabricated ratings, reviews or generated-result claims.

Chinese is the indexable source language in this release. The existing language selector translates site interface text; creator titles, descriptions and inputs keep their original language. No English hreflang/duplicate URLs are declared for untranslated creator content. Dedicated English SEO pages require reviewed English main content.

Publishing a sitemap does not submit or verify a Search Console/Bing property and does not guarantee indexation. The owner can submit `https://loomskill.com/sitemap.xml` in the verified property. No analytics service or third-party tracking was added.

## Validation

Unit tests cover safe task connection destinations, stable canonical mapping, hidden/unpublished filtering, public data allowlist, JSON-LD escaping, anonymous upstream fetches and outage-vs-404 behavior. Production HTTP checks cover public HTML, canonical/share metadata, sitemap, search noindex, invalid-page 404s, alias redirects and authenticated routes and removed-entry 404s. Browser checks use only a local mock account; no paid tasks are executed.
