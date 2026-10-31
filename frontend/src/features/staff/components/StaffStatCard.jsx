import React from 'react';
import { Card, CardContent } from '../../../components/ui/Card';
import { Skeleton } from '../../../components/ui/Skeleton';
import { cn } from '../../../utils/cn';

export function StaffStatCard({
  title,
  value,
  subtext,
  icon: Icon,
  badge,
  badgeVariant = 'default',
  trend,
  trendType = 'positive',
  isLoading = false,
  className = '',
}) {
  if (isLoading) {
    return (
      <Card className={cn('p-5', className)}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-9 rounded-xl" />
        </div>
        <Skeleton className="h-8 w-20 mt-3" />
        <Skeleton className="h-3 w-32 mt-2" />
      </Card>
    );
  }

  return (
    <Card className={cn('hover:shadow-sm transition-all border border-slate-200/80', className)}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {title}
          </span>
          {Icon && (
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Icon className="w-4 h-4" />
            </div>
          )}
        </div>

        <div className="mt-3 flex items-baseline justify-between">
          <div className="text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </div>
          {badge && (
            <span
              className={cn(
                'text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider',
                badgeVariant === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : badgeVariant === 'warning'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              )}
            >
              {badge}
            </span>
          )}
        </div>

        {(subtext || trend) && (
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
            {trend && (
              <span
                className={cn(
                  'font-medium',
                  trendType === 'positive' ? 'text-emerald-600' : 'text-rose-600'
                )}
              >
                {trend}
              </span>
            )}
            {subtext && <span>{subtext}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

