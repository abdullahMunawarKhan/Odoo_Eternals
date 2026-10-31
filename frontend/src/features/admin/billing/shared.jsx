import React from 'react';
import { useLocation } from 'react-router-dom';
import { AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { PAGE_SIZE } from '../../../services/billingService';

// The same screens serve /admin and /staff.
export function useBase() {
  const { pathname } = useLocation();
  return pathname.startsWith('/staff') ? '/staff' : '/admin';
}

const SUB = {
  draft: ['Draft', 'default'],
  quotation: ['Quotation', 'info'],
  confirmed: ['Confirmed', 'primary'],
  active: ['Active', 'success'],
  paused: ['Paused', 'warning'],
  closed: ['Closed', 'danger'],
};
export function SubStatusBadge({ status }) {
  const [label, variant] = SUB[status] ?? [status, 'default'];
  return <Badge variant={variant}>{label}</Badge>;
}

const INV = {
  draft: ['Draft', 'default'],
  confirmed: ['Confirmed', 'primary'],
  paid: ['Paid', 'success'],
  cancelled: ['Cancelled', 'danger'],
};
export function InvoiceStatusBadge({ status, overdue }) {
  if (overdue) return <Badge variant="danger">Overdue</Badge>;
  const [label, variant] = INV[status] ?? [status, 'default'];
  return <Badge variant={variant}>{label}</Badge>;
}

export function PageHeader({ title, description, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function ErrorBox({ message, onRetry }) {
  return (
    <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 flex items-start justify-between gap-3 text-sm text-rose-800">
      <div className="flex items-start gap-2.5">
        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
        <p>{message}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

export function Pager({ page, total, onPage, loading }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return (
    <div className="flex items-center justify-between text-xs text-slate-500">
      <span>
        {total} {total === 1 ? 'record' : 'records'}
      </span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page === 0 || loading} onClick={() => onPage(page - 1)} leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}>
          Prev
        </Button>
        <span>
          Page {page + 1} of {pages}
        </span>
        <Button variant="outline" size="sm" disabled={page + 1 >= pages || loading} onClick={() => onPage(page + 1)} rightIcon={<ChevronRight className="w-3.5 h-3.5" />}>
          Next
        </Button>
      </div>
    </div>
  );
}

export function FilterChips({ value, onChange, options }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(([val, label]) => (
        <button
          key={val}
          type="button"
          onClick={() => onChange(val)}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
            value === val ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full max-w-sm px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
    />
  );
}

// Debounced value for search boxes.
export function useDebounced(value, ms = 300) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
