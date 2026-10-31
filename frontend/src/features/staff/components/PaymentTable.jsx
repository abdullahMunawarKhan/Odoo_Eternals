import React from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, Receipt, Eye } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { formatShortDate, formatCurrency } from '../../../utils/formatters';

export function PaymentTable({ payments = [], isLoading = false }) {
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
            <div className="h-8 w-16 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-slate-800">No payment records found</h3>
        <p className="text-xs text-slate-500 mt-1">Record a new payment received against an invoice.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
            <tr>
              <th className="py-3 px-4 font-semibold">Reference</th>
              <th className="py-3 px-4 font-semibold">Customer</th>
              <th className="py-3 px-4 font-semibold">Related Invoice</th>
              <th className="py-3 px-4 font-semibold">Method</th>
              <th className="py-3 px-4 font-semibold">Date</th>
              <th className="py-3 px-4 font-semibold text-right">Amount Paid</th>
              <th className="py-3 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payments.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                  {p.reference || `PAY-${p.id?.slice(0, 8)}`}
                </td>
                <td className="py-3.5 px-4 font-medium text-slate-800">
                  {p.invoice?.customer?.name || '—'}
                </td>
                <td className="py-3.5 px-4">
                  {p.invoice ? (
                    <Link
                      to={`/staff/invoices/${p.invoice.id}`}
                      className="font-mono text-xs text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      {p.invoice.number}
                    </Link>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="py-3.5 px-4 capitalize">
                  <Badge variant="default" className="text-[11px]">
                    {p.method?.replace('_', ' ') || 'card'}
                  </Badge>
                </td>
                <td className="py-3.5 px-4 text-xs text-slate-500">
                  {formatShortDate(p.payment_date || p.created_at)}
                </td>
                <td className="py-3.5 px-4 text-right font-semibold text-emerald-600">
                  {formatCurrency(p.amount)}
                </td>
                <td className="py-3.5 px-4 text-right">
                  {p.invoice?.id && (
                    <Link to={`/staff/invoices/${p.invoice.id}`}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2.5 text-xs text-indigo-600 hover:text-indigo-700"
                        title="View Related Invoice"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Invoice
                      </Button>
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

