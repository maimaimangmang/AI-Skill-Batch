'use client';
import { useI18n } from './language-provider';
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
export default function Modal({ title, children, onClose, locked = false, wide = false }: { title: string; children: React.ReactNode; onClose: () => void; locked?: boolean; wide?: boolean }) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); const el = ref.current; return () => el?.close(); }, []);
  return <dialog ref={ref} className={`modal ${wide ? 'wide' : ''}`} aria-label={title} onCancel={e => { e.preventDefault(); if (!locked) onClose(); }}>
    <div className="modal-head"><h2>{title}</h2><button className="icon-button" aria-label={t("关闭弹窗")} disabled={locked} onClick={onClose}><X size={20} /></button></div>{children}
  </dialog>;
}
