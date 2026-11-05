'use client';
import NextLink from 'next/link';
import { useI18n } from './language-provider';
import { newTabHref, rememberNavigation } from '@/lib/navigation';

function navigateSection(destination: string) {
  const url = new URL(destination, window.location.href);
  if (!url.hash || url.pathname !== window.location.pathname || url.search !== window.location.search) return false;
  // Section links must not insert another stop between a page and its origin.
  window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  document.getElementById(decodeURIComponent(url.hash.slice(1)))?.scrollIntoView();
  return true;
}

function prepareNewTab(event: React.MouseEvent<HTMLAnchorElement>) {
  const link = event.currentTarget;
  if (!event.defaultPrevented && !link.hasAttribute('download') && (link.target === '_blank' || event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1 || event.type === 'contextmenu')) {
    const url = new URL(link.href);
    if (url.origin === window.location.origin) link.href = newTabHref(url.pathname + url.search + url.hash);
  }
}

export default function LocalizedLink({href,onNavigate,onClick,onAuxClick,onContextMenu,...props}:React.ComponentProps<typeof NextLink>) {
  const {href:localize} = useI18n();
  const target = typeof href === 'string' ? localize(href) : {...href, pathname:href.pathname ? localize(href.pathname) : href.pathname};
  let destination = '';
  return <NextLink {...props} href={target} onClick={event => {
    const url = new URL(typeof props.as === 'string' ? props.as : typeof target === 'string' ? target : event.currentTarget.href, window.location.href);
    destination = url.origin === window.location.origin ? url.pathname + url.search + url.hash : '';
    onClick?.(event); prepareNewTab(event);
  }} onAuxClick={event => { onAuxClick?.(event); prepareNewTab(event); }} onContextMenu={event => { onContextMenu?.(event); prepareNewTab(event); }} onNavigate={event => {
    let prevented = false;
    onNavigate?.({ preventDefault: () => { prevented = true; event.preventDefault(); } });
    if (!prevented && navigateSection(destination)) event.preventDefault();
    else if (!prevented && !props.replace) rememberNavigation(destination);
  }} />;
}
export function LocalizedAnchor({href,onClick,onAuxClick,onContextMenu,...props}:React.ComponentProps<'a'>) {
  const {href:localize} = useI18n();
  const target = href ? localize(href) : href;
  return <a {...props} href={target} onClick={event => {
    onClick?.(event); prepareNewTab(event);
    if (!event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && !props.download && (!props.target || props.target === '_self') && target) {
      if (navigateSection(target)) event.preventDefault(); else rememberNavigation(target);
    }
  }} onAuxClick={event => { onAuxClick?.(event); prepareNewTab(event); }} onContextMenu={event => { onContextMenu?.(event); prepareNewTab(event); }} />;
}
