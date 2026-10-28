'use client';
import NextLink from 'next/link';
import { useI18n } from './language-provider';

export default function LocalizedLink({href,...props}:React.ComponentProps<typeof NextLink>) {
  const {href:localize} = useI18n();
  return <NextLink {...props} href={typeof href === 'string' ? localize(href) : {...href, pathname:href.pathname ? localize(href.pathname) : href.pathname}} />;
}
export function LocalizedAnchor({href,...props}:React.ComponentProps<'a'>) {
  const {href:localize} = useI18n();
  return <a {...props} href={href ? localize(href) : href} />;
}
