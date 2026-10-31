import React from 'react';
import { cn } from '../../utils/cn';

export function Table({ children, className = '' }) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
      <table className={cn('w-full text-left border-collapse text-sm', className)}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children, className = '' }) {
  return (
    <thead className={cn('bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider', className)}>
      {children}
    </thead>
  );
}

export function TableBody({ children, className = '' }) {
  return <tbody className={cn('divide-y divide-slate-100', className)}>{children}</tbody>;
}

export function TableRow({ children, className = '', ...props }) {
  return (
    <tr
      className={cn('hover:bg-slate-50/60 transition-colors', className)}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHead({ children, className = '', ...props }) {
  return (
    <th className={cn('px-4 py-3 font-semibold text-slate-600', className)} {...props}>
      {children}
    </th>
  );
}

export function TableCell({ children, className = '', ...props }) {
  return (
    <td className={cn('px-4 py-3.5 text-slate-700 align-middle', className)} {...props}>
      {children}
    </td>
  );
}

