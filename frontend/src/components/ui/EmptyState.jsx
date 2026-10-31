import React from 'react';
import { FileQuestion } from 'lucide-react';
import { Button } from './Button';

export function EmptyState({
  icon: Icon = FileQuestion,
  title = 'No records found',
  description = 'There is currently no data to display.',
  actionLabel,
  onAction,
  actionIcon,
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 md:p-12 text-center rounded-xl border border-dashed border-slate-300 bg-slate-50/50">
      <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 mb-4 shadow-2xs">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      <p className="text-sm text-slate-500 mt-1 max-w-sm">{description}</p>
      {actionLabel && onAction && (
        <div className="mt-5">
          <Button onClick={onAction} leftIcon={actionIcon}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

