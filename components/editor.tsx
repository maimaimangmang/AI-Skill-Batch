'use client';
import { LocalizedAnchor } from './localized-link';
import { sourceMessage } from '@/lib/i18n';
import { useI18n } from './language-provider';
import WorkflowAuthor from './workflow-author';
import AssetInput, { type AssetPreview, type AssetUploadStatus } from './asset-input';
import { assetValues } from '@/lib/asset-input';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Braces, ChevronDown, ChevronLeft, Copy, Download, Expand, Hash, ImageIcon, ListFilter, LoaderCircle, Palette, Pencil, Plus, Ratio, ToggleLeft, Trash2, Type, Upload } from 'lucide-react';
import BackLink from './back-link';
import Papa from 'papaparse';
import type { Balance, Field, InputRow, Listing, Schema } from '@/lib/types';
import { cellText, emptyRow, isBlankRow } from '@/lib/domain';
import { base64, download, exportSheet, post, type ApiRequestOptions } from '@/lib/client';
import WorkflowExamples from './workflow-examples';
import { WorkflowInstructions } from './skill-guide';
import AgentInstall from './agent-install';
import FavoriteButton from './favorite-button';
import { SkillBilling, SkillTags } from './skill-pricing';
import { workflowPath } from '@/lib/official';
import ImportDialog, { type ImportSheet } from './import-dialog';
import Modal from './modal';
import TaskFieldInput from './task-field-input';
import AppSelect from './app-select';
import { fieldKind, fieldRole, taskPaste } from '@/lib/task-editor';
import '@/app/precision-editor.css';

