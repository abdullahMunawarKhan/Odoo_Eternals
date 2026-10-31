import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Printer,
  Calendar,
  Building,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Receipt,
  CreditCard,
} from 'lucide-react';
import { toast } from 'sonner';
import { customerService } from '../../../services/customerService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { formatShortDate, formatDate } from '../../../utils/formatters';
import { getInvoiceStatusBadge } from '../components/InvoiceTable';
import { generateInvoicePDF } from '../../../utils/pdfGenerator';

export function InvoiceDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchInvoice = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await customerService.getInvoiceById(id);
      setInvoice(data);
    } catch (err) {
      console.error('Error fetching invoice details:', err);
      setError(err.message || 'Unable to retrieve invoice details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const handleDownloadPDF = () => {
    if (!invoice) return;
    try {
      generateInvoicePDF(invoice, invoice.customer);
      toast.success('Invoice PDF downloaded.');
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Failed to download invoice PDF.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-7 w-48" />
        </div>
        <Card className="p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <Skeleton className="h-20 w-full mb-4" />
          <Skeleton className="h-32 w-full" />
        </Card>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Invoice Not Found</h2>
        <p className="text-sm text-slate-500">{error || 'This invoice does not exist or you do not have permission to view it.'}</p>
        <Button variant="outline" onClick={() => navigate('/customer/invoices')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back to Invoices
        </Button>
      </div>
    );
  }

  const customer = invoice.customer || {};
  const statusInfo = getInvoiceStatusBadge(invoice.status);
  const lines = invoice.invoice_lines || [];
  const payments = invoice.payments || [];

  const subtotal = Number(invoice.subtotal || invoice.total || 0).toFixed(2);
  const discountTotal = Number(invoice.discount_total || 0).toFixed(2);
  const taxTotal = Number(invoice.tax_total || 0).toFixed(2);
  const total = Number(invoice.total || 0).toFixed(2);
  const amountPaid = Number(invoice.amount_paid || 0).toFixed(2);
  const balanceDue = Math.max(0, Number(total) - Number(amountPaid)).toFixed(2);

  return (
    <div className="space-y-6 print:m-0 print:p-0">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/customer/invoices')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {invoice.number}
              </h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusInfo.bg}`}>
                {statusInfo.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Issued on: <span className="font-semibold text-slate-700">{formatShortDate(invoice.issue_date || invoice.created_at)}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            leftIcon={<Printer className="w-4 h-4" />}
          >
            Print
          </Button>
          <Button
            size="sm"
            onClick={handleDownloadPDF}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Download PDF
          </Button>
        </div>
      </div>

      {/* Invoice Document Box */}
      <Card className="border-slate-200/90 shadow-xs overflow-hidden">
        {/* Printable Header */}
        <div className="bg-slate-900 text-white p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <Receipt className="w-5 h-5 text-indigo-400" /> SubFlow Billing Statement
            </div>
            <p className="text-xs text-slate-400 mt-1">Official tax-compliant subscription invoice</p>
          </div>

          <div className="text-left md:text-right">
            <div className="text-2xl font-black text-white">{invoice.number}</div>
            <p className="text-xs text-slate-300 mt-0.5 capitalize">Status: {invoice.status}</p>
          </div>
        </div>

        <CardContent className="p-6 md:p-8 space-y-6">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-200/80">
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Billed To</h3>
              <p className="font-bold text-slate-900 text-base">{customer.name || 'Subscriber'}</p>
              {customer.company && (
                <p className="text-xs text-slate-600 flex items-center gap-1.5 mt-1">
                  <Building className="w-3.5 h-3.5 text-slate-400" /> {customer.company}
                </p>
              )}
              {customer.email && (
                <p className="text-xs text-slate-600 flex items-center gap-1.5 mt-0.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> {customer.email}
                </p>
              )}
              {customer.phone && (
                <p className="text-xs text-slate-600 flex items-center gap-1.5 mt-0.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" /> {customer.phone}
                </p>
              )}
              {customer.address && (
                <p className="text-xs text-slate-600 flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" /> {customer.address}
                </p>
              )}
            </div>

            <div className="space-y-1.5 text-xs text-slate-600">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Billing Information</h3>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Issue Date:</span>
                <span className="font-semibold text-slate-800">{formatDate(invoice.issue_date || invoice.created_at)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Due Date:</span>
                <span className="font-semibold text-slate-800">{formatDate(invoice.due_date || invoice.created_at)}</span>
              </div>
              {invoice.subscription && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Subscription #:</span>
                  <span className="font-semibold text-slate-800">{invoice.subscription.number}</span>
                </div>
              )}
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Billing Period:</span>
                <span className="text-slate-800 font-medium">
                  {formatShortDate(invoice.period_start)} to {formatShortDate(invoice.period_end)}
                </span>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Itemized Charges</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Tax</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead className="text-right">Line Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-xs text-slate-500">
                      Standard recurring subscription fee
                    </TableCell>
                  </TableRow>
                ) : (
                  lines.map((line) => {
                    const desc = line.description || 'Subscription service';
                    const qty = line.quantity || 1;
                    const unitPrice = Number(line.unit_price || 0).toFixed(2);
                    const lineTot = Number(line.line_total || (qty * unitPrice)).toFixed(2);
                    const taxAmt = Number(line.tax_amount || 0).toFixed(2);
                    const discAmt = Number(line.discount_amount || 0).toFixed(2);

                    return (
                      <TableRow key={line.id}>
                        <TableCell className="font-medium text-slate-900">{desc}</TableCell>
                        <TableCell>{qty}</TableCell>
                        <TableCell>${unitPrice}</TableCell>
                        <TableCell className="text-xs text-slate-500">${taxAmt}</TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {Number(discAmt) > 0 ? `-$${discAmt}` : '—'}
                        </TableCell>
                        <TableCell className="text-right font-bold text-slate-900">${lineTot}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Financial Breakdown Totals */}
          <div className="flex justify-end pt-4">
            <div className="w-full max-w-xs space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-900">${subtotal}</span>
              </div>

              {Number(discountTotal) > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Applied Discounts:</span>
                  <span className="font-semibold">-${discountTotal}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>Taxes:</span>
                <span className="font-semibold text-slate-900">${taxTotal}</span>
              </div>

              <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                <span>Grand Total:</span>
                <span>${total}</span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Amount Paid:</span>
                <span className="font-medium text-emerald-600">${amountPaid}</span>
              </div>

              <div className="flex justify-between text-xs font-bold pt-1 border-t border-slate-100">
                <span>Balance Due:</span>
                <span className={balanceDue === '0.00' ? 'text-emerald-700' : 'text-rose-600'}>
                  ${balanceDue}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Receipts section if payments exist */}
          {payments.length > 0 && (
            <div className="pt-4 border-t border-slate-200">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Processed Payment Transactions
              </h3>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden bg-slate-50/50">
                {payments.map((p) => (
                  <div key={p.id} className="p-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="font-medium text-slate-800 capitalize">{p.method} Payment</span>
                      <span className="text-slate-400">• {formatShortDate(p.payment_date)}</span>
                    </div>
                    <span className="font-bold text-emerald-700">${Number(p.amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

