import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Repeat,
  Play,
  Pause,
  XCircle,
  RefreshCw,
  Receipt,
  FilePlus,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { staffService } from '../../../services/staffService';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { formatShortDate, formatCurrency } from '../../../utils/formatters';
import { getSubscriptionStatusBadge } from '../components/SubscriptionTable';
import { getInvoiceStatusBadge } from '../components/InvoiceTable';

export function SubscriptionDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState(null);
  const [processing, setProcessing] = useState(false);

  const loadSubscription = async () => {
    try {
      setLoading(true);
      const data = await staffService.getSubscriptionById(id);
      setSub(data);
    } catch (err) {
      console.error('Error loading subscription:', err);
      toast.error('Failed to load subscription details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscription();
  }, [id]);

  const handleStatusTransition = async (newStatus, actionLabel) => {
    if (!window.confirm(`Are you sure you want to ${actionLabel.toLowerCase()} subscription ${sub.number}?`)) {
      return;
    }

    try {
      setProcessing(true);
      await staffService.transitionSubscription(sub.id, newStatus);
      toast.success(`Subscription ${actionLabel.toLowerCase()}d successfully`);
      loadSubscription();
    } catch (err) {
      console.error('Transition error:', err);
      toast.error(err.message || `Failed to ${actionLabel.toLowerCase()} subscription`);
    } finally {
      setProcessing(false);
    }
  };

  const handleGenerateInvoice = async () => {
    try {
      setProcessing(true);
      const invId = await staffService.generateInvoiceForSubscription(sub.id);
      toast.success('Invoice generated successfully from subscription data');
      loadSubscription();
      navigate(`/staff/invoices/${invId}`);
    } catch (err) {
      console.error('Error generating invoice:', err);
      toast.error(err.message || 'Failed to generate invoice');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
        Loading subscription record...
      </div>
    );
  }

  if (!sub) {
    return (
      <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
        <h2 className="text-lg font-bold text-slate-800">Subscription not found</h2>
        <Button onClick={() => navigate('/staff/subscriptions')} className="mt-4">
          Back to Subscriptions
        </Button>
      </div>
    );
  }

  const { plan, customer, lines, invoices, statusLog } = sub;

  // Lifecycle permissions according to plan flags and current status
  const canActivate = sub.status === 'confirmed';
  const canPause = sub.status === 'active' && plan?.pausable;
  const canResume = sub.status === 'paused' && plan?.pausable;
  const canRenew = sub.status === 'active' && plan?.renewable;
  const canClose = (sub.status === 'active' || sub.status === 'paused') && plan?.closable;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Breadcrumb & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate('/staff/subscriptions')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Subscriptions
        </button>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Generate Invoice button */}
          {(sub.status === 'active' || sub.status === 'confirmed') && (
            <Button
              size="sm"
              variant="outline"
              disabled={processing}
              onClick={handleGenerateInvoice}
              leftIcon={<Receipt className="w-3.5 h-3.5" />}
            >
              Generate Invoice
            </Button>
          )}

          {canActivate && (
            <Button
              size="sm"
              disabled={processing}
              onClick={() => handleStatusTransition('active', 'Activate')}
              leftIcon={<Play className="w-3.5 h-3.5" />}
            >
              Activate Subscription
            </Button>
          )}

          {canPause && (
            <Button
              size="sm"
              variant="outline"
              disabled={processing}
              onClick={() => handleStatusTransition('paused', 'Pause')}
              className="text-amber-700 border-amber-300 hover:bg-amber-50"
              leftIcon={<Pause className="w-3.5 h-3.5" />}
            >
              Pause
            </Button>
          )}

          {canResume && (
            <Button
              size="sm"
              variant="outline"
              disabled={processing}
              onClick={() => handleStatusTransition('active', 'Resume')}
              className="text-emerald-700 border-emerald-300 hover:bg-emerald-50"
              leftIcon={<Play className="w-3.5 h-3.5" />}
            >
              Resume
            </Button>
          )}

          {canRenew && (
            <Button
              size="sm"
              variant="outline"
              disabled={processing}
              onClick={() => handleStatusTransition('active', 'Renew')}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Renew Term
            </Button>
          )}

          {canClose && (
            <Button
              size="sm"
              variant="danger"
              disabled={processing}
              onClick={() => handleStatusTransition('closed', 'Close')}
              leftIcon={<XCircle className="w-3.5 h-3.5" />}
            >
              Close Early
            </Button>
          )}
        </div>
      </div>

      {/* Main Info Card */}
      <Card className="border-slate-200/80 shadow-xs">
        <CardContent className="p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Managed Subscription
                </span>
                {getSubscriptionStatusBadge(sub.status)}
              </div>
              <h1 className="text-2xl font-bold font-mono tracking-tight text-slate-900 mt-1">
                {sub.number}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Onboarded on {formatShortDate(sub.created_at)}
              </p>
            </div>

            <div className="text-left sm:text-right text-xs text-slate-500 space-y-1">
              <div>
                <span className="text-slate-400">Next Billing: </span>
                <strong className="text-slate-800">
                  {sub.next_billing_date ? formatShortDate(sub.next_billing_date) : '—'}
                </strong>
              </div>
              <div>
                <span className="text-slate-400">Payment Term: </span>
                <span className="text-slate-700">{sub.payment_term?.name || 'Net 15 Days'}</span>
              </div>
            </div>
          </div>

          {/* Customer & Plan Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Customer Details
              </span>
              <div className="font-semibold text-sm text-slate-900">
                <Link to={`/staff/customers/${customer?.id}`} className="hover:underline text-indigo-600">
                  {customer?.name}
                </Link>
              </div>
              {customer?.company && (
                <div className="text-slate-600 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  {customer.company}
                </div>
              )}
              <div className="text-slate-500">{customer?.email}</div>
              <div className="text-slate-500">{customer?.phone || 'No phone'}</div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Plan Rules & Parameters
              </span>
              <div className="font-semibold text-sm text-slate-900">
                {plan?.name}
              </div>
              <div className="text-slate-600">
                Recurring Rate: <strong>{formatCurrency(plan?.price)}</strong> / {plan?.billing_period}
              </div>
              <div className="pt-1 flex flex-wrap gap-1.5">
                <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border ${plan?.pausable ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                  {plan?.pausable ? '✓ Pausable' : '✗ Not Pausable'}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border ${plan?.renewable ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                  {plan?.renewable ? '✓ Renewable' : '✗ Not Renewable'}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border ${plan?.closable ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                  {plan?.closable ? '✓ Closable' : '✗ Non-Closable'}
                </span>
              </div>
            </div>
          </div>

          {/* Dates Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl text-xs">
            <div>
              <span className="text-slate-500 text-[11px] block">Start Date</span>
              <span className="font-semibold text-slate-900">{formatShortDate(sub.start_date)}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[11px] block">Expiry Date</span>
              <span className="font-semibold text-slate-900">{formatShortDate(sub.expiry_date)}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[11px] block">Next Billing Run</span>
              <span className="font-semibold text-indigo-700">
                {sub.next_billing_date ? formatShortDate(sub.next_billing_date) : 'None scheduled'}
              </span>
            </div>
          </div>

          {/* Line items table */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Products and Services Included
            </h3>
            <div className="overflow-x-auto border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Item</th>
                    <th className="py-2.5 px-3">Qty</th>
                    <th className="py-2.5 px-3">Unit Price</th>
                    <th className="py-2.5 px-3">Tax</th>
                    <th className="py-2.5 px-3 text-right">Cycle Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Number(plan?.price || 0) > 0 && (
                    <tr className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-medium text-slate-900">
                        {plan.name} (Plan Fee)
                      </td>
                      <td className="py-2.5 px-3">1</td>
                      <td className="py-2.5 px-3">{formatCurrency(plan.price)}</td>
                      <td className="py-2.5 px-3 text-slate-400">—</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-800">
                        {formatCurrency(plan.price)}
                      </td>
                    </tr>
                  )}
                  {lines.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-medium text-slate-800">
                        {l.product?.name || 'Product Line'}
                        {l.variant?.value && (
                          <span className="text-slate-500 ml-1">({l.variant.value})</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">{l.quantity}</td>
                      <td className="py-2.5 px-3">{formatCurrency(l.unit_price)}</td>
                      <td className="py-2.5 px-3 text-slate-500">{l.tax?.name || '—'}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-800">
                        {formatCurrency(l.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-3 text-xs">
              <div className="flex justify-between w-64 text-slate-900 font-bold text-sm">
                <span>Billing Period Total:</span>
                <span className="text-indigo-600">{formatCurrency(sub.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Related Invoices */}
          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Generated Invoices ({invoices?.length || 0})
            </h3>
            {invoices?.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400">
                No invoices generated yet. Click &ldquo;Generate Invoice&rdquo; above to run billing.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Invoice #</th>
                      <th className="py-2.5 px-3">Issue Date</th>
                      <th className="py-2.5 px-3">Due Date</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                      <th className="py-2.5 px-3 text-right">Paid</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-semibold text-indigo-600">{inv.number}</td>
                        <td className="py-2.5 px-3 text-slate-500">{formatShortDate(inv.issue_date)}</td>
                        <td className="py-2.5 px-3 text-slate-500">{formatShortDate(inv.due_date)}</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-slate-900">{formatCurrency(inv.total)}</td>
                        <td className="py-2.5 px-3 text-right font-medium text-emerald-600">{formatCurrency(inv.amount_paid)}</td>
                        <td className="py-2.5 px-3">{getInvoiceStatusBadge(inv.status, inv.due_date, inv.amount_paid, inv.total)}</td>
                        <td className="py-2.5 px-3 text-right">
                          <Link to={`/staff/invoices/${inv.id}`} className="text-indigo-600 font-semibold hover:underline">
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Audit Status Log */}
          {statusLog?.length > 0 && (
            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Lifecycle Status Log
              </h3>
              <div className="space-y-1.5">
                {statusLog.map((log) => (
                  <div key={log.id} className="p-2.5 bg-slate-50 rounded-lg text-xs flex items-center justify-between">
                    <span className="text-slate-700">
                      Transitioned from <strong className="capitalize">{log.from_status}</strong> to <strong className="capitalize text-indigo-600">{log.to_status}</strong>
                    </span>
                    <span className="text-slate-400 text-[11px]">{formatShortDate(log.changed_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

