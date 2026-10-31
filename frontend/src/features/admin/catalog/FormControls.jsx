import React from 'react';
import { cn } from '../../../utils/cn';

const base =
  'w-full rounded-lg border bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1';
const ok = 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-200';
const bad = 'border-rose-300 focus:border-rose-500 focus:ring-rose-200';

function Wrapper({ label, required, error, helperText, children, className }) {
  return (
    <div className={cn('w-full flex flex-col gap-1.5', className)}>
      {label && (
        <label className="text-xs font-semibold text-slate-700 select-none">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-rose-600">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
}

export function SelectField({ label, value, onChange, options = [], required, error, helperText, placeholder = 'Select...', className, ...props }) {
  return (
    <Wrapper label={label} required={required} error={error} helperText={helperText} className={className}>
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={cn(base, error ? bad : ok)} {...props}>
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Wrapper>
  );
}

export function TextareaField({ label, value, onChange, required, error, helperText, className, ...props }) {
  return (
    <Wrapper label={label} required={required} error={error} helperText={helperText} className={className}>
      <textarea rows={3} value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={cn(base, error ? bad : ok)} {...props} />
    </Wrapper>
  );
}

export function CheckboxField({ label, description, checked, onChange, disabled }) {
  return (
    <label className={cn('flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3', disabled ? 'opacity-60' : 'cursor-pointer hover:bg-slate-50')}>
      <input
        type="checkbox"
        checked={Boolean(checked)}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
      />
      <span>
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        {description && <span className="block text-xs text-slate-500 mt-0.5">{description}</span>}
      </span>
    </label>
  );
}
