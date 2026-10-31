import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { billingService } from '../../services/billingService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { SelectField } from '../../features/admin/catalog/FormControls';
import { formatDate, formatShortDate } from '../../utils/formatters';
import { formatMoney } from '../../utils/money';
import { ErrorBox, InvoiceStatusBadge, SubStatusBadge, useBase } from '../../features/admin/billing/shared';

// Buttons offered per status, following SPEC 4.2. The database re-checks everything.
function actionsFor(sub) {
  const plan = sub.plan ?? {};
  switch (sub.status) {
    case 'draft':
      return [{ to: 'quotation', label: 'Send quotation' }];
    case 'quotation':
      return [{ to: 'confirmed', label: 'Confirm' }];
    case 'confirmed':
      return [{ to: 'active', label: 'Activate' }];
    case 'active':
      return [
        plan.pausable && { to: 'paused', label: 'Pause', variant: 'outline' },
        plan.renewable && { to: 'active', label: 'Renew', variant: 'outline' },
        { to: 'closed', label: 'Close', variant: 'danger', confirm: 'Close this subscription?' },
      ].filter(Boolean);
    case 'paused':
      return [
        plan.pausable && { to: 'active', label: 'Resume' },
        { to: 'closed', label: 'Close', variant: 'danger', confirm: 'Close this subscription?' },
      ].filter(Boolean);
    default:
      return [];
  }
}

function Field({ label, children }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-900 mt-0.5">{children || '—'}</dd>
    </div>
  );
}

export function AdminSubscriptionDetailPage() {
  const { id } = useParams();
  const base = useBase();
  const [sub, setSub] = useState(null);
  const [log, setLog] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [discountOptions, setDiscountOptions] = useState([]);
  const [pick, setPick] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [s, l, i, d] = await Promise.all([
        billingService.getSubscription(id),
        billingService.getStatusLog(id),
        billingService.invoicesOfSubscription(id),
        billingService.subscriptionDiscountOptions(),
      ]);
      setSub(s);
      setLog(l);
      setInvoices(i);
      setDiscountOptions(d);
    } catch (err) {
      setError(err.message);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (a) => {
    if (a.confirm && !window.confirm(a.confirm)) return;
    setBusy(true);
    try {
      await billingService.transition(id, a.to);
      toast.success(`${a.label} done`);
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const attach = async () => {
    if (!pick) return;
    setBusy(true);
    try {
      await billingService.attachDiscount(id, pick);
      toast.success('Discount attached');
      setPick('');
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const detach = async (discountId) => {
    try {
      await billingService.detachDiscount(id, discountId);
      await load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!sub) return <Skeleton className="h-64 w-full" />;

  const attachedIds = new Set(sub.discounts.map((d) => d.discount.id));
  const available = discountOptions.filter((d) => !attachedIds.has(d.id));
  const actions = actionsFor(sub);

  return (
    <div className="space-y-6">
      <Link to={`${base}/subscriptions`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="w-4 h-4" /> Subscriptions
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{sub.number}</h1>
            <SubStatusBadge status={sub.status} />
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {sub.customer?.name} · {sub.plan?.name}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {actions.length === 0 && <span className="text-xs text-slate-400">No further actions</span>}
          {actions.map((a) => (
            <Button key={a.label} variant={a.variant ?? 'primary'} isLoading={busy} onClick={() => act(a)}>
              {a.label}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Field label="Customer">{sub.customer?.name}<div className="text-xs text-slate-500">{sub.customer?.email}</div></Field>
            <Field label="Plan">{sub.plan?.name}<div className="text-xs text-slate-500 capitalize">{sub.plan?.billing_period} · {formatMoney(sub.plan?.price)}</div></Field>
            <Field label="Payment term">{sub.payment_term ? `${sub.payment_term.name} (${sub.payment_term.days} days)` : null}</Field>
            <Field label="Template">{sub.template?.name}</Field>
            <Field label="Start date">{formatShortDate(sub.start_date)}</Field>
            <Field label="Expiry date">{formatShortDate(sub.expiry_date)}</Field>
            <Field label="Next billing">{sub.status === 'active' ? formatShortDate(sub.next_billing_date) : null}</Field>
            <Field label="Quotation valid until">{sub.quotation_valid_until ? formatShortDate(sub.quotation_valid_until) : null}</Field>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lines</CardTitle>
          <CardDescription>Prices are set by the database when a line is added. Plan minimum quantity: {sub.plan?.min_quantity}.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table className="border-0">
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Unit price</TableHead>
                <TableHead>Tax</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sub.lines.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-400">No lines</TableCell>
                </TableRow>
              )}
              {sub.lines.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>
                    {l.product?.name}
                    {l.variant && <span className="text-slate-500"> ({l.variant.value})</span>}
                  </TableCell>
                  <TableCell>{l.quantity}</TableCell>
                  <TableCell>{formatMoney(l.unit_price)}</TableCell>
                  <TableCell>{l.tax ? `${l.tax.name}` : '—'}</TableCell>
                  <TableCell className="text-right font-medium">{formatMoney(l.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Discounts</CardTitle>
            <CardDescription>Subscription-level discounts attached here. Product discounts apply automatically.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {sub.discounts.length === 0 && <p className="text-xs text-slate-400">None attached.</p>}
            <ul className="divide-y divide-slate-100 text-sm">
              {sub.discounts.map(({ discount: d }) => (
                <li key={d.id} className="flex items-center justify-between py-2">
                  <span>
                    {d.name} <span className="text-slate-500">({d.type === 'percent' ? `${Number(d.value)}%` : formatMoney(d.value)})</span>
                  </span>
                  <button type="button" onClick={() => detach(d.id)} className="text-slate-400 hover:text-rose-600" aria-label={`Remove ${d.name}`}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
            {sub.status !== 'closed' && (
              <div className="flex items-end gap-2">
                <SelectField className="flex-1" label="Attach a discount" value={pick} onChange={setPick} placeholder={available.length ? 'Select...' : 'None available'} options={available.map((d) => ({ value: d.id, label: d.name }))} />
                <Button onClick={attach} disabled={!pick} isLoading={busy}>
                  Attach
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status history</CardTitle>
          </CardHeader>
          <CardContent>
            {log.length === 0 ? (
              <p className="text-xs text-slate-400">No status changes yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {log.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-1.5">
                      <SubStatusBadge status={l.from_status} /> → <SubStatusBadge status={l.to_status} />
                    </span>
                    <span className="text-xs text-slate-500 text-right">
                      {formatDate(l.changed_at)}
                      <br />
                      {l.by?.full_name || l.by?.email || ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>Created by billing, never typed by hand.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table className="border-0">
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-400">No invoices yet. Use Run billing on the Invoices page.</TableCell>
                </TableRow>
              )}
              {invoices.map((i) => (
                <TableRow key={i.id}>
                  <TableCell>
                    <Link to={`${base}/invoices/${i.id}`} className="font-medium text-indigo-700 hover:underline">
                      {i.number}
                    </Link>
                  </TableCell>
                  <TableCell>{formatShortDate(i.period_start)} to {formatShortDate(i.period_end)}</TableCell>
                  <TableCell>{formatShortDate(i.due_date)}</TableCell>
                  <TableCell>
                    <InvoiceStatusBadge status={i.status} overdue={i.is_overdue} />
                  </TableCell>
                  <TableCell className="text-right">{formatMoney(i.total)}</TableCell>
                  <TableCell className="text-right">{formatMoney(i.outstanding)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
