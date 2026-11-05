// Keep the origin on each history entry, so refresh and back/forward retain it.
const stateKey = 'loomskillReturn';
const pendingKey = 'loomskill-navigation';
type ReturnNavigation = { page: string; href: string; inHistory: boolean };

function page(path: string) { return path.split('#')[0]; }
export function currentPath() { return window.location.pathname + window.location.search + window.location.hash; }

export function localPagePath(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020]/.test(value)) return;
  const url = new URL(value, window.location.origin);
  if (url.origin !== window.location.origin || /^\/(?:api|_next|share-image)(?:\/|$)/.test(url.pathname) || /\.[^/]+$/.test(url.pathname)) return;
  return url.pathname + url.search + url.hash;
}

function savePending(value: ReturnNavigation) {
  try { window.sessionStorage.setItem(pendingKey, JSON.stringify(value)); } catch { /* Storage may be disabled. */ }
}

export function rememberNavigation(destination: string) {
  const target = localPagePath(destination);
  if (!target || page(target) === page(currentPath())) return;
  savePending({ page: page(target), href: currentPath(), inHistory: true });
}

export function readReturnNavigation(): ReturnNavigation | undefined {
  const current = page(currentPath());
  let pending: ReturnNavigation | undefined;
  try {
    pending = JSON.parse(window.sessionStorage.getItem(pendingKey) || 'null');
    window.sessionStorage.removeItem(pendingKey);
  } catch { /* Fall back to this history entry or the explicit new-tab origin. */ }
  const saved = pending?.page === current ? pending : window.history.state?.[stateKey];
  if (saved?.page === current && localPagePath(saved.href) && page(saved.href) !== current) {
    window.history.replaceState({ ...window.history.state, [stateKey]: saved }, '');
    return saved;
  }
  const origin = localPagePath(new URLSearchParams(window.location.search).get('returnTo'));
  if (origin && page(origin) !== current) {
    const value = { page: current, href: origin, inHistory: false };
    window.history.replaceState({ ...window.history.state, [stateKey]: value }, '');
    return value;
  }
}

// A language change replaces the current page instead of becoming a return step.
export function preserveReturnNavigation(destination: string) {
  const saved = readReturnNavigation();
  if (saved) savePending({ ...saved, page: page(destination) });
}

export function newTabHref(destination: string) {
  if (!localPagePath(destination) || page(destination) === page(currentPath())) return destination;
  const url = new URL(destination, window.location.origin);
  url.searchParams.set('returnTo', currentPath());
  return url.pathname + url.search + url.hash;
}
