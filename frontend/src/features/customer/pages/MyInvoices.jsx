import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, RefreshCw, ChevronLeft, ChevronRight, AlertCircle, Filter, Download } from 'lucide-react';
import { toast } from 'sonner';
import { customerService } from '../../../services/customerService';
import { InvoiceTable } from '../components/InvoiceTable';
import { Button } from '../../../components/ui/Button';
import { generateInvoicePDF } from '../../../utils/pdfGenerator';

const INVOICE_FILTERS = [
  { value: 'all', label: 'All Invoices' },
  { value: 'confirmed', label: 'Due / Confirmed' },
  { value: 'paid', label: 'Paid' },
  { value: 'draft', label: 'Draft' },
];

export function MyInvoices() {
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchInvoices = async (currentPage = page, currentStatus = status, currentSearch = search) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await customerService.getInvoices({
        status: currentStatus,
        search: currentSearch,
        page: currentPage,
        pageSize: 10,
      });
      setInvoices(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch customer invoices:', err);
      setError(err.message || 'Unable to retrieve invoices');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices(page, status, search);
  }, [page, status]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchInvoices(1, status, search);
  };

  const handleDownloadPDF = async (inv) => {
    try {
      toast.info(`Preparing PDF for ${inv.number}...`);
      const fullInvoice = await customerService.getInvoiceById(inv.id);
      generateInvoicePDF(fullInvoice, fullInvoice.customer);
      toast.success(`Downloaded ${inv.number}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      toast.error('Could not generate PDF. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            My Invoices
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Access, view and download tax invoices for your ongoing and past subscription cycles.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchInvoices(page, status, search)}
          isLoading={isLoading}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Refresh
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by invoice # (e.g. INV-00001)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
          />
        </form>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="flex items-center gap-1.5">
            {INVOICE_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => {
                  setStatus(f.value);
                  setPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  status === f.value
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 flex items-center justify-between text-sm text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchInvoices(page, status, search)}>
            Retry
          </Button>
        </div>
      )}

      {/* Invoices Table */}
      <InvoiceTable
        invoices={invoices}
        isLoading={isLoading}
        onViewDetails={(id) => navigate(`/customer/invoices/${id}`)}
        onDownloadPDF={handleDownloadPDF}
      />

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

