import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  FileDown,
  Printer,
  CheckCircle,
  XCircle,
  CreditCard,
  Building2,
  Calendar,
  Receipt,
  Repeat,
} from 'lucide-react';
import { toast } from 'sonner';
import { staffService } from '../../../services/staffService';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { formatShortDate, formatCurrency } from '../../../utils/formatters';
import { generateInvoicePDF } from '../../../utils/pdfGenerator';
import { getInvoiceStatusBadge } from '../components/InvoiceTable';

export function InvoiceDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadInvoice = async () => {
    try {
      setLoading(true);
      const data = await staffService.getInvoiceById(id);
      setInvoice(data);
    } catch (err) {
      console.error('Error fetching invoice details:', err);
      toast.error('Failed to load invoice details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoice();
  }, [id]);

  const handleConfirm = async () => {
    if (!window.confirm(`Confirm draft invoice ${invoice.number}? Amounts will be finalized.`)) {
      return;
    }

    try {
      setActionLoading(true);
      await staffService.updateInvoiceStatus(invoice.id, 'confirmed');
      toast.success(`Invoice ${invoice.number} confirmed`);
      loadInvoice();
    } catch (err) {
      console.error('Error confirming invoice:', err);
      toast.error(err.message || 'Failed to confirm invoice');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm(`Are you sure you want to cancel invoice ${invoice.number}?`)) {
      return;
    }

    try {
      setActionLoading(true);
      await staffService.updateInvoiceStatus(invoice.id, 'cancelled');
      toast.success(`Invoice ${invoice.number} cancelled`);
      loadInvoice();
    } catch (err) {
      console.error('Error cancelling invoice:', err);
      toast.error(err.message || 'Failed to cancel invoice');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    try {
      generateInvoicePDF(invoice, invoice.customer);
      toast.success('Invoice PDF downloaded');
    } catch (err) {
      console.error('Error downloading invoice PDF:', err);
      toast.error('Failed to generate PDF');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
        Loading invoice record...
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
        <h2 className="text-lg font-bold text-slate-800">Invoice not found</h2>
        <Button onClick={() => navigate('/staff/invoices')} className="mt-4">
          Back to Invoices
        </Button>
      </div>
    );
  }

  const { customer, subscription, lines, payments } = invoice;
  const isDraft = invoice.status === 'draft';
  const canCancel = invoice.status === 'draft' || invoice.status === 'confirmed';
  const balanceOutstanding = Math.max(0, Number(invoice.total || 0) - Number(invoice.amount_paid || 0));
  const canRecordPayment = (invoice.status === 'confirmed' || invoice.status === 'draft') && balanceOutstanding > 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto print:max-w-full">
      {/* Top Breadcrumb & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <button
          onClick={() => navigate('/staff/invoices')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Invoices
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handlePrint}
            leftIcon={<Printer className="w-3.5 h-3.5" />}
          >
            Print
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleDownloadPDF}
            leftIcon={<FileDown className="w-3.5 h-3.5" />}
          >
            PDF
          </Button>

          {isDraft && (
            <Button
              size="sm"
              variant="outline"
              disabled={actionLoading}
              onClick={handleConfirm}
              className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
              leftIcon={<CheckCircle className="w-3.5 h-3.5" />}
            >
              Confirm Invoice
            </Button>
          )}

          {canRecordPayment && (
            <Link to={`/staff/payments/new?invoiceId=${invoice.id}`}>
              <Button size="sm" leftIcon={<CreditCard className="w-3.5 h-3.5" />}>
                Record Payment
              </Button>
            </Link>
          )}

          {canCancel && (
            <Button
              size="sm"
              variant="danger"
              disabled={actionLoading}
              onClick={handleCancel}
              leftIcon={<XCircle className="w-3.5 h-3.5" />}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Main Invoice Document Card */}
      <Card className="border-slate-200/80 shadow-xs">
        <CardContent className="p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Tax Invoice
                </span>
                {getInvoiceStatusBadge(invoice.status, invoice.due_date, invoice.amount_paid, invoice.total)}
              </div>
              <h1 className="text-2xl font-bold font-mono tracking-tight text-slate-900 mt-1">
                {invoice.number}
              </h1>
              {subscription && (
                <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <Repeat className="w-3.5 h-3.5 text-slate-400" />
                  <span>Subscription: </span>
                  <Link to={`/staff/subscriptions/${subscription.id}`} className="font-mono text-indigo-600 font-semibold hover:underline">
                    {subscription.number}
                  </Link>
                </div>
              )}
            </div>

            <div className="text-left sm:text-right text-xs text-slate-500 space-y-1">
              <div>
                <span className="text-slate-400">Issue Date: </span>
                <strong className="text-slate-800">{formatShortDate(invoice.issue_date)}</strong>
              </div>
              <div>
                <span className="text-slate-400">Due Date: </span>
                <strong className="text-slate-800">{formatShortDate(invoice.due_date)}</strong>
              </div>
              <div>
                <span className="text-slate-400">Period: </span>
                <span>{formatShortDate(invoice.period_start)} to {formatShortDate(invoice.period_end)}</span>
              </div>
            </div>
          </div>

          {/* Customer Details */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Billed Customer
            </span>
            <div className="font-semibold text-sm text-slate-900">
              <Link to={`/staff/customers/${customer?.id}`} className="hover:underline text-indigo-600">
                {customer?.name}
              </Link>
            </div>
            {customer?.company && (
              <div className="text-slate-600 flex items-center gap-1.5 mt-0.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                {customer.company}
              </div>
            )}
            <div className="text-slate-500 mt-0.5">{customer?.email} • {customer?.phone || 'No phone'}</div>
            {customer?.address && (
              <div className="text-slate-500 mt-0.5">{customer.address}</div>
            )}
          </div>

          {/* Line Items Table */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Invoice Line Items
            </h3>
            <div className="overflow-x-auto border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">Qty</th>
                    <th className="py-2.5 px-3">Unit Price</th>
                    <th className="py-2.5 px-3">Tax</th>
                    <th className="py-2.5 px-3 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lines.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-medium text-slate-900">
                        {l.description}
                      </td>
                      <td className="py-2.5 px-3">{l.quantity}</td>
                      <td className="py-2.5 px-3">{formatCurrency(l.unit_price)}</td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {formatCurrency(l.tax_amount)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-800">
                        {formatCurrency(l.line_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="flex flex-col items-end pt-3 border-t border-slate-100 text-xs space-y-1.5">
            <div className="flex justify-between w-64 text-slate-600">
              <span>Subtotal:</span>
              <span className="font-semibold">{formatCurrency(invoice.subtotal)}</span>
            </div>
            {Number(invoice.discount_total || 0) > 0 && (
              <div className="flex justify-between w-64 text-slate-600">
                <span>Discounts:</span>
                <span className="font-semibold text-emerald-600">
                  -{formatCurrency(invoice.discount_total)}
                </span>
              </div>
            )}
            <div className="flex justify-between w-64 text-slate-600">
              <span>Taxes:</span>
              <span className="font-semibold">{formatCurrency(invoice.tax_total)}</span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between w-64 text-sm font-bold text-slate-900">
              <span>Total Invoice Amount:</span>
              <span className="text-slate-900">{formatCurrency(invoice.total)}</span>
            </div>
            <div className="flex justify-between w-64 text-emerald-600 font-semibold">
              <span>Amount Paid:</span>
              <span>{formatCurrency(invoice.amount_paid)}</span>
            </div>
            <div className="flex justify-between w-64 font-bold text-sm pt-1 border-t border-slate-100">
              <span className={balanceOutstanding === 0 ? 'text-emerald-700' : 'text-rose-700'}>
                Balance Outstanding:
              </span>
              <span className={balanceOutstanding === 0 ? 'text-emerald-700' : 'text-rose-700'}>
                {formatCurrency(balanceOutstanding)}
              </span>
            </div>
          </div>

          {/* Payment Receipts History */}
          {payments?.length > 0 && (
            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Recorded Payments ({payments.length})
              </h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Reference</th>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Method</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td className="py-2 px-3 font-mono font-semibold text-slate-900">{p.reference || `PAY-${p.id?.slice(0, 6)}`}</td>
                        <td className="py-2 px-3 text-slate-500">{formatShortDate(p.payment_date)}</td>
                        <td className="py-2 px-3 capitalize">{p.method?.replace('_', ' ')}</td>
                        <td className="py-2 px-3 text-right font-semibold text-emerald-600">{formatCurrency(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

