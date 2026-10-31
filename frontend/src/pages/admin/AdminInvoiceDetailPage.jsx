import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Ban, CheckCircle2, CreditCard, Printer, Send } from 'lucide-react';
import { toast } from 'sonner';
import { billingService } from '../../services/billingService';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { SelectField, TextareaField } from '../../features/admin/catalog/FormControls';
import { formatDate, formatShortDate } from '../../utils/formatters';
import { formatMoney } from '../../utils/money';
import { ErrorBox, InvoiceStatusBadge, useBase } from '../../features/admin/billing/shared';

const METHODS = [['cash', 'Cash'], ['bank_transfer', 'Bank transfer'], ['card', 'Card'], ['upi', 'UPI'], ['cheque', 'Cheque'], ['other', 'Other']];

function PaymentModal({ invoice, isOpen, onClose, onPaid }) {
  const [method, setMethod] = useState('bank_transfer');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setAmount(String(invoice.outstanding)); // the database owns the numbers; prefill, do not compute
      setError('');
    }
  }, [isOpen, invoice.outstanding]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await billingService.recordPayment({ invoiceId: invoice.id, method, amount: amount.trim(), paymentDate: date, note });
      toast.success('Payment recorded');
      setNote('');
      onPaid();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record payment" description={`${invoice.number} · outstanding ${formatMoney(invoice.outstanding)}`}>
      <form onSubmit={submit} className="space-y-4">
        {error && <p className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">{error}</p>}
        <SelectField label="Method" required value={method} onChange={setMethod} options={METHODS.map(([value, label]) => ({ value, label }))} />
        <Input label="Amount" type="number" step="0.01" min="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} helperText="Partial payments are fine; it cannot be more than the outstanding amount." />
        <Input label="Payment date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        <TextareaField label="Note" value={note} onChange={setNote} />
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={saving}>
            Record payment
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function AdminInvoiceDetailPage() {
  const { id } = useParams();
  const base = useBase();
  const [inv, setInv] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setInv(await billingService.getInvoice(id));
    } catch (err) {
      setError(err.message);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn, okMessage, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    try {
      await fn(id);
      toast.success(okMessage);
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!inv) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-6">
      <Link to={`${base}/invoices`} className="print:hidden inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="w-4 h-4" /> Invoices
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{inv.number}</h1>
            <InvoiceStatusBadge status={inv.status} overdue={inv.is_overdue} />
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {inv.customer_name} · {inv.subscription_number}
            {inv.sent_at && ` · sent ${formatDate(inv.sent_at)}`}
          </p>
        </div>
        <div className="print:hidden flex flex-wrap gap-2">
          {inv.status === 'draft' && (
            <Button isLoading={busy} onClick={() => run(billingService.confirmInvoice, 'Invoice confirmed')} leftIcon={<CheckCircle2 className="w-4 h-4" />}>
              Confirm
            </Button>
          )}
          {inv.status === 'confirmed' && (
            <Button isLoading={busy} onClick={() => setPayOpen(true)} leftIcon={<CreditCard className="w-4 h-4" />}>
              Record payment
            </Button>
          )}
          {inv.status !== 'cancelled' && (
            <Button variant="outline" isLoading={busy} onClick={() => run(billingService.sendInvoice, 'Invoice marked as sent')} leftIcon={<Send className="w-4 h-4" />}>
              Send
            </Button>
          )}
          {(inv.status === 'draft' || (inv.status === 'confirmed' && Number(inv.amount_paid) === 0)) && (
            <Button variant="danger" isLoading={busy} onClick={() => run(billingService.cancelInvoice, 'Invoice cancelled', 'Cancel this invoice? Its period will not be billed again.')} leftIcon={<Ban className="w-4 h-4" />}>
              Cancel
            </Button>
          )}
          <Button variant="outline" onClick={() => window.print()} leftIcon={<Printer className="w-4 h-4" />}>
            Print
          </Button>
        </div>
      </div>

      <Card>
        <CardContent>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><dt className="text-xs text-slate-500">Customer</dt><dd>{inv.customer_name}<div className="text-xs text-slate-500">{inv.customer_email}</div></dd></div>
            <div><dt className="text-xs text-slate-500">Billing period</dt><dd>{formatShortDate(inv.period_start)} to {formatShortDate(inv.period_end)}</dd></div>
            <div><dt className="text-xs text-slate-500">Issued</dt><dd>{formatShortDate(inv.issue_date)}</dd></div>
            <div><dt className="text-xs text-slate-500">Due</dt><dd>{formatShortDate(inv.due_date)}</dd></div>
          </dl>
        </CardContent>
      </Card>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Description</TableHead>
            <TableHead>Qty</TableHead>
            <TableHead className="text-right">Unit price</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Discount</TableHead>
            <TableHead className="text-right">Tax</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {inv.lines.map((l) => (
            <TableRow key={l.id}>
              <TableCell>{l.description}</TableCell>
              <TableCell>{l.quantity}</TableCell>
              <TableCell className="text-right">{formatMoney(l.unit_price)}</TableCell>
              <TableCell className="text-right">{formatMoney(l.base_amount)}</TableCell>
              <TableCell className="text-right">{Number(l.discount_amount) ? `-${formatMoney(l.discount_amount)}` : '—'}</TableCell>
              <TableCell className="text-right">{formatMoney(l.tax_amount)}</TableCell>
              <TableCell className="text-right font-medium">{formatMoney(l.line_total)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex justify-end">
        <dl className="w-full sm:w-72 space-y-1.5 text-sm">
          <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd>{formatMoney(inv.subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Discount</dt><dd>-{formatMoney(inv.discount_total)}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Tax</dt><dd>{formatMoney(inv.tax_total)}</dd></div>
          <div className="flex justify-between border-t border-slate-200 pt-1.5 font-semibold text-slate-900"><dt>Total</dt><dd>{formatMoney(inv.total)}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Paid</dt><dd>{formatMoney(inv.amount_paid)}</dd></div>
          <div className="flex justify-between font-semibold"><dt>Outstanding</dt><dd>{formatMoney(inv.outstanding)}</dd></div>
        </dl>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payments</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table className="border-0">
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Note</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inv.payments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-slate-400">No payments yet</TableCell>
                </TableRow>
              )}
              {inv.payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{formatShortDate(p.payment_date)}</TableCell>
                  <TableCell className="capitalize">{p.method.replace('_', ' ')}</TableCell>
                  <TableCell>{p.note || '—'}</TableCell>
                  <TableCell className="text-right font-medium">{formatMoney(p.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PaymentModal
        invoice={inv}
        isOpen={payOpen}
        onClose={() => setPayOpen(false)}
        onPaid={() => {
          setPayOpen(false);
          load();
        }}
      />
    </div>
  );
}
