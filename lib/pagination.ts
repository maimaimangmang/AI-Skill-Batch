export type CursorPage<T> = { items: T[]; nextPageToken?: string; totalCount?: number };

export function createCursorPager<P extends CursorPage<unknown>>(
  fetchPage: (token: string, signal: AbortSignal) => Promise<P>,
) {
  const pages: P[] = [];
  return {
    pages,
    async load(index: number, signal: AbortSignal): Promise<P> {
      signal.throwIfAborted();
      if (pages[index]) return pages[index];
      const token = index === 0 ? '' : pages[index - 1]?.nextPageToken;
      if (index < 0 || index > pages.length || (index > 0 && !token)) throw new Error('请按顺序加载下一页。');
      const page = await fetchPage(token || '', signal);
      signal.throwIfAborted();
      if (page.nextPageToken && (page.nextPageToken === token || pages.some(p => p.nextPageToken === page.nextPageToken))) {
        throw new Error('分页信息异常，请刷新重试。');
      }
      pages[index] = page;
      return page;
    },
  };
}

// The runs endpoint returns totalCount and accepts numeric offset cursors.
// Unlike cursor-only endpoints, it can jump to any page without walking there.
export function createOffsetPager<P extends CursorPage<unknown> & { totalCount?: number }>(
  fetchPage: (token: string, signal: AbortSignal) => Promise<P>, pageSize: number,
) {
  const pages: P[] = [];
  let total: number | undefined;
  return {
    pages,
    get totalCount() { return total; },
    async load(index: number, signal: AbortSignal): Promise<P> {
      signal.throwIfAborted();
      if (!Number.isInteger(index) || index < 0 || (total != null && index >= Math.max(1, Math.ceil(total / pageSize)))) throw new Error('页码超出范围，请刷新重试。');
      if (pages[index]) return pages[index];
      const result = await fetchPage(index ? String(index * pageSize) : '', signal);
      signal.throwIfAborted();
      if (Number.isSafeInteger(result.totalCount) && result.totalCount! >= 0) total = result.totalCount;
      pages[index] = result;
      return result;
    },
  };
}
