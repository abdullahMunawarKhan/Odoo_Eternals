import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CreditCard, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { staffService } from '../../../services/staffService';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { formatCurrency, formatShortDate } from '../../../utils/formatters';

export function RecordPayment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialInvoiceId = searchParams.get('invoiceId') || '';
  const initialCustomerId = searchParams.get('customerId') || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [invoices, setInvoices] = useState([]);

  // Form states
  const [invoiceId, setInvoiceId] = useState(initialInvoiceId);
  const [method, setMethod] = useState('bank_transfer');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    const loadInvoices = async () => {
      try {
        setLoading(true);
        const data = await staffService.getUnpaidInvoices(initialCustomerId || null);
        setInvoices(data);

        // If initialInvoiceId is passed, select it
        if (initialInvoiceId) {
          const matched = data.find((inv) => inv.id === initialInvoiceId);
          if (matched) {
            setInvoiceId(matched.id);
            const outstanding = Math.max(0, Number(matched.total || 0) - Number(matched.amount_paid || 0));
            setAmount(outstanding.toFixed(2));
          }
        } else if (data.length > 0) {
          setInvoiceId(data[0].id);
          const outstanding = Math.max(0, Number(data[0].total || 0) - Number(data[0].amount_paid || 0));
          setAmount(outstanding.toFixed(2));
        }
      } catch (err) {
        console.error('Error fetching unpaid invoices:', err);
        toast.error('Failed to load eligible invoices');
      } finally {
        setLoading(false);
      }
    };
    loadInvoices();
  }, [initialInvoiceId, initialCustomerId]);

  const handleInvoiceChange = (newInvId) => {
    setInvoiceId(newInvId);
    const selected = invoices.find((inv) => inv.id === newInvId);
    if (selected) {
      const outstanding = Math.max(0, Number(selected.total || 0) - Number(selected.amount_paid || 0));
      setAmount(outstanding.toFixed(2));
    }
  };

  const selectedInvoice = invoices.find((inv) => inv.id === invoiceId);
  const maxOutstanding = selectedInvoice
    ? Math.max(0, Number(selectedInvoice.total || 0) - Number(selectedInvoice.amount_paid || 0))
    : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!invoiceId) {
      toast.error('Please select an invoice to apply payment to');
      return;
    }

    const payAmount = parseFloat(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      toast.error('Please enter a valid payment amount greater than zero');
      return;
    }

    if (payAmount > maxOutstanding) {
      toast.error(`Payment amount cannot exceed outstanding balance of ${formatCurrency(maxOutstanding)}`);
      return;
    }

    try {
      setSaving(true);
      const res = await staffService.recordPayment({
        invoice_id: invoiceId,
        method,
        amount: payAmount,
        payment_date: paymentDate,
        note,
        reference: reference.trim() || undefined,
      });

      toast.success(
        res?.is_fully_paid
          ? 'Payment recorded! Invoice is now fully paid.'
          : 'Payment recorded successfully'
      );
      navigate(`/staff/invoices/${invoiceId}`);
    } catch (err) {
      console.error('Error recording payment:', err);
      toast.error(err.message || 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
        Loading invoice balances...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/staff/payments')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Payments
        </button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Record Customer Payment
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Apply full or partial payment against an open customer invoice. Transaction will be reconciled immediately.
        </p>
      </div>

      {invoices.length === 0 ? (
        <Card className="border-slate-200/80 p-8 text-center">
          <AlertCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800">
            No open or unpaid invoices found
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            All customer invoices are currently confirmed and fully settled, or no confirmed invoices have been issued yet.
          </p>
          <Button onClick={() => navigate('/staff/invoices')} className="mt-4" size="sm">
            View Invoices
          </Button>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="border-slate-200/80 shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-semibold text-slate-800">
                Payment & Invoice Allocation
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {/* Select Invoice */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select Unpaid Invoice *
                </label>
                <select
                  value={invoiceId}
                  onChange={(e) => handleInvoiceChange(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  required
                >
                  {invoices.map((inv) => {
                    const outstanding = Math.max(0, Number(inv.total || 0) - Number(inv.amount_paid || 0));
                    return (
                      <option key={inv.id} value={inv.id}>
                        {inv.number} — {inv.customer?.name} ({formatCurrency(outstanding)} balance due)
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Invoice Outstanding Banner */}
              {selectedInvoice && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-500 block">Customer: {selectedInvoice.customer?.name}</span>
                    <span className="text-slate-500 block">Due Date: {formatShortDate(selectedInvoice.due_date)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[11px]">Outstanding Due</span>
                    <span className="text-base font-bold text-slate-900">
                      {formatCurrency(maxOutstanding)}
                    </span>
                  </div>
                </div>
              )}

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Payment Amount ($) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={maxOutstanding}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Maximum allowable: {formatCurrency(maxOutstanding)}
                </span>
              </div>

              {/* Payment Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Payment Method *
                  </label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  >
                    <option value="bank_transfer">Bank Transfer (Wire / ACH)</option>
                    <option value="card">Credit / Debit Card</option>
                    <option value="upi">UPI / Instant Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="cash">Cash</option>
                    <option value="other">Other Method</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Payment Date *
                  </label>
                  <Input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Reference */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Custom Reference / Transaction ID (Optional)
                </label>
                <Input
                  placeholder="e.g. TXN-94821 or Bank Ref"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Internal Staff Note (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Add payment verification or deposit confirmation note..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/staff/payments')}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={saving} leftIcon={<CheckCircle2 className="w-4 h-4" />}>
              Confirm & Record Payment
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

