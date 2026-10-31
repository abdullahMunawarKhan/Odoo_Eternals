import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Search, Repeat, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { staffService } from '../../../services/staffService';
import { SubscriptionTable } from '../components/SubscriptionTable';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';

export function Subscriptions() {
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const res = await staffService.getSubscriptions({
        search,
        status: statusFilter,
        page,
        limit: 10,
      });
      setSubscriptions(res.data);
      setTotalPages(res.totalPages);
      setTotalCount(res.count);
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
      toast.error('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, [page, statusFilter, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Subscription Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage active client subscriptions, handle billing intervals, renewals, and lifecycle changes.
          </p>
        </div>

        <Link to="/staff/subscriptions/new">
          <Button leftIcon={<Plus className="w-4 h-4" />}>
            New Subscription
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Input
              placeholder="Search by subscription # (e.g. SUB-00001)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="confirmed">Confirmed</option>
            <option value="paused">Paused</option>
            <option value="closed">Closed</option>
            <option value="draft">Draft</option>
            <option value="quotation">Quotation</option>
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Total: <strong>{totalCount}</strong> subscriptions</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={loadSubscriptions}
            title="Refresh"
            className="p-1.5 h-8 text-slate-500"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <SubscriptionTable
        subscriptions={subscriptions}
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

