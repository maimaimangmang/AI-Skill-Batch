'use client';
import { Expand, ListFilter, Palette, Ratio, ToggleLeft } from 'lucide-react';
import type { Field } from '@/lib/types';
import { cellText } from '@/lib/domain';
import { fieldKind, fieldRole } from '@/lib/task-editor';
import { useI18n } from './language-provider';
import AppSelect from './app-select';

export default function TaskFieldInput({ field, value, label, disabled, expanded = false, onChange, onPaste }: {
  field: Field; value: unknown; label: string; disabled: boolean; expanded?: boolean;
  onChange: (value: unknown) => void; onPaste?: (event: React.ClipboardEvent) => void;
}) {
  const { t, skillText } = useI18n();
  const kind = fieldKind(field);
  const placeholder = skillText(field.presentation?.placeholder || field.presentation?.hint || '') || (field.default_value != null ? t('默认：{0}', skillText(cellText(field.default_value))) : field.required ? t('填写{0}', skillText(field.label)) : t('可选'));
  const props = { 'aria-label': label, disabled, value: cellText(value), onPaste, onChange: (event: React.ChangeEvent<HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value) };
  if (kind === 'choice') {
    const values = field.enum_values?.length ? field.enum_values : [true, false];
    const role = fieldRole(field);
    const Icon = role === 'boolean' ? ToggleLeft : role === 'ratio' ? Ratio : role === 'dimensions' ? Expand : role === 'style' ? Palette : ListFilter;
    return <AppSelect label={label} value={cellText(value)} disabled={disabled} required={field.required} onChange={onChange} icon={<Icon size={16} />} options={[{ value: '', label: field.default_value != null ? t('默认：{0}', skillText(cellText(field.default_value))) : field.required ? t('请选择') : t('可选') }, ...values.map(option => ({ value: cellText(option), label: field.value_type === 'boolean' ? (option === true || option === 'true' ? t('是') : t('否')) : skillText(cellText(option)) }))]} />;
  }
  if (kind === 'number') return <input {...props} className="precision-control" type="number" step={field.value_type === 'integer' ? 1 : 'any'} placeholder={placeholder} />;
  return <div className={`precision-control precision-text-field${expanded ? ' precision-text-expanded' : ''}`}><textarea {...props} className={`precision-textarea${kind === 'structured' ? ' precision-code' : ''}`} rows={1} placeholder={placeholder} spellCheck={kind !== 'structured'} /><span className="precision-placeholder" aria-hidden="true">{placeholder}</span></div>;
}
