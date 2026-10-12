'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useI18n } from './language-provider';

const companions = [
  { id: 'bobo', name: '啵啵' },
  { id: 'taotao', name: '桃桃' },
  { id: 'yaya', name: '芽芽' },
];

export function PlushMascot() {
  const { t } = useI18n();
  const [revision, setRevision] = useState(0);
  const buddy = companions[revision % companions.length];
  return <button
    className="plush-mascot"
    type="button"
    data-companion={buddy.id}
    aria-label={t('当前搭档：{0}，点击切换下一位', t(buddy.name))}
    title={t('点点我，换个搭档')}
    onClick={() => setRevision(value => value + 1)}
  >
    <span className="plush-mascot-float">
      <span className={revision ? 'plush-mascot-swap' : ''} key={revision}>
        {companions.map(item => <Image
          key={item.id}
          className={buddy.id === item.id ? 'is-selected' : ''}
          src={`/plush/${item.id}.webp`}
          width={80}
          height={90}
          alt=""
          unoptimized
        />)}
      </span>
    </span>
  </button>;
}
