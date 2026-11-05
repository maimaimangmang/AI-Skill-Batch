'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { readReturnNavigation } from '@/lib/navigation';
import { useI18n } from './language-provider';

export default function BackLink({ fallback = '/', disabled = false, children, ...props }: React.ComponentProps<'a'> & { fallback?: string; disabled?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const { href, t } = useI18n();
  const [target, setTarget] = useState<string>();
  useEffect(() => { setTarget(readReturnNavigation()?.href); }, [pathname]);
  return <a {...props} href={disabled ? undefined : target || href(fallback)} aria-disabled={disabled || undefined} onClick={event => {
    if (disabled) { event.preventDefault(); return; }
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const origin = readReturnNavigation();
    if (origin?.inHistory) router.back();
    else router.replace(origin?.href || href(fallback));
  }}>{children || t('返回上一页')}</a>;
}
