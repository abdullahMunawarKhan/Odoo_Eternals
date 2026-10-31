import React from 'react';
import { Link } from 'react-router-dom';
import { Eye, Edit2, Mail, Phone, Building2 } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { formatShortDate } from '../../../utils/formatters';

export function CustomerTable({ customers = [], onEdit, isLoading = false }) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden p-6 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse flex items-center justify-between py-2 border-b border-slate-100">
            <div className="space-y-2">
              <div className="h-4 w-40 bg-slate-200 rounded" />
              <div className="h-3 w-28 bg-slate-100 rounded" />
            </div>
            <div className="h-4 w-20 bg-slate-200 rounded" />
            <div className="h-8 w-16 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-slate-800">No customers found</h3>
        <p className="text-xs text-slate-500 mt-1">Try adjusting your search criteria or add a new customer.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
            <tr>
              <th className="py-3 px-4 font-semibold">Customer</th>
              <th className="py-3 px-4 font-semibold">Company</th>
              <th className="py-3 px-4 font-semibold">Contact Info</th>
              <th className="py-3 px-4 font-semibold">Subscriptions</th>
              <th className="py-3 px-4 font-semibold">Registered</th>
              <th className="py-3 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {customers.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="py-3.5 px-4">
                  <div className="font-semibold text-slate-900">{c.name}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <Mail className="w-3 h-3 text-slate-400" />
                    <span>{c.email}</span>
                  </div>
                </td>
                <td className="py-3.5 px-4 font-medium text-slate-700">
                  {c.company || '—'}
                </td>
                <td className="py-3.5 px-4 text-xs text-slate-500">
                  {c.phone ? (
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{c.phone}</span>
                    </div>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="py-3.5 px-4">
                  <Badge variant={c.activeSubscriptionsCount > 0 ? 'success' : 'default'} className="text-[11px]">
                    {c.activeSubscriptionsCount || 0} active ({c.totalSubscriptionsCount || 0} total)
                  </Badge>
                </td>
                <td className="py-3.5 px-4 text-xs text-slate-500">
                  {formatShortDate(c.created_at)}
                </td>
                <td className="py-3.5 px-4 text-right space-x-1">
                  {onEdit && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onEdit(c)}
                      className="h-8 px-2 text-slate-600 hover:text-slate-900"
                      title="Edit Customer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <Link to={`/staff/customers/${c.id}`}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2.5 text-xs text-indigo-600 hover:text-indigo-700"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      View
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

