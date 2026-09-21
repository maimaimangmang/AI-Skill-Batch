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

// The upstream API provides cursors, not a total. Publish a complete snapshot
// so the UI can show real final page numbers and jump without further requests.
export async function collectMarket(
  api: (path: string, options?: RequestInit) => Promise<{ items: import('./types').Listing[]; nextPageToken?: string }>,
  keyword: string,
  signal: AbortSignal,
) {
  const items = new Map<string, import('./types').Listing>();
  const seen = new Set<string>();
  let token = '';
  do {
    signal.throwIfAborted();
    if (seen.has(token)) throw new Error('市场分页信息异常，请刷新重试。');
    seen.add(token);
    const page = await api(`/market?keyword=${encodeURIComponent(keyword)}&pageToken=${encodeURIComponent(token)}`, { signal });
    signal.throwIfAborted();
    for (const item of page.items) items.set(item.id, item);
    token = page.nextPageToken || '';
  } while (token);
  return { items: [...items.values()], nextPageToken: '' };
}

// Only use an explicit model declaration in the public description. A mention
// of a provider, modality, or product name is not evidence of the model used.
export function declaredModels(description: string) {
  const names = description.split(/\r?\n/).flatMap(line => {
    const plain = line.replace(/\*\*/g, '').replace(/^\s*[-*•]\s*/, '').trim();
    const match = plain.match(/^(?:使用模型|所用模型|采用模型|模型名称|模型|models?\s*(?:used)?|powered by)\s*[:：]\s*(.+)$/i);
    if (!match) return [];
    const value = match[1].trim();
    if (/^(?:未公开|模型未公开|未提供|未知|待定|unknown|n\/a)[。.]?$/i.test(value)) return [];
    return [value];
  });
  return [...new Set(names)].join('；');
}
