import React from 'react';
import { Link } from 'react-router-dom';
import { Eye, FileDown, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { formatShortDate, formatCurrency } from '../../../utils/formatters';

export function getQuotationStatusBadge(status) {
  switch (status) {
    case 'draft':
      return <Badge variant="default">Draft</Badge>;
    case 'quotation':
      return <Badge variant="info">Quotation</Badge>;
    case 'confirmed':
      return <Badge variant="primary">Confirmed</Badge>;
    case 'active':
      return <Badge variant="success">Active (Converted)</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

export function QuotationTable({
  quotations = [],
  onConvert,
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
              <div className="h-3 w-44 bg-slate-100 rounded" />
            </div>
            <div className="h-4 w-20 bg-slate-200 rounded" />
            <div className="h-8 w-24 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (quotations.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-slate-800">No quotations found</h3>
        <p className="text-xs text-slate-500 mt-1">Create a new customer quotation or adjust search criteria.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
            <tr>
              <th className="py-3 px-4 font-semibold">Quotation #</th>
              <th className="py-3 px-4 font-semibold">Customer</th>
              <th className="py-3 px-4 font-semibold">Plan</th>
              <th className="py-3 px-4 font-semibold">Created Date</th>
              <th className="py-3 px-4 font-semibold">Valid Until</th>
              <th className="py-3 px-4 font-semibold text-right">Est. Amount</th>
              <th className="py-3 px-4 font-semibold">Status</th>
              <th className="py-3 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {quotations.map((q) => {
              const canConvert = q.status === 'draft' || q.status === 'quotation';
              return (
                <tr key={q.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-semibold text-indigo-600">
                    <Link to={`/staff/quotations/${q.id}`} className="hover:underline">
                      {q.number}
                    </Link>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900">{q.customer?.name || '—'}</div>
                    <div className="text-xs text-slate-400">{q.customer?.company || q.customer?.email}</div>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-700">
                    {q.plan?.name || '—'}
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-500">
                    {formatShortDate(q.created_at)}
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-500">
                    {formatShortDate(q.quotation_valid_until)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-semibold text-slate-900">
                    {formatCurrency(q.totalAmount)}
                  </td>
                  <td className="py-3.5 px-4">
                    {getQuotationStatusBadge(q.status)}
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-1">
                    {onDownloadPDF && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDownloadPDF(q)}
                        className="h-8 px-2 text-slate-600 hover:text-slate-900"
                        title="Download Quotation PDF"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {canConvert && onConvert && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onConvert(q)}
                        className="h-8 px-2.5 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                        title="Convert to Subscription"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        Convert
                      </Button>
                    )}
                    <Link to={`/staff/quotations/${q.id}`}>
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

