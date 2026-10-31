import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Repeat,
  FileSpreadsheet,
  Receipt,
  CreditCard,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { staffService } from '../../../services/staffService';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { formatShortDate, formatCurrency } from '../../../utils/formatters';
import { getSubscriptionStatusBadge } from '../components/SubscriptionTable';
import { getInvoiceStatusBadge } from '../components/InvoiceTable';

export function CustomerDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('subscriptions');

  const loadCustomer = async () => {
    try {
      setLoading(true);
      const res = await staffService.getCustomerById(id);
      setData(res);
    } catch (err) {
      console.error('Error fetching customer details:', err);
      toast.error('Failed to load customer profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomer();
  }, [id]);

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
        Loading customer profile and history...
      </div>
    );
  }

  const { customer, subscriptions, quotations, invoices, payments } = data || {};

  if (!customer) {
    return (
      <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
        <h2 className="text-lg font-bold text-slate-800">Customer not found</h2>
        <Button onClick={() => navigate('/staff/customers')} className="mt-4">
          Back to Directory
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/staff/customers')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Customers
        </button>

        <div className="flex items-center gap-2">
          <Link to={`/staff/quotations/new?customerId=${customer.id}`}>
            <Button size="sm" variant="outline" leftIcon={<Plus className="w-3.5 h-3.5" />}>
              New Quote
            </Button>
          </Link>
          <Link to={`/staff/payments/new?customerId=${customer.id}`}>
            <Button size="sm" leftIcon={<CreditCard className="w-3.5 h-3.5" />}>
              Record Payment
            </Button>
          </Link>
        </div>
      </div>

      {/* Customer Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xl shadow-xs">
            {customer.name[0]?.toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
                {customer.name}
              </h1>
              <Badge variant="primary" className="text-[11px]">
                Customer Account
              </Badge>
            </div>
            {customer.company && (
              <div className="text-sm font-medium text-slate-600 flex items-center gap-1.5 mt-0.5">
                <Building2 className="w-4 h-4 text-slate-400" />
                {customer.company}
              </div>
            )}
            <div className="text-xs text-slate-400 flex items-center gap-1 mt-1">
              <Calendar className="w-3.5 h-3.5" />
              Customer since {formatShortDate(customer.created_at)}
            </div>
          </div>
        </div>

        {/* Contact Info Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div className="flex items-center gap-2 text-slate-600">
            <Mail className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="truncate">{customer.email}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Phone className="w-4 h-4 text-slate-400 shrink-0" />
            <span>{customer.phone || 'No phone recorded'}</span>
          </div>
          <div className="flex items-start gap-2 text-slate-600 sm:col-span-2">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span className="line-clamp-2">{customer.address || 'No billing address provided'}</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        {[
          { id: 'subscriptions', label: `Subscriptions (${subscriptions?.length || 0})`, icon: Repeat },
          { id: 'quotations', label: `Quotations (${quotations?.length || 0})`, icon: FileSpreadsheet },
          { id: 'invoices', label: `Invoices (${invoices?.length || 0})`, icon: Receipt },
          { id: 'payments', label: `Payment History (${payments?.length || 0})`, icon: CreditCard },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
                active
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      {activeTab === 'subscriptions' && (
        <Card className="border-slate-200/80">
          <CardContent className="p-0">
            {subscriptions?.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                No active or confirmed subscriptions for this customer.
              </div>
            ) : (
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Subscription #</th>
                    <th className="py-3 px-4">Plan</th>
                    <th className="py-3 px-4">Cadence</th>
                    <th className="py-3 px-4">Term Dates</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subscriptions.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-semibold text-indigo-600">{s.number}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">{s.plan?.name}</td>
                      <td className="py-3 px-4 capitalize">{s.plan?.billing_period}</td>
                      <td className="py-3 px-4 text-slate-500">
                        {formatShortDate(s.start_date)} - {formatShortDate(s.expiry_date)}
                      </td>
                      <td className="py-3 px-4">{getSubscriptionStatusBadge(s.status)}</td>
                      <td className="py-3 px-4 text-right">
                        <Link to={`/staff/subscriptions/${s.id}`} className="text-indigo-600 font-semibold hover:underline">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'quotations' && (
        <Card className="border-slate-200/80">
          <CardContent className="p-0">
            {quotations?.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                No draft or quotation proposals on record.
              </div>
            ) : (
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Quotation #</th>
                    <th className="py-3 px-4">Plan</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {quotations.map((q) => (
                    <tr key={q.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-semibold text-indigo-600">{q.number}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">{q.plan?.name}</td>
                      <td className="py-3 px-4">{getSubscriptionStatusBadge(q.status)}</td>
                      <td className="py-3 px-4 text-right">
                        <Link to={`/staff/quotations/${q.id}`} className="text-indigo-600 font-semibold hover:underline">
                          Manage
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'invoices' && (
        <Card className="border-slate-200/80">
          <CardContent className="p-0">
            {invoices?.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                No invoices generated for this customer yet.
              </div>
            ) : (
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Subscription</th>
                    <th className="py-3 px-4">Issue Date</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4 text-right">Paid</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-semibold text-indigo-600">{inv.number}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{inv.subscription?.number || '—'}</td>
                      <td className="py-3 px-4 text-slate-500">{formatShortDate(inv.issue_date)}</td>
                      <td className="py-3 px-4 text-slate-500">{formatShortDate(inv.due_date)}</td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900">{formatCurrency(inv.total)}</td>
                      <td className="py-3 px-4 text-right font-medium text-emerald-600">{formatCurrency(inv.amount_paid)}</td>
                      <td className="py-3 px-4">{getInvoiceStatusBadge(inv.status, inv.due_date, inv.amount_paid, inv.total)}</td>
                      <td className="py-3 px-4 text-right">
                        <Link to={`/staff/invoices/${inv.id}`} className="text-indigo-600 font-semibold hover:underline">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'payments' && (
        <Card className="border-slate-200/80">
          <CardContent className="p-0">
            {payments?.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                No payment receipts recorded for this account.
              </div>
            ) : (
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">{p.reference || `PAY-${p.id?.slice(0, 6)}`}</td>
                      <td className="py-3 px-4 font-mono text-indigo-600">{p.invoice?.number || '—'}</td>
                      <td className="py-3 px-4 capitalize">{p.method?.replace('_', ' ')}</td>
                      <td className="py-3 px-4 text-slate-500">{formatShortDate(p.payment_date)}</td>
                      <td className="py-3 px-4 text-right font-semibold text-emerald-600">{formatCurrency(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

