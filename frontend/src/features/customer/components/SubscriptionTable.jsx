import React from 'react';
import { Repeat, ChevronRight, Eye } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { formatShortDate } from '../../../utils/formatters';

export function getSubscriptionStatusBadge(status) {
  switch (status) {
    case 'active':
      return { variant: 'success', label: 'Active', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'confirmed':
      return { variant: 'primary', label: 'Confirmed', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    case 'quotation':
      return { variant: 'warning', label: 'Quotation', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'paused':
      return { variant: 'info', label: 'Paused', bg: 'bg-sky-50 text-sky-700 border-sky-200' };
    case 'closed':
      return { variant: 'danger', label: 'Closed', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
    case 'draft':
    default:
      return { variant: 'default', label: 'Draft', bg: 'bg-slate-50 text-slate-700 border-slate-200' };
  }
}

export function SubscriptionTable({
  subscriptions = [],
  isLoading = false,
  onViewDetails,
}) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (subscriptions.length === 0) {
    return (
      <EmptyState
        icon={Repeat}
        title="No subscriptions found"
        description="You do not have any active or past subscriptions matching your criteria."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Subscription #</TableHead>
          <TableHead>Plan</TableHead>
          <TableHead>Billing Cadence</TableHead>
          <TableHead>Start Date</TableHead>
          <TableHead>Next Billing</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {subscriptions.map((sub) => {
          const statusInfo = getSubscriptionStatusBadge(sub.status);
          const planName = sub.plan?.name || 'Standard Plan';
          const price = Number(sub.plan?.price || 0).toFixed(2);
          const cadence = sub.plan?.billing_period ? sub.plan.billing_period.toUpperCase() : 'MONTHLY';

          return (
            <TableRow key={sub.id} className="cursor-pointer hover:bg-slate-50/70" onClick={() => onViewDetails?.(sub.id)}>
              <TableCell className="font-semibold text-slate-900">
                {sub.number || `SUB-${sub.id.slice(0, 6)}`}
              </TableCell>

              <TableCell>
                <div className="font-medium text-slate-800">{planName}</div>
              </TableCell>

              <TableCell>
                <span className="text-xs font-semibold text-slate-500">{cadence}</span>
              </TableCell>

              <TableCell className="text-slate-600 text-xs">
                {formatShortDate(sub.start_date || sub.created_at)}
              </TableCell>

              <TableCell className="text-slate-600 text-xs">
                {sub.next_billing_date ? formatShortDate(sub.next_billing_date) : '—'}
              </TableCell>

              <TableCell className="font-medium text-slate-900">
                ${price}
              </TableCell>

              <TableCell>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusInfo.bg}`}>
                  {statusInfo.label}
                </span>
              </TableCell>

              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDetails?.(sub.id);
                  }}
                  leftIcon={<Eye className="w-3.5 h-3.5" />}
                >
                  Details
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