function SelectAll({ selected, total, disabled, label, onChange }: { selected: number; total: number; disabled: boolean; label: string; onChange: (checked: boolean) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = selected > 0 && selected < total; }, [selected, total]);
  return <input ref={ref} type="checkbox" aria-label={label} checked={total > 0 && selected === total} disabled={disabled} onChange={event => onChange(event.target.checked)} />;
}
type Props = { showBackNavigation?: boolean; showBalance?: boolean; balance?: Balance | null; listing: Listing; schema: Schema; rows: InputRow[]; setRows: (rows: InputRow[]) => void; demo: boolean; guest?: boolean; busy: boolean; errors: string[]; api: (path: string, options?: ApiRequestOptions) => Promise<any>; onQuote: () => void };
export default function Editor({ showBackNavigation = true, listing, schema, rows, setRows, demo, guest = false, busy, errors, api, onQuote }: Props) {
  const { t, skillText } = useI18n();
  const [localError, setLocalError] = useState(''); const [uploading, setUploading] = useState(false);
  const [mobileOpenRow, setMobileOpenRow] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkKey, setBulkKey] = useState('');
  const [bulkValue, setBulkValue] = useState<unknown>('');
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
  const activeMobileRow = rows.find(row => rowId(row) === mobileOpenRow) || rows[0];
  const taskCount = rows.filter(row => !isBlankRow(row, fields)).length;
  const selectedRows = rows.filter(row => selected.has(rowId(row)));
  const bulkField = fields.find(field => field.key === bulkKey) || fields[0];
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
  async function attach(file: File | undefined, index: number | null, key: string, multiple: boolean) {
    if (!file || uploadController.current) return; setUploading(true); setLocalError('');
    const controller = new AbortController(); uploadController.current = controller;
    setAssetUpload({ rowId: index === null ? -1 : rowId(rows[index]), key, name: file.name, startedAt: Date.now(), phase: 'preparing', percent: null });
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error(sourceMessage("每个附件最大 10 MB。"));
      const field = fields.find(f => f.key === key)!;
      const existing = multiple ? assetValues(index === null ? bulkValue : rows[index][key]).filter(Boolean) : [];
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
      const nextValue = multiple ? [...existing, value.inputAssetId] : value.inputAssetId;
      if (index === null) setBulkValue(nextValue); else change(index, key, nextValue);
      setAssetUpload(current => current && { ...current, phase: 'succeeded', percent: 100 });
    } catch (e) {
      if (mounted.current) { setLocalError(controller.signal.aborted ? sourceMessage("已取消上传，可重新选择文件。") : (e as Error).message); setAssetUpload(current => current && { ...current, phase: 'failed', percent: null }); }
    } finally { uploadController.current = null; if (mounted.current) setUploading(false); }
  }
  function paste(e: React.ClipboardEvent, startRow: number, startColumn: number) {
    try {
      const matrix = taskPaste(e.clipboardData.getData('text'), startColumn, fields.length);
      if (!matrix) return;
      e.preventDefault();
      if (startRow + matrix.length > 2000) throw new Error(sourceMessage('文件最多 2000 行、100 列。'));
      const next = rows.map(row => changedRow(row, {}));
      while (next.length < startRow + matrix.length) next.push(emptyRow(fields));
      matrix.forEach((values, i) => values.forEach((value, j) => { next[startRow + i][fields[startColumn + j].key] = value; }));
      setRows(next); setLocalError('');
    } catch (error) { e.preventDefault(); setLocalError((error as Error).message); }
  }
  function replaceRows(next: InputRow[]) { setRows(next); setSelected(new Set()); setExpandedRow(null); setLocalError(''); }
  function addTask() { const row = emptyRow(fields); setMobileOpenRow(rowId(row)); setRows([...rows, row]); }
  function selectAll(checked: boolean) { setSelected(checked ? new Set(rows.map(rowId)) : new Set()); }
  function fieldInput(field: Field, index: number) {
    const row = rows[index];
    return fieldKind(field) === 'asset' ? <AssetInput compact localDraft={guest} field={field} value={row[field.key]} rowNumber={index + 1} disabled={locked} previews={previews} upload={assetUpload?.rowId === rowId(row) && assetUpload.key === field.key ? assetUpload : undefined} onCancelUpload={() => uploadController.current?.abort()} onChange={value => { setAssetUpload(null); change(index, field.key, value); }} onUpload={file => attach(file, index, field.key, field.value_type.endsWith('[]'))} onPaste={event => paste(event, index, fields.indexOf(field))} /> : <TaskFieldInput field={field} value={row[field.key]} label={t('第 {0} 行 {1}', index + 1, skillText(field.label))} disabled={locked} expanded={expandedRow === rowId(row)} onChange={value => change(index, field.key, value)} onPaste={event => paste(event, index, fields.indexOf(field))} />;
  }
  const icons = { asset: ImageIcon, choice: ListFilter, style: Palette, ratio: Ratio, dimensions: Expand, boolean: ToggleLeft, number: Hash, structured: Braces, text: Type };
  const weights = { asset: 260, choice: 220, number: 150, structured: 300, text: 300 };
  const totalWeight = fields.reduce((sum, field) => sum + weights[fieldKind(field)], 0);
  return <div className="precision-editor">
    <div className="page-heading editor-heading"><div className="precision-heading-copy"><div className="precision-title">{showBackNavigation && <BackLink className="precision-back" fallback="/skills" disabled={locked} aria-label={t('返回上一页')} title={t('返回上一页')}><ChevronLeft size={26} aria-hidden="true" /></BackLink>}<h1>{skillText(listing.displayName)}</h1></div><div className="precision-author"><WorkflowAuthor name={listing.creator?.nickname} />{!demo && <SkillTags skill={listing} />}</div></div><div className="editor-heading-actions">{!demo && <FavoriteButton skill={listing} label />}<AgentInstall key={listing.id} listing={listing} demo={demo} /></div></div>
    <LocalizedAnchor className="mobile-task-jump" href="#task-table">{t('填写任务表')}<ArrowRight size={16} aria-hidden="true" /></LocalizedAnchor>
    <div className="precision-info">
    {!demo && <SkillBilling skill={listing} />}
    <WorkflowExamples key={listing.id} listing={listing} schema={schema} demo={demo} disabled={locked} onUse={row => {
      if (rows.some(r => !isBlankRow(r, fields)) && !window.confirm(t("用这组示例输入替换当前表格？"))) return;
      replaceRows([Object.fromEntries(fields.map(field => [field.key, row[field.key] ?? field.default_value ?? '']))]);
    }} />
    <WorkflowInstructions listing={listing} schema={schema} />
    </div>
    <section className="editor-card precision-sheet" data-wrap-fields={fields.length > 5 || undefined} id="task-table" aria-label={t('任务表')}>
      <div className="table-toolbar"><div className="precision-selection"><SelectAll selected={selectedRows.length} total={rows.length} disabled={locked} label={t('选择全部任务')} onChange={selectAll} /><strong role="status">{selectedRows.length ? t('已选择 {0} 项任务', selectedRows.length) : t('{0} 个已填任务', taskCount)}</strong>{selectedRows.length > 0 && <button className="text-button precision-clear" onClick={() => setSelected(new Set())}>{t('取消选择')}</button>}</div><div className="toolbar-actions"><button className="button small" disabled={locked} onClick={() => input.current?.click()}><Upload size={17} />{t("导入表格")}</button><button className="button small" disabled={locked} onClick={async () => { try { if (demo || guest) await exportSheet(fields.map(f => f.label), [fields.map(f => cellText(f.default_value))], 'loomdesk-template.xlsx'); else await download(`${workflowPath(listing)}/workbook`, 'loomdesk-template.xlsx'); } catch (e) { setLocalError((e as Error).message); } }}><Download size={17} />{t("下载模板")}</button><button className="button small" disabled={locked || !selectedRows.length} onClick={() => { setBulkKey(fields[0].key); setBulkValue(''); setAssetUpload(null); setBulkOpen(true); }}><Pencil size={16} />{t('批量修改')}</button><button className="button small precision-add" disabled={locked || rows.length >= 2000} onClick={addTask}><Plus size={18} />{t('添加任务')}</button><button className="button small primary precision-run" disabled={locked} onClick={onQuote}>{busy && <LoaderCircle className="spin" size={17} />}{t('校验并预估费用')}<ArrowRight size={17} /></button><input type="file" ref={input} className="sr-only" accept=".xlsx,.csv,.tsv" aria-label={t("导入 Excel 或 CSV")} onChange={e => importFile(e.target.files?.[0])} /></div></div>
      <p className="mobile-table-hint">{t('每张卡片是一项任务，按字段逐项填写。')}</p>
      <div className="table-scroll editor-scroll"><table className="task-table precision-table"><colgroup><col style={{ width: 68 }} />{fields.map(field => { const share = weights[fieldKind(field)] / totalWeight; return <col key={field.key} style={{ width: `calc(${share * 100}% - ${share * 180}px)` }} />; })}<col style={{ width: 112 }} /></colgroup><thead><tr><th className="row-number"><div className="precision-rowhead"><SelectAll selected={selectedRows.length} total={rows.length} disabled={locked} label={t('全选任务行')} onChange={selectAll} /></div></th>{fields.map(field => { const Icon = icons[fieldRole(field)]; return <th key={field.key}><span className="precision-column" title={fieldRole(field) === 'ratio' ? t('宽高比决定画面形状，例如 1:1、16:9。') : fieldRole(field) === 'dimensions' ? t('输出尺寸决定像素数量，例如 2048×2048。') : undefined}><Icon size={18} aria-hidden="true" />{skillText(field.label)}{field.required && <em>*</em>}</span></th>; })}<th className="row-actions">{t('操作')}</th></tr></thead><tbody>{rows.map((row, i) => <tr key={rowId(row)} id={`task-row-${rowId(row)}`} className={`${activeMobileRow === row ? 'mobile-row-open ' : ''}${selected.has(rowId(row)) ? 'precision-selected ' : ''}${expandedRow === rowId(row) ? 'precision-expanded' : ''}`}><td className="row-number"><div className="precision-rowhead"><input type="checkbox" aria-label={t('选择任务 {0}', i + 1)} disabled={locked} checked={selected.has(rowId(row))} onChange={event => setSelected(current => { const next = new Set(current); if (event.target.checked) next.add(rowId(row)); else next.delete(rowId(row)); return next; })} /><span className="desktop-row-number">{String(i + 1).padStart(2, '0')}</span><button type="button" className="mobile-row-toggle" aria-expanded={activeMobileRow === row} onClick={() => setMobileOpenRow(rowId(row))}><span>{t('任务')} {String(i + 1).padStart(2, '0')}</span><ChevronDown size={16} /></button></div></td>{fields.map((field, column) => <td key={field.key} className={`precision-cell-${fieldKind(field)}`} data-field-label={`${skillText(field.label)}${field.required ? ' *' : ''}`} onPaste={event => { if (!event.defaultPrevented) paste(event, i, column); }}>{fieldInput(field, i)}{expandedRow === rowId(row) && field.description && <small className="precision-field-help">{skillText(field.description)}</small>}</td>)}<td className="row-actions"><button className="icon-button precision-expand" aria-label={t('展开任务 {0}', i + 1)} aria-expanded={expandedRow === rowId(row)} aria-controls={`task-row-${rowId(row)}`} disabled={locked} onClick={() => setExpandedRow(current => current === rowId(row) ? null : rowId(row))}><ChevronDown size={17} /></button><button className="icon-button" aria-label={t('复制第 {0} 行', i + 1)} title={t('复制第 {0} 行', i + 1)} disabled={locked || rows.length >= 2000} onClick={() => { const copy = { ...row }; setMobileOpenRow(rowId(copy)); setRows([...rows.slice(0, i + 1), copy, ...rows.slice(i + 1)]); }}><Copy size={17} /></button><button className="icon-button" aria-label={t('删除第 {0} 行', i + 1)} title={t('删除第 {0} 行', i + 1)} disabled={locked || rows.length <= 1} onClick={() => setRows(rows.filter((_, index) => index !== i))}><Trash2 size={17} /></button></td></tr>)}</tbody></table></div>
      <div className="table-bottom"><button type="button" className="button small precision-add" disabled={locked || rows.length >= 2000} onClick={addTask}><Plus size={18} aria-hidden="true" />{t('添加任务')}</button><button type="button" className="button small primary precision-bottom-run" disabled={locked} onClick={onQuote}>{busy && <LoaderCircle className="spin" size={17} />}{t('校验并预估费用')}<ArrowRight size={17} aria-hidden="true" /></button></div>
    {uploading && !uploadController.current && <p className="notice"><LoaderCircle className="spin" size={16} />{t("正在处理文件…")}</p>}
    {(localError || errors.length > 0) && <div className="error-list" role="alert">{localError && <p>{t(localError)}</p>}{errors.map((e, i) => <p key={i}>{t(e.replace(/「([^」]+)」/g, (_, label) => `「${skillText(label)}」`))}</p>)}</div>}
    </section>
    {bulkOpen && bulkField && <Modal title={t('批量修改')} locked={locked} onClose={() => setBulkOpen(false)}><div className="precision-bulk"><p>{t('仅修改已选的 {0} 项任务，其他字段保持原值。', selectedRows.length)}</p><div className="precision-bulk-field"><span>{t('选择字段')}</span><AppSelect label={t('选择字段')} disabled={locked} value={bulkField.key} onChange={value => { setBulkKey(value); setBulkValue(''); setAssetUpload(null); }} options={fields.map(field => ({ value: field.key, label: skillText(field.label) }))} /></div><div className="precision-bulk-value">{fieldKind(bulkField) === 'asset' ? <AssetInput key={bulkField.key} localDraft={guest} field={bulkField} value={bulkValue} rowNumber={1} disabled={locked} previews={previews} upload={assetUpload?.rowId === -1 && assetUpload.key === bulkField.key ? assetUpload : undefined} onCancelUpload={() => uploadController.current?.abort()} onChange={setBulkValue} onUpload={file => attach(file, null, bulkField.key, bulkField.value_type.endsWith('[]'))} onPaste={() => {}} /> : <TaskFieldInput key={bulkField.key} field={bulkField} value={bulkValue} label={t('批量填写{0}', skillText(bulkField.label))} expanded disabled={locked} onChange={setBulkValue} />}</div><button className="button primary" disabled={locked || !selectedRows.length} onClick={() => { setRows(rows.map(row => selected.has(rowId(row)) ? changedRow(row, { [bulkField.key]: bulkValue }) : row)); setBulkOpen(false); }}>{t('应用到 {0} 项任务', selectedRows.length)}<ArrowRight size={16} /></button></div></Modal>}
    {sheets && <ImportDialog sheets={sheets} fields={fields} onClose={() => setSheets(null)} onImport={imported => { replaceRows(imported); setSheets(null); }} />}
  </div>;
}
