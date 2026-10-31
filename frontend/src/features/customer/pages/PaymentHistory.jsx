import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Search, RefreshCw, ChevronLeft, ChevronRight, AlertCircle, ArrowUpRight, Receipt } from 'lucide-react';
import { customerService } from '../../../services/customerService';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { Button } from '../../../components/ui/Button';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Badge } from '../../../components/ui/Badge';
import { formatShortDate } from '../../../utils/formatters';

export function PaymentHistory() {
  const navigate = useNavigate();

  const [payments, setPayments] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPayments = async (currentPage = page, currentSearch = search) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await customerService.getPaymentHistory({
        search: currentSearch,
        page: currentPage,
        pageSize: 10,
      });
      setPayments(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch payment history:', err);
      setError(err.message || 'Unable to retrieve payment records');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments(page, search);
  }, [page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchPayments(1, search);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Payment History
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review all transaction receipts, payment methods used, and view linked invoices.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchPayments(page, search)}
          isLoading={isLoading}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Refresh
        </Button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <form onSubmit={handleSearchSubmit} className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search payments by note or transaction details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
          />
        </form>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 flex items-center justify-between text-sm text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchPayments(page, search)}>
            Retry
          </Button>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-8 w-20 rounded-lg" />
            </div>
          ))}
        </div>
      ) : payments.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No payment records found"
          description="You do not have any recorded transactions yet. Once an invoice is confirmed and paid, it will appear here."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Payment Ref</TableHead>
              <TableHead>Related Invoice</TableHead>
              <TableHead>Payment Method</TableHead>
              <TableHead>Payment Date</TableHead>
              <TableHead>Note / Memo</TableHead>
              <TableHead>Amount Paid</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((p) => {
              const invNum = p.invoice?.number || `INV-${p.invoice_id?.slice(0, 6)}`;
              const amount = Number(p.amount || 0).toFixed(2);

              return (
                <TableRow key={p.id}>
                  <TableCell className="font-semibold text-slate-900">
                    PAY-{p.id.slice(0, 8).toUpperCase()}
                  </TableCell>

                  <TableCell>
                    <span
                      onClick={() => navigate(`/customer/invoices/${p.invoice_id}`)}
                      className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      {invNum}
                    </span>
                  </TableCell>

                  <TableCell className="capitalize text-slate-700 text-xs">
                    {p.method?.replace('_', ' ') || 'Card'}
                  </TableCell>

                  <TableCell className="text-slate-600 text-xs">
                    {formatShortDate(p.payment_date || p.created_at)}
                  </TableCell>

                  <TableCell className="text-slate-500 text-xs max-w-xs truncate">
                    {p.note || '—'}
                  </TableCell>

                  <TableCell className="font-bold text-emerald-700">
                    ${amount}
                  </TableCell>

                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/customer/invoices/${p.invoice_id}`)}
                      rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
                    >
                      Invoice
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 pt-2">
          <span className="text-xs text-slate-500">
            Showing Page <span className="font-semibold text-slate-700">{page}</span> of <span className="font-semibold text-slate-700">{totalPages}</span> ({total} total records)
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              leftIcon={<ChevronLeft className="w-4 h-4" />}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage((p) => p + 1)}
              rightIcon={<ChevronRight className="w-4 h-4" />}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

