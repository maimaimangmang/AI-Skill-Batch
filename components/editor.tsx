'use client';
import { sourceMessage, localizePublicExample } from '@/lib/i18n';
import { useI18n } from './language-provider';
import WorkflowAuthor from './workflow-author';
import AssetInput, { type AssetPreview, type AssetUploadStatus } from './asset-input';
import { assetValues } from '@/lib/asset-input';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronDown, Copy, Download, FileSpreadsheet, Info, LoaderCircle, Plus, Trash2, Upload } from 'lucide-react';
import Papa from 'papaparse';
import type { InputRow, Listing, Schema } from '@/lib/types';
import { cellText, emptyRow, money, isBlankRow } from '@/lib/domain';
import { base64, download, exportSheet, post, type ApiRequestOptions } from '@/lib/client';
import WorkflowExamples from './workflow-examples';
import AgentInstall from './agent-install';
import FavoriteButton from './favorite-button';
import SkillGuide from './skill-guide';
import { workflowPath } from '@/lib/official';
import ImportDialog, { type ImportSheet } from './import-dialog';
type Props = { listing: Listing; schema: Schema; rows: InputRow[]; setRows: (rows: InputRow[]) => void; demo: boolean; guest?: boolean; busy: boolean; errors: string[]; api: (path: string, options?: ApiRequestOptions) => Promise<any>; onBack: () => void; onQuote: () => void };
export default function Editor({ listing, schema, rows, setRows, demo, guest = false, busy, errors, api, onBack, onQuote }: Props) {
  const { t, skillText, locale } = useI18n();
  const [localError, setLocalError] = useState(''); const [uploading, setUploading] = useState(false);
  const [sheets, setSheets] = useState<ImportSheet[] | null>(null); const input = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<Record<string, AssetPreview>>({});
  const previewUrls = useRef<string[]>([]);
  const [assetUpload, setAssetUpload] = useState<(AssetUploadStatus & { rowId: number; key: string }) | null>(null);
  const uploadController = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; uploadController.current?.abort(); previewUrls.current.forEach(url => URL.revokeObjectURL(url)); };
  }, []);
  // Keep each attachment editor attached to its row when rows are inserted or removed.
  const rowIds = useRef(new WeakMap<InputRow, number>());
  const nextRowId = useRef(0);
  function rowId(row: InputRow) {
    if (!rowIds.current.has(row)) rowIds.current.set(row, nextRowId.current++);
    return rowIds.current.get(row)!;
  }
  function changedRow(row: InputRow, values: InputRow) {
    const next = { ...row, ...values }; rowIds.current.set(next, rowId(row)); return next;
  }
  const fields = schema.fields; const locked = busy || uploading;
  const taskCount = rows.filter(row => !isBlankRow(row, fields)).length;
  const change = (index: number, key: string, value: unknown) => setRows(rows.map((row, i) => i === index ? changedRow(row, { [key]: value }) : row));
  async function importFile(file?: File) {
    if (!file) return;
    setLocalError(''); setUploading(true);
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error(sourceMessage("表格最大 5 MB。"));
      let data: ImportSheet[];
      if (demo || guest) {
        if (/\.(csv|tsv)$/i.test(file.name)) {
          const parsed = Papa.parse<string[]>(await file.text(), { skipEmptyLines: 'greedy' });
          if (parsed.errors.some(e => e.code !== 'UndetectableDelimiter')) throw new Error(sourceMessage("CSV 格式有误。"));
          data = [{ name: t("数据"), columns: parsed.data[0], rows: parsed.data.slice(1) }];
        } else if (/\.xlsx$/i.test(file.name)) {
          const ExcelJS = (await import('exceljs')).default; const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(await file.arrayBuffer());
          data = workbook.worksheets.map(s => { const matrix: string[][] = []; s.eachRow(r => matrix.push(Array.from({ length: s.columnCount }, (_, i) => r.getCell(i + 1).text))); return { name: s.name, columns: matrix[0], rows: matrix.slice(1) }; });
        } else throw new Error(sourceMessage("请选择 .xlsx、.csv 或 .tsv 文件。"));
      } else data = (await api('/import', post({ filename: file.name, content: await base64(file) }))).sheets;
      data = data.filter(s => s.columns?.length && s.rows.length);
      if (!data.length) throw new Error(sourceMessage("没有找到数据行，请保留一行表头，并填写至少一行数据。"));
      if (data.some(s => s.rows.length > 2000 || s.columns.length > 100)) throw new Error(sourceMessage("文件最多 2000 行、100 列。"));
      setSheets(data);
    } catch (e) { setLocalError((e as Error).message); } finally { setUploading(false); if (input.current) input.current.value = ''; }
  }
  async function attach(file: File | undefined, index: number, key: string, multiple: boolean) {
    if (!file || uploadController.current) return; setUploading(true); setLocalError('');
    const controller = new AbortController(); uploadController.current = controller;
    setAssetUpload({ rowId: rowId(rows[index]), key, name: file.name, startedAt: Date.now(), phase: 'preparing', percent: null });
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error(sourceMessage("每个附件最大 10 MB。"));
      const field = fields.find(f => f.key === key)!;
      const existing = multiple ? assetValues(rows[index][key]).filter(Boolean) : [];
      if (field.max_values && existing.length >= field.max_values) throw new Error(sourceMessage("最多上传 {0} 个附件。", field.max_values));
      controller.signal.throwIfAborted();
      if (!mounted.current) return;
      setAssetUpload(current => current && { ...current, phase: 'uploading', percent: 0 });
      const value = await api('/assets', {
        method: 'POST', body: file,
        headers: { 'Content-Type': 'application/octet-stream', 'X-Upload-Filename': encodeURIComponent(file.name), 'X-Upload-Type': file.type || 'application/octet-stream' },
        signal: controller.signal,
        onUploadProgress: percent => { if (mounted.current) setAssetUpload(current => current && { ...current, phase: percent === 100 ? 'processing' : 'uploading', percent }); }
      });
      if (!mounted.current) return;
      if (typeof value.inputAssetId !== 'string' || !value.inputAssetId.startsWith('ia_')) throw new Error(sourceMessage("上传未返回有效附件，请重试。"));
      const url = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
      if (url) previewUrls.current.push(url);
      setPreviews(current => ({ ...current, [value.inputAssetId]: { name: file.name, url } }));
      change(index, key, multiple ? [...existing, value.inputAssetId] : value.inputAssetId);
      setAssetUpload(current => current && { ...current, phase: 'succeeded', percent: 100 });
    } catch (e) {
      if (mounted.current) { setLocalError(controller.signal.aborted ? sourceMessage("已取消上传，可重新选择文件。") : (e as Error).message); setAssetUpload(current => current && { ...current, phase: 'failed', percent: null }); }
    } finally { uploadController.current = null; if (mounted.current) setUploading(false); }
  }
  function paste(e: React.ClipboardEvent, startRow: number, startColumn: number) {
    const text = e.clipboardData.getData('text'); if (!text.includes('\t')) return;
    e.preventDefault();
    const parsed = Papa.parse<string[]>(text, { delimiter: '\t', skipEmptyLines: 'greedy' });
    if (parsed.errors.length || parsed.data.some(r => startColumn + r.length > fields.length)) { setLocalError(sourceMessage("粘贴格式有误或超出现有字段列数，请调整后重试。")); return; }
    const next = rows.map(r => changedRow(r, {}));
    while (next.length < startRow + parsed.data.length) next.push(emptyRow(fields));
    parsed.data.forEach((r, i) => r.forEach((v, j) => { next[startRow + i][fields[startColumn + j].key] = v; }));
    setRows(next); setLocalError('');
  }
  return <>
    <div className="editor-navigation"><button className="back-button" disabled={locked} onClick={onBack}><ArrowLeft size={16} />{t("返回工作流市场")}</button></div>
    <div className="page-heading"><div><div className="eyebrow">BATCH WORKSPACE</div><h1>{skillText(listing.displayName)}</h1><WorkflowAuthor name={listing.creator?.nickname} /><p>{skillText(listing.description)}</p>{!demo && <FavoriteButton skill={listing} label />}</div><AgentInstall key={listing.id} listing={listing} demo={demo} /></div>
    <div className="steps"><span className="done"><Check size={15} />{t("选择工作流")}</span><i /><span className="active"><b>2</b>{t("填写任务表")}</span><i /><span><b>3</b>{t("确认并执行")}</span><i /><span><b>4</b>{t("收集结果")}</span></div>
    <WorkflowExamples key={listing.id} listing={listing} schema={schema} demo={demo} disabled={locked} onUse={row => {
      if (rows.some(r => !isBlankRow(r, fields)) && !window.confirm(t("用这组示例输入替换当前表格？"))) return;
      setRows([Object.fromEntries(fields.map(field => [field.key, row[field.key] ?? field.default_value ?? '']))]);
      setLocalError('');
    }} />
        {demo && <details className="instructions"><summary><Info size={17} />{t("填写说明与工作流信息")}<ChevronDown size={16} /></summary><div><p>{skillText(schema.input_summary || '') || t("每一行会作为一个独立任务提交。必填字段已用 * 标出。")}</p>{schema.instructions?.map((s, i) => <p key={i}>{skillText(s)}</p>)}<p>{listing.officialTemplateId ? t("无技能调用费，模型费用按实际用量结算，提交前会显示预估金额。") : t("创作者调用费：{0} / 任务，模型费用以提交前的预估为准。", t(money(listing.taskFixedFeeT, listing.currency)))}</p>{fields.map(f => f.description && <p key={f.key}><strong>{skillText(f.label)}：</strong>{skillText(f.description)}</p>)}</div></details>}
    <section className="editor-card">
      <div className="table-toolbar"><div><FileSpreadsheet size={20} /><strong>{t("任务表")}</strong><span className="count">{t("已填 ")}{taskCount} {t(" 行")}</span></div><div className="toolbar-actions"><button className="button small" disabled={locked} onClick={() => input.current?.click()}><Upload size={15} />{t("导入表格")}</button><button className="button small" disabled={locked} onClick={async () => { try { if (demo || guest) await exportSheet(fields.map(f => f.label), [fields.map(f => cellText(f.default_value))], 'loomdesk-template.xlsx'); else await download(`${workflowPath(listing)}/workbook`, 'loomdesk-template.xlsx'); } catch (e) { setLocalError((e as Error).message); } }}><Download size={15} />{t("下载模板")}</button><input type="file" ref={input} className="sr-only" accept=".xlsx,.csv,.tsv" aria-label={t("导入 Excel 或 CSV")} onChange={e => importFile(e.target.files?.[0])} /></div></div>
      <div className="table-scroll editor-scroll"><table className="task-table"><thead><tr><th className="row-number">#</th>{fields.map(f => <th key={f.key}><span>{skillText(f.label)}{f.required && <em> *</em>}</span><small>{f.value_type.includes('asset_ref') ? t("附件 / 链接") : f.enum_values ? t("下拉选择") : f.value_type === 'boolean' ? t("是 / 否") : t("输入内容")}</small></th>)}<th className="row-actions">{t("操作")}</th></tr></thead><tbody>{rows.map((row, i) => <tr key={rowId(row)}><td className="row-number">{String(i + 1).padStart(2, '0')}</td>{fields.map((f, j) => <td key={f.key}>
        {f.value_type.includes('asset_ref') ? <AssetInput localDraft={guest} field={f} value={row[f.key]} rowNumber={i + 1} disabled={locked} previews={previews} upload={assetUpload?.rowId === rowId(row) && assetUpload.key === f.key ? assetUpload : undefined} onCancelUpload={() => uploadController.current?.abort()} onChange={value => { setAssetUpload(null); change(i, f.key, value); }} onUpload={file => attach(file, i, f.key, f.value_type.endsWith('[]'))} onPaste={e => paste(e, i, j)} /> : f.enum_values?.length || f.value_type === 'boolean' ? <select aria-label={t("第 {0} 行 {1}", i + 1, skillText(f.label))} disabled={locked} value={cellText(row[f.key])} onChange={e => change(i, f.key, e.target.value)}><option value="">{f.default_value != null ? t("默认：{0}", skillText(cellText(f.default_value))) : f.required ? t("请选择") : t("可选")}</option>{(f.enum_values || [true, false]).map((v, n) => <option key={n} value={cellText(v)}>{f.value_type === 'boolean' ? (v ? t("是") : t("否")) : skillText(cellText(v))}</option>)}</select> : <textarea rows={2} aria-label={t("第 {0} 行 {1}", i + 1, skillText(f.label))} disabled={locked} value={cellText(row[f.key])} placeholder={skillText(f.presentation?.hint || f.presentation?.placeholder || '') || (f.default_value != null ? t("默认：{0}", skillText(cellText(f.default_value))) : f.required ? t("填写{0}", skillText(f.label)) : t("可选"))} onPaste={e => paste(e, i, j)} onChange={e => change(i, f.key, e.target.value)} />}
      </td>)}<td className="row-actions"><button className="icon-button" aria-label={t("复制第 {0} 行", i + 1)} disabled={locked} onClick={() => setRows([...rows.slice(0, i + 1), { ...row }, ...rows.slice(i + 1)])}><Copy size={15} /></button><button className="icon-button" aria-label={t("删除第 {0} 行", i + 1)} disabled={locked || rows.length <= 1} onClick={() => setRows(rows.filter((_, n) => n !== i))}><Trash2 size={15} /></button></td></tr>)}</tbody></table></div>
      <div className="table-bottom"><button className="text-button" disabled={locked} onClick={() => setRows([...rows, emptyRow(fields)])}><Plus size={16} />{t("添加任务")}</button>{schema.sample_rows?.length ? <button className="text-button muted" disabled={locked} onClick={() => { if (rows.some(r => !isBlankRow(r, fields)) && !window.confirm(t("用工作流示例替换当前表格？"))) return; setRows(schema.sample_rows!.map(r => ({ ...emptyRow(fields), ...localizePublicExample(locale, r, fields) }))); }}>{t("填入示例")}</button> : null}<span>{t("支持从 Excel 复制多格粘贴 · 空白行自动忽略")}</span></div>
    </section>
    {uploading && !uploadController.current && <p className="notice"><LoaderCircle className="spin" size={16} />{t("正在处理文件…")}</p>}
    {(localError || errors.length > 0) && <div className="error-list" role="alert">{localError && <p>{t(localError)}</p>}{errors.map((e, i) => <p key={i}>{t(e)}</p>)}</div>}
    <div className="execute-bar"><div><strong>{taskCount} {t(" 个已填任务，确认 Token 消耗费用后运行")}</strong><p>{t("先查看预计费用，确认后才会使用你的胜算云余额。")}</p></div><button className="button primary" disabled={locked} onClick={onQuote}>{busy ? <LoaderCircle className="spin" size={17} /> : null}{t("校验并预估费用")}<ArrowRight size={17} /></button></div>
    {!demo && <SkillGuide listing={listing} schema={schema} />}
    {sheets && <ImportDialog sheets={sheets} fields={fields} onClose={() => setSheets(null)} onImport={imported => { setRows(imported); setSheets(null); setLocalError(''); }} />}
  </>;
}
