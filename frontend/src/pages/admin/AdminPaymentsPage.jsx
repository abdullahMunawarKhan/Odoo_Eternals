import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { billingService } from '../../services/billingService';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Badge } from '../../components/ui/Badge';
import { formatShortDate } from '../../utils/formatters';
import { formatMoney } from '../../utils/money';
import { ErrorBox, FilterChips, PageHeader, Pager, SearchBox, useBase, useDebounced } from '../../features/admin/billing/shared';

const TABS = [['payments', 'Payments'], ['outstanding', 'Outstanding'], ['overdue', 'Overdue']];

export function AdminPaymentsPage() {
  const base = useBase();
  const navigate = useNavigate();
  const [tab, setTab] = useState('payments');
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const debounced = useDebounced(search);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res =
        tab === 'payments'
          ? await billingService.listPayments({ search: debounced, page })
          : tab === 'outstanding'
            ? await billingService.listOutstanding({ page })
            : await billingService.listOverdue({ page });
      setRows(res.rows);
      setTotal(res.total);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tab, debounced, page]);

  useEffect(() => {
    load();
  }, [load]);

  const switchTab = (t) => {
    setTab(t);
    setPage(0);
    setRows([]);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Payments" description="Recorded payments, invoices still outstanding, and overdue invoices to chase. Record a payment from the invoice itself." />

      <div className="flex flex-col gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <FilterChips value={tab} onChange={switchTab} options={TABS} />
        {tab === 'payments' && <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Search payment notes" />}
      </div>

      {error && <ErrorBox message={error} onRetry={load} />}
      {loading && !rows.length && <Skeleton className="h-40 w-full" />}
      {!loading && !error && rows.length === 0 && (
        <EmptyState icon={Wallet} title={tab === 'payments' ? 'No payments recorded' : tab === 'overdue' ? 'Nothing overdue' : 'Nothing outstanding'} description="Payments are recorded against confirmed invoices." />
      )}

      {rows.length > 0 && tab === 'payments' && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Note</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{formatShortDate(p.payment_date)}</TableCell>
                <TableCell>
                  {p.invoice ? (
                    <Link to={`${base}/invoices/${p.invoice.id}`} className="font-medium text-indigo-700 hover:underline">
                      {p.invoice.number}
                    </Link>
                  ) : '—'}
                </TableCell>
                <TableCell>{p.invoice?.customer?.name ?? '—'}</TableCell>
                <TableCell className="capitalize">{p.method.replace('_', ' ')}</TableCell>
                <TableCell>{p.note || '—'}</TableCell>
                <TableCell className="text-right font-medium">{formatMoney(p.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {rows.length > 0 && tab !== 'payments' && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>{tab === 'overdue' ? 'Days overdue' : 'Status'}</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((i) => (
              <TableRow key={i.id} className="cursor-pointer" onClick={() => navigate(`${base}/invoices/${i.id}`)}>
                <TableCell className="font-medium text-indigo-700">{i.number}</TableCell>
                <TableCell>{i.customer_name}</TableCell>
                <TableCell>{formatShortDate(i.due_date)}</TableCell>
                <TableCell>
                  {tab === 'overdue' ? <Badge variant="danger">{i.days_overdue} days</Badge> : i.is_overdue ? <Badge variant="danger">Overdue</Badge> : <Badge variant="primary">Open</Badge>}
                </TableCell>
                <TableCell className="text-right font-medium">{formatMoney(i.outstanding)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {rows.length > 0 && <Pager page={page} total={total} onPage={setPage} loading={loading} />}
    </div>
  );
}
