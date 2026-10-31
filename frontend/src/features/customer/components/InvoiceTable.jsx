import React from 'react';
import { Receipt, Eye, Download } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { Button } from '../../../components/ui/Button';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { formatShortDate } from '../../../utils/formatters';

export function getInvoiceStatusBadge(status) {
  switch (status) {
    case 'paid':
      return { variant: 'success', label: 'Paid', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'confirmed':
      return { variant: 'warning', label: 'Confirmed / Due', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'cancelled':
      return { variant: 'danger', label: 'Cancelled', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
    case 'draft':
    default:
      return { variant: 'default', label: 'Draft', bg: 'bg-slate-50 text-slate-700 border-slate-200' };
  }
}

export function InvoiceTable({
  invoices = [],
  isLoading = false,
  onViewDetails,
  onDownloadPDF,
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
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="No invoices found"
        description="There are currently no billing statements or invoices matching your filters."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice #</TableHead>
          <TableHead>Subscription</TableHead>
          <TableHead>Issue Date</TableHead>
          <TableHead>Due Date</TableHead>
          <TableHead>Total Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((inv) => {
          const statusInfo = getInvoiceStatusBadge(inv.status);
          const total = Number(inv.total || 0).toFixed(2);
          const subNum = inv.subscription?.number || '—';

          return (
            <TableRow key={inv.id} className="cursor-pointer hover:bg-slate-50/70" onClick={() => onViewDetails?.(inv.id)}>
              <TableCell className="font-semibold text-slate-900">
                {inv.number || `INV-${inv.id.slice(0, 6)}`}
              </TableCell>

              <TableCell className="text-slate-600 text-xs font-medium">
                {subNum}
              </TableCell>

              <TableCell className="text-slate-600 text-xs">
                {formatShortDate(inv.issue_date || inv.created_at)}
              </TableCell>

              <TableCell className="text-slate-600 text-xs">
                {formatShortDate(inv.due_date || inv.created_at)}
              </TableCell>

              <TableCell className="font-bold text-slate-900">
                ${total}
              </TableCell>

              <TableCell>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusInfo.bg}`}>
                  {statusInfo.label}
                </span>
              </TableCell>

              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewDetails?.(inv.id)}
                    leftIcon={<Eye className="w-3.5 h-3.5" />}
                  >
                    View
                  </Button>
                  {onDownloadPDF && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDownloadPDF?.(inv)}
                      leftIcon={<Download className="w-3.5 h-3.5" />}
                    >
                      PDF
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

