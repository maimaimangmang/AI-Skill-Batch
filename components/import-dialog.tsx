'use client';
import { sourceMessage } from '@/lib/i18n';
import { useI18n } from './language-provider';
import { useState } from 'react';
import { Check, FileSpreadsheet } from 'lucide-react';
import type { Field, InputRow } from '@/lib/types';
import Modal from './modal';
export type ImportSheet = { name: string; columns: string[]; rows: string[][] };
export default function ImportDialog({ sheets, fields, onClose, onImport }: { sheets: ImportSheet[]; fields: Field[]; onClose: () => void; onImport: (rows: InputRow[]) => void }) {
  const { t } = useI18n();
  const [sheetIndex, setSheetIndex] = useState(0);
  const sheet = sheets[sheetIndex];
  const guess = (s: ImportSheet) => Object.fromEntries(fields.map(f => [f.key, s.columns.findIndex(c => c.trim() === f.label || c.trim() === f.key)]));
  const [mapping, setMapping] = useState<Record<string, number>>(() => guess(sheet));
  const [selected, setSelected] = useState<number[]>(() => sheet.rows.map((_, i) => i));
  const [error, setError] = useState('');
  function apply() {
    const missing = fields.filter(f => f.required && mapping[f.key] < 0 && f.default_value == null);
    if (missing.length) return setError(sourceMessage("请为 {0} 选择对应列。", missing.map(f => f.label).join('、')));
    if (!selected.length) return setError(sourceMessage("请至少选择一行。"));
    onImport([...selected].sort((a, b) => a - b).map(i => Object.fromEntries(fields.map(f => [f.key, mapping[f.key] < 0 ? '' : sheet.rows[i][mapping[f.key]] ?? '']))));
  }
  return <Modal title={t("导入表格")} wide onClose={onClose}>
    <div className="modal-body">
      <div className="import-summary"><FileSpreadsheet /><div><strong>{sheet.rows.length} {t(" 行数据 · 已选 ")}{selected.length} {t(" 行")}</strong><p>{t("选择工作表、匹配列名，再将选中的数据放入任务表。")}</p></div></div>
      <label className="field-label">{t("工作表")}<select value={sheetIndex} onChange={e => { const i = Number(e.target.value); setSheetIndex(i); setMapping(guess(sheets[i])); setSelected(sheets[i].rows.map((_, n) => n)); setError(''); }}>{sheets.map((s, i) => <option key={i} value={i}>{s.name}（{s.rows.length} {t(" 行）")}</option>)}</select></label>
      <div className="mapping-grid">{fields.map(f => <label className="field-label" key={f.key}>{f.label}{f.required && <em> *</em>}<select value={mapping[f.key]} onChange={e => setMapping({ ...mapping, [f.key]: Number(e.target.value) })}><option value={-1}>{t("不导入此列 / 使用默认值")}</option>{sheet.columns.map((c, i) => <option value={i} key={i}>{c}{t("（第 ")}{i + 1} {t(" 列）")}</option>)}</select></label>)}</div>
      <div className="section-line"><span>{t("选择要执行的数据")}</span><button className="text-button" onClick={() => setSelected(sheet.rows.map((_, i) => i))}>{t("全选")}</button><button className="text-button" onClick={() => setSelected([])}>{t("清空选择")}</button></div>
      <div className="import-preview table-scroll"><table><thead><tr><th>{t("选择")}</th><th>{t("行号")}</th>{sheet.columns.map((c, i) => <th key={i}>{c}</th>)}</tr></thead><tbody>{sheet.rows.map((row, i) => <tr key={i}><td><input aria-label={t("选择第 {0} 行", i + 2)} type="checkbox" checked={selected.includes(i)} onChange={e => setSelected(e.target.checked ? [...selected, i] : selected.filter(n => n !== i))} /></td><td>{i + 2}</td>{sheet.columns.map((_, j) => <td key={j}>{row[j]}</td>)}</tr>)}</tbody></table></div>
      {error && <p className="error" role="alert">{t(error)}</p>}
    </div><div className="modal-foot"><button className="button" onClick={onClose}>{t("取消")}</button><button className="button primary" onClick={apply} disabled={!selected.length}><Check size={16} />{t("导入 ")}{selected.length} {t(" 行")}</button></div>
  </Modal>;
}
