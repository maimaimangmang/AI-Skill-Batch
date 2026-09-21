import { UserRound } from 'lucide-react';

export default function WorkflowAuthor({ name }: { name?: string }) {
  const author = typeof name === 'string' ? name.trim() : '';
  const label = author ? `作者：${author}` : '作者未公开';
  return <span className="workflow-author" title={label}><UserRound size={11} aria-hidden="true" /><span>{label}</span></span>;
}
