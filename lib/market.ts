import { createCursorPager } from './pagination';
export const MARKET_PAGE_SIZE = 12;

// Page numbers use zero-based indexes internally. Keep the current page visible
// when it falls between the first and last groups.
export function marketPageNumbers(total: number, current: number): (number | null)[] {
  const pages = Array.from({ length: total }, (_, page) => page)
    .filter(page => page < 3 || page >= total - 3 || page === current);
  const result: (number | null)[] = [];
  for (const page of pages) {
    const previous = result.at(-1);
    if (typeof previous === 'number' && page > previous + 1) result.push(null);
    result.push(page);
  }
  return result;
}

export type MarketPage = { items: import('./types').Listing[]; nextPageToken?: string; totalCount?: number };

// Fetch page contents only on demand. Until the count is known, follow the
// next cursor; afterward, jump directly by page number. Cache visited pages.
export function createMarketPager(
  api: (path: string, options?: RequestInit) => Promise<MarketPage>,
  keyword: string,
) {
  const cursor = createCursorPager<MarketPage>((token, signal) => api(`/market?keyword=${encodeURIComponent(keyword)}&pageToken=${encodeURIComponent(token)}`, { signal }));
  let totalCount: number | undefined;
  function remember(index: number, page: MarketPage) {
    if (Number.isSafeInteger(page.totalCount) && page.totalCount! >= 0) totalCount = page.totalCount;
    else if (!page.nextPageToken) totalCount = index * MARKET_PAGE_SIZE + page.items.length;
    cursor.pages[index] = page;
    return page;
  }
  return {
    pages: cursor.pages,
    get totalCount() { return totalCount; },
    async load(index: number, signal: AbortSignal) {
      signal.throwIfAborted();
      if (cursor.pages[index]) return cursor.pages[index];
      if (totalCount == null) return remember(index, await cursor.load(index, signal));
      if (!Number.isInteger(index) || index < 0 || index >= Math.max(1, Math.ceil(totalCount / MARKET_PAGE_SIZE))) throw new Error('页码超出范围，请刷新重试。');
      const page = await api(`/market?keyword=${encodeURIComponent(keyword)}&page=${index}`, { signal });
      signal.throwIfAborted();
      return remember(index, page);
    },
    async discoverTotal(signal: AbortSignal) {
      signal.throwIfAborted();
      if (totalCount != null) return totalCount;
      const result = await api(`/market-count?keyword=${encodeURIComponent(keyword)}`, { signal });
      signal.throwIfAborted();
      if (!Number.isSafeInteger(result.totalCount) || result.totalCount! < 0) throw new Error('总页数暂不可用，请刷新重试。');
      totalCount = result.totalCount;
      return totalCount;
    },
  };
}

// Only use an explicit model declaration in the public description. A mention
// of a provider, modality, or product name is not evidence of the model used.
export function declaredModels(description: string) {
  const names = description.split(/\r?\n/).flatMap(line => {
    const plain = line.replace(/\*\*|`/g, '').replace(/^\s*[-*•]\s*/, '').trim();
    const match = plain.match(/^(?:使用模型|所用模型|采用模型|模型名称|模型\s*ID|模型|models?\s*(?:used|id)?|powered by)\s*[:：]\s*(.+)$/i);
    if (!match) return [];
    const value = match[1].trim();
    if (/^(?:未公开|模型未公开|未提供|未知|待定|unknown|n\/a)[。.]?$/i.test(value)) return [];
    return [value];
  });
  return [...new Set(names)].join('；');
}

// Author-supplied disclosure for this exact published version. The public API
// does not expose execution model configuration. Never carry this declaration
// across a version change or treat it as enforcement of the execution model.
const authorModelDeclarations = [{
  listingId: '01a0ccea-2449-7796-ba40-bfcded89b97d',
  listingVersionId: '01a0ccf2-f42f-7486-8198-69922ca9c15c',
  model: 'openai/gpt-image-2',
  mode: '图生图',
}];

export function listingModelLabel(listing: import('./types').Listing) {
  const declaration = authorModelDeclarations.find(entry =>
    entry.listingId === listing.id && entry.listingVersionId === listing.listingVersionId);
  const model = declaredModels(listing.description || '');
  // A public declaration takes precedence if the author updates the description.
  if (model && model !== declaration?.model) return model;
  return declaration ? `${declaration.model} · ${declaration.mode}` : model;
}
