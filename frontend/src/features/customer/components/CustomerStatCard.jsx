import React from 'react';
import { Card, CardContent } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { cn } from '../../../utils/cn';

export function CustomerStatCard({
  title,
  value,
  subtext,
  icon: Icon,
  color = 'text-indigo-600 bg-indigo-50 border-indigo-100',
  badge,
  badgeVariant = 'default',
}) {
  return (
    <Card className="hover:shadow-sm transition-all border-slate-200/80">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {title}
          </span>
          {Icon && (
            <div className={cn('w-9 h-9 rounded-xl border flex items-center justify-center shrink-0', color)}>
              <Icon className="w-4 h-4" />
            </div>
          )}
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </span>
          {badge && (
            <Badge variant={badgeVariant} className="text-[10px] py-0 px-2 font-medium">
              {badge}
            </Badge>
          )}
        </div>

        {subtext && (
          <p className="mt-2 text-xs text-slate-500 truncate">
            {subtext}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

