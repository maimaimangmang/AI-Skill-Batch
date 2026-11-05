'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { useI18n } from './language-provider';

export default function BackToTop() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => setVisible(window.scrollY > 400);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  if (!visible) return null;

  return <button type="button" className="back-to-top" aria-label={t('回到顶部')} title={t('回到顶部')} onClick={() => {
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }}><ArrowUp size={22} aria-hidden="true" /></button>;
}
