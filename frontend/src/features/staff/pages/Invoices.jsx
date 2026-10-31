import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Receipt, RefreshCw, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { staffService } from '../../../services/staffService';
import { InvoiceTable } from '../components/InvoiceTable';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { generateInvoicePDF } from '../../../utils/pdfGenerator';

export function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const res = await staffService.getInvoices({
        search,
        status: statusFilter,
        page,
        limit: 10,
      });
      setInvoices(res.data);
      setTotalPages(res.totalPages);
      setTotalCount(res.count);
    } catch (err) {
      console.error('Error fetching invoices:', err);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [page, statusFilter, search]);

  const handleConfirm = async (inv) => {
    if (!window.confirm(`Confirm draft invoice ${inv.number}? Amounts will be finalized.`)) {
      return;
    }

    try {
      await staffService.updateInvoiceStatus(inv.id, 'confirmed');
      toast.success(`Invoice ${inv.number} confirmed successfully`);
      loadInvoices();
    } catch (err) {
      console.error('Error confirming invoice:', err);
      toast.error(err.message || 'Failed to confirm invoice');
    }
  };

  const handleCancel = async (inv) => {
    if (!window.confirm(`Are you sure you want to cancel invoice ${inv.number}?`)) {
      return;
    }

    try {
      await staffService.updateInvoiceStatus(inv.id, 'cancelled');
      toast.success(`Invoice ${inv.number} cancelled`);
      loadInvoices();
    } catch (err) {
      console.error('Error cancelling invoice:', err);
      toast.error(err.message || 'Failed to cancel invoice');
    }
  };

  const handleDownloadPDF = async (inv) => {
    try {
      const fullInv = await staffService.getInvoiceById(inv.id);
      generateInvoicePDF(fullInv, fullInv.customer);
      toast.success('Invoice PDF downloaded');
    } catch (err) {
      console.error('Error downloading invoice PDF:', err);
      toast.error('Failed to generate PDF');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Invoice Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review billing records, confirm draft invoices, verify payments, and download compliance PDFs.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Input
              placeholder="Search by invoice # (e.g. INV-00001)..."
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
            <option value="draft">Draft (Awaiting Confirmation)</option>
            <option value="confirmed">Confirmed (Unpaid / Partial)</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Found: <strong>{totalCount}</strong> invoices</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={loadInvoices}
            title="Refresh"
            className="p-1.5 h-8 text-slate-500"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <InvoiceTable
        invoices={invoices}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        onDownloadPDF={handleDownloadPDF}
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

