'use client';
import { useId, useState } from 'react';
import { CircleHelp } from 'lucide-react';
import { useI18n } from './language-provider';

export default function CreatorFeeLabel({ label = '/ 任务调用费', description = '调用费由创作者设置，非平台收费' }: { label?: string; description?: string }) {
  const { t } = useI18n();
  const id = useId();
  const [open, setOpen] = useState(false);
  return <span className="creator-fee-label" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
    {t(label)}
    <button className="creator-fee-help" type="button" aria-label={t('调用费说明')} aria-describedby={open ? id : undefined}
      onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onClick={() => setOpen(true)}
      onKeyDown={event => { if (event.key === 'Escape') { setOpen(false); event.stopPropagation(); } }}>
      <CircleHelp size={12} aria-hidden="true" />
    </button>
    {open && <span className="creator-fee-tooltip" id={id} role="tooltip">{t(description)}</span>}
  </span>;
}
