import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, CreditCard, Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { staffService } from '../../../services/staffService';
import { PaymentTable } from '../components/PaymentTable';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';

export function Payments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const res = await staffService.getPayments({
        search,
        page,
        limit: 10,
      });
      setPayments(res.data);
      setTotalPages(res.totalPages);
      setTotalCount(res.count);
    } catch (err) {
      console.error('Error fetching payments:', err);
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [page, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Payment Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track customer payments received, reconcile invoices, and verify transaction allocations.
          </p>
        </div>

        <Link to="/staff/payments/new">
          <Button leftIcon={<Plus className="w-4 h-4" />}>
            Record Payment
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Input
            placeholder="Search by payment reference (e.g. PAY-00001)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Found: <strong>{totalCount}</strong> payments</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={loadPayments}
            title="Refresh"
            className="p-1.5 h-8 text-slate-500"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <PaymentTable
        payments={payments}
        isLoading={loading}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 pt-2">
          <div className="text-xs text-slate-500">
            Page {page} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

