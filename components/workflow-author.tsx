'use client';
import { useI18n } from './language-provider';
import { UserRound } from 'lucide-react';

export default function WorkflowAuthor({ name, loading = false, unavailable = false }: { name?: string; loading?: boolean; unavailable?: boolean }) {
  const { t } = useI18n();
  const author = typeof name === 'string' ? name.trim() : '';
  const label = author ? t("作者：{0}", author === 'LoomLoom 官方' ? t(author) : author) : loading ? t("作者加载中…") : unavailable ? t("作者暂不可用") : t("作者未公开");
  return <span className="workflow-author" title={label}><UserRound size={11} aria-hidden="true" /><span>{label}</span></span>;
}
