import React from 'react';
import { Link } from 'react-router-dom';
import { Eye, FileDown, CheckCircle, Receipt, XCircle } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { formatShortDate, formatCurrency } from '../../../utils/formatters';

export function getInvoiceStatusBadge(status, dueDate, amountPaid, total) {
  const isOverdue =
    status === 'confirmed' &&
    dueDate &&
    new Date(dueDate) < new Date() &&
    Number(amountPaid || 0) < Number(total || 0);

  if (isOverdue) {
    return <Badge variant="danger">Overdue</Badge>;
  }

  switch (status) {
    case 'draft':
      return <Badge variant="default">Draft</Badge>;
    case 'confirmed':
      return <Badge variant="warning">Confirmed (Unpaid)</Badge>;
    case 'paid':
      return <Badge variant="success">Paid</Badge>;
    case 'cancelled':
      return <Badge variant="danger">Cancelled</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

export function InvoiceTable({
  invoices = [],
  onConfirm,
  onCancel,
  onDownloadPDF,
  isLoading = false,
}) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden p-6 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse flex items-center justify-between py-2 border-b border-slate-100">
            <div className="space-y-2">
              <div className="h-4 w-32 bg-slate-200 rounded" />
              <div className="h-3 w-40 bg-slate-100 rounded" />
            </div>
            <div className="h-4 w-20 bg-slate-200 rounded" />
            <div className="h-8 w-20 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-slate-800">No invoices found</h3>
        <p className="text-xs text-slate-500 mt-1">Generate invoices from subscriptions or adjust your filters.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
            <tr>
              <th className="py-3 px-4 font-semibold">Invoice #</th>
              <th className="py-3 px-4 font-semibold">Customer</th>
              <th className="py-3 px-4 font-semibold">Subscription</th>
              <th className="py-3 px-4 font-semibold">Issue / Due Date</th>
              <th className="py-3 px-4 font-semibold text-right">Total</th>
              <th className="py-3 px-4 font-semibold text-right">Paid</th>
              <th className="py-3 px-4 font-semibold">Status</th>
              <th className="py-3 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoices.map((inv) => {
              const isDraft = inv.status === 'draft';
              const canCancel = inv.status === 'draft' || inv.status === 'confirmed';

              return (
                <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-semibold text-indigo-600">
                    <Link to={`/staff/invoices/${inv.id}`} className="hover:underline">
                      {inv.number}
                    </Link>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900">{inv.customer?.name || '—'}</div>
                    <div className="text-xs text-slate-400">{inv.customer?.company || inv.customer?.email}</div>
                  </td>
                  <td className="py-3.5 px-4 text-xs font-mono text-slate-600">
                    {inv.subscription?.number || '—'}
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-500">
                    <div>{formatShortDate(inv.issue_date)}</div>
                    <div className="text-[11px] text-slate-400">Due: {formatShortDate(inv.due_date)}</div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-semibold text-slate-900">
                    {formatCurrency(inv.total)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-medium text-emerald-600">
                    {formatCurrency(inv.amount_paid)}
                  </td>
                  <td className="py-3.5 px-4">
                    {getInvoiceStatusBadge(inv.status, inv.due_date, inv.amount_paid, inv.total)}
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-1">
                    {onDownloadPDF && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDownloadPDF(inv)}
                        className="h-8 px-2 text-slate-600 hover:text-slate-900"
                        title="Download PDF"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {isDraft && onConfirm && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onConfirm(inv)}
                        className="h-8 px-2.5 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                        title="Confirm Draft Invoice"
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1" />
                        Confirm
                      </Button>
                    )}
                    {canCancel && onCancel && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onCancel(inv)}
                        className="h-8 px-2 text-rose-600 hover:bg-rose-50"
                        title="Cancel Invoice"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Link to={`/staff/invoices/${inv.id}`}>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-indigo-600 hover:text-indigo-700"
                        title="View Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

