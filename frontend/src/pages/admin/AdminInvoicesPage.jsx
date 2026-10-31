import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import { billingService } from '../../services/billingService';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatShortDate } from '../../utils/formatters';
import { formatMoney } from '../../utils/money';
import { ErrorBox, FilterChips, InvoiceStatusBadge, PageHeader, Pager, SearchBox, useBase, useDebounced } from '../../features/admin/billing/shared';

const FILTERS = [['all', 'All'], ['draft', 'Draft'], ['confirmed', 'Confirmed'], ['paid', 'Paid'], ['cancelled', 'Cancelled'], ['overdue', 'Overdue']];

export function AdminInvoicesPage() {
  const base = useBase();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const debounced = useDebounced(search);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [billing, setBilling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await billingService.listInvoices({
        search: debounced,
        status: filter === 'overdue' ? 'all' : filter,
        overdueOnly: filter === 'overdue',
        page,
      });
      setRows(res.rows);
      setTotal(res.total);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [debounced, filter, page]);

  useEffect(() => {
    load();
  }, [load]);

  const runBilling = async () => {
    setBilling(true);
    try {
      const r = await billingService.runBilling();
      toast.success(`Billing done: ${r.created} created, ${r.skipped} already billed, ${r.errors} errors`);
      setPage(0);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBilling(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Invoices are generated from active subscriptions. Running billing twice never bills a period twice."
        actions={
          <Button onClick={runBilling} isLoading={billing} leftIcon={<Play className="w-4 h-4" />}>
            Run billing now
          </Button>
        }
      />

      <div className="flex flex-col gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Search by invoice number or customer name" />
        <FilterChips value={filter} onChange={(v) => { setFilter(v); setPage(0); }} options={FILTERS} />
      </div>

      {error && <ErrorBox message={error} onRetry={load} />}
      {loading && !rows.length && <Skeleton className="h-40 w-full" />}
      {!loading && !error && rows.length === 0 && (
        <EmptyState icon={Receipt} title="No invoices found" description="Activate a subscription and click Run billing now to generate its invoices." />
      )}

      {rows.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((i) => (
                <TableRow key={i.id} className="cursor-pointer" onClick={() => navigate(`${base}/invoices/${i.id}`)}>
                  <TableCell className="font-medium text-indigo-700">{i.number}</TableCell>
                  <TableCell>{i.customer_name}</TableCell>
                  <TableCell>{i.subscription_number ?? '—'}</TableCell>
                  <TableCell>{formatShortDate(i.due_date)}</TableCell>
                  <TableCell>
                    <InvoiceStatusBadge status={i.status} overdue={i.is_overdue} />
                  </TableCell>
                  <TableCell className="text-right">{formatMoney(i.total)}</TableCell>
                  <TableCell className="text-right">{formatMoney(i.amount_paid)}</TableCell>
                  <TableCell className="text-right font-medium">{formatMoney(i.outstanding)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pager page={page} total={total} onPage={setPage} loading={loading} />
        </>
      )}
    </div>
  );
}
