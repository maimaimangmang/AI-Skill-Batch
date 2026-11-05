'use client';

import { ListBox, Select } from '@heroui/react';
import { Check, ChevronDown, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export type SelectOption = { value: string; label: string; disabled?: boolean };

export default function AppSelect({ label, value, options, onChange, disabled = false, required = false, icon, className = '', name }: {
  label: string; value: string; options: SelectOption[]; onChange: (value: string) => void;
  disabled?: boolean; required?: boolean; icon?: React.ReactNode; className?: string; name?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [portalContainer, setPortalContainer] = useState<Element>();
  const canClear = options.some(option => option.value === '');
  useEffect(() => { setPortalContainer(ref.current?.closest('dialog') || undefined); }, []);

  return <Select ref={ref} aria-label={label} name={name} fullWidth className={`app-select ${className}`} value={value} isDisabled={disabled} isRequired={required} onChange={key => {
    if (key !== null) onChange(String(key));
    else if (canClear) onChange('');
  }}>
    <Select.Trigger className="app-select-trigger">
      {icon && <span className="app-select-icon" aria-hidden="true">{icon}</span>}
      <Select.Value className={`app-select-value${value === '' ? ' is-placeholder' : ''}`} />
      {canClear && value !== '' && <Select.ClearButton className="app-select-clear"><X size={13} aria-hidden="true" /></Select.ClearButton>}
      <Select.Indicator className="app-select-indicator"><ChevronDown size={15} aria-hidden="true" /></Select.Indicator>
    </Select.Trigger>
    <Select.Popover className="app-select-popover" placement="bottom start" UNSTABLE_portalContainer={portalContainer}>
      <ListBox className="app-select-list">
        {options.map(option => <ListBox.Item key={option.value} id={option.value} textValue={option.label} isDisabled={option.disabled} className="app-select-item">
          <span className="app-select-item-label">{option.label}</span>
          <ListBox.ItemIndicator className="app-select-item-indicator"><Check size={16} aria-hidden="true" /></ListBox.ItemIndicator>
        </ListBox.Item>)}
      </ListBox>
    </Select.Popover>
  </Select>;
}
