import { UserRound } from 'lucide-react';

export default function WorkflowAuthor({ name, loading = false, unavailable = false }: { name?: string; loading?: boolean; unavailable?: boolean }) {
  const author = typeof name === 'string' ? name.trim() : '';
  const label = author ? `作者：${author}` : loading ? '作者加载中…' : unavailable ? '作者暂不可用' : '作者未公开';
  return <span className="workflow-author" title={label}><UserRound size={11} aria-hidden="true" /><span>{label}</span></span>;
}
