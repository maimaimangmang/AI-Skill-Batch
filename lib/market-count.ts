import { MARKET_PAGE_SIZE, type MarketPage } from './market';

export function marketOffsetToken(offset: number) {
  return Buffer.from(JSON.stringify({ offset })).toString('base64url');
}

// The public market returns offset cursors but no count. Locate the boundary
// in the background: exponential search, then binary search.
// Each probe reads one item. Never walk or preload all pages.
export async function countMarketItems(
  fetchPage: (params: URLSearchParams) => Promise<MarketPage>, keyword: string, signal: AbortSignal,
) {
  let probes = 0;
  async function read(offset: number, size: number) {
    signal.throwIfAborted();
    if (++probes > 34) throw new Error('暂时无法获取总页数，请刷新市场后重试。');
    const params = new URLSearchParams({ pageSize: String(size), keyword });
    if (offset) params.set('pageToken', marketOffsetToken(offset));
    const page = await fetchPage(params);
    signal.throwIfAborted();
    return page;
  }
  let lower = -1, upper = MARKET_PAGE_SIZE, total: number | undefined;
  while (total == null) {
    const page = await read(upper, 1);
    if (!page.items.length) break;
    if (!page.nextPageToken) { total = upper + 1; break; }
    lower = upper;
    upper *= 2;
  }
  while (total == null && upper - lower > 1) {
    const mid = Math.floor((upper + lower) / 2);
    const page = await read(mid, 1);
    if (!page.items.length) upper = mid;
    else if (!page.nextPageToken) total = mid + 1;
    else lower = mid;
  }
  return total ?? upper;
}
