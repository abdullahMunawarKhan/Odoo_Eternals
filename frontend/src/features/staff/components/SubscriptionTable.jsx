import React from 'react';
import { Link } from 'react-router-dom';
import { Eye, Repeat } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { formatShortDate, formatCurrency } from '../../../utils/formatters';

export function getSubscriptionStatusBadge(status) {
  switch (status) {
    case 'draft':
      return <Badge variant="default">Draft</Badge>;
    case 'quotation':
      return <Badge variant="info">Quotation</Badge>;
    case 'confirmed':
      return <Badge variant="primary">Confirmed</Badge>;
    case 'active':
      return <Badge variant="success">Active</Badge>;
    case 'paused':
      return <Badge variant="warning">Paused</Badge>;
    case 'closed':
      return <Badge variant="danger">Closed</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

export function SubscriptionTable({ subscriptions = [], isLoading = false }) {
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

  if (subscriptions.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <Repeat className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-slate-800">No subscriptions found</h3>
        <p className="text-xs text-slate-500 mt-1">Create a new subscription or adjust your filters.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
            <tr>
              <th className="py-3 px-4 font-semibold">Subscription #</th>
              <th className="py-3 px-4 font-semibold">Customer</th>
              <th className="py-3 px-4 font-semibold">Plan</th>
              <th className="py-3 px-4 font-semibold">Cadence</th>
              <th className="py-3 px-4 font-semibold">Term Dates</th>
              <th className="py-3 px-4 font-semibold">Next Billing</th>
              <th className="py-3 px-4 font-semibold text-right">Amount</th>
              <th className="py-3 px-4 font-semibold">Status</th>
              <th className="py-3 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {subscriptions.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="py-3.5 px-4 font-mono font-semibold text-indigo-600">
                  <Link to={`/staff/subscriptions/${s.id}`} className="hover:underline">
                    {s.number}
                  </Link>
                </td>
                <td className="py-3.5 px-4">
                  <div className="font-semibold text-slate-900">{s.customer?.name || '—'}</div>
                  <div className="text-xs text-slate-400">{s.customer?.company || s.customer?.email}</div>
                </td>
                <td className="py-3.5 px-4 font-medium text-slate-700">
                  {s.plan?.name || '—'}
                </td>
                <td className="py-3.5 px-4 text-xs capitalize text-slate-500">
                  {s.plan?.billing_period || 'Monthly'}
                </td>
                <td className="py-3.5 px-4 text-xs text-slate-500">
                  <div>{formatShortDate(s.start_date)}</div>
                  <div className="text-[10px] text-slate-400">to {formatShortDate(s.expiry_date)}</div>
                </td>
                <td className="py-3.5 px-4 text-xs text-slate-600 font-medium">
                  {s.next_billing_date ? formatShortDate(s.next_billing_date) : '—'}
                </td>
                <td className="py-3.5 px-4 text-right font-semibold text-slate-900">
                  {formatCurrency(s.totalAmount)}
                </td>
                <td className="py-3.5 px-4">
                  {getSubscriptionStatusBadge(s.status)}
                </td>
                <td className="py-3.5 px-4 text-right">
                  <Link to={`/staff/subscriptions/${s.id}`}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2.5 text-xs text-indigo-600 hover:text-indigo-700"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      Manage
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

