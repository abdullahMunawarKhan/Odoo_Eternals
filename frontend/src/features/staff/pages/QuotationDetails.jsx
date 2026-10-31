import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  FileSpreadsheet,
  CheckCircle2,
  FileDown,
  Printer,
  Calendar,
  Building2,
  CreditCard,
  Repeat,
} from 'lucide-react';
import { toast } from 'sonner';
import { staffService } from '../../../services/staffService';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { formatShortDate, formatCurrency } from '../../../utils/formatters';
import { generateQuotationPDF } from '../../../utils/pdfGenerator';
import { getQuotationStatusBadge } from '../components/QuotationTable';

export function QuotationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [quotation, setQuotation] = useState(null);
  const [converting, setConverting] = useState(false);

  const loadQuotation = async () => {
    try {
      setLoading(true);
      const data = await staffService.getQuotationById(id);
      setQuotation(data);
    } catch (err) {
      console.error('Error loading quotation:', err);
      toast.error('Failed to load quotation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuotation();
  }, [id]);

  const handleConvert = async () => {
    if (!window.confirm(`Convert quotation ${quotation.number} into a confirmed subscription?`)) {
      return;
    }

    try {
      setConverting(true);
      await staffService.convertQuotationToSubscription(quotation.id);
      toast.success(`Quotation ${quotation.number} converted to Confirmed subscription!`);
      loadQuotation();
    } catch (err) {
      console.error('Error converting quotation:', err);
      toast.error(err.message || 'Failed to convert quotation');
    } finally {
      setConverting(false);
    }
  };

  const handleDownloadPDF = () => {
    try {
      generateQuotationPDF(quotation, quotation.customer);
      toast.success('Quotation PDF downloaded');
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast.error('Failed to generate PDF');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
        Loading quotation details...
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
        <h2 className="text-lg font-bold text-slate-800">Quotation not found</h2>
        <Button onClick={() => navigate('/staff/quotations')} className="mt-4">
          Back to Quotations
        </Button>
      </div>
    );
  }

  const canConvert = quotation.status === 'draft' || quotation.status === 'quotation';
  const customer = quotation.customer;
  const plan = quotation.plan;
  const lines = quotation.lines || [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto print:max-w-full">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between print:hidden">
        <button
          onClick={() => navigate('/staff/quotations')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Quotations
        </button>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handlePrint}
            leftIcon={<Printer className="w-3.5 h-3.5" />}
          >
            Print
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownloadPDF}
            leftIcon={<FileDown className="w-3.5 h-3.5" />}
          >
            PDF
          </Button>
          {canConvert && (
            <Button
              size="sm"
              isLoading={converting}
              onClick={handleConvert}
              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
            >
              Convert to Subscription
            </Button>
          )}
        </div>
      </div>

      {/* Main Quotation Card */}
      <Card className="border-slate-200/80 shadow-xs">
        <CardContent className="p-6 sm:p-8 space-y-6">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                  Customer Proposal
                </span>
                {getQuotationStatusBadge(quotation.status)}
              </div>
              <h1 className="text-2xl font-bold font-mono tracking-tight text-slate-900 mt-1">
                {quotation.number}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Created on {formatShortDate(quotation.created_at)}
              </p>
            </div>

            <div className="text-left sm:text-right text-xs text-slate-500 space-y-1">
              <div>
                <span className="text-slate-400">Valid Until: </span>
                <strong className="text-slate-800">
                  {formatShortDate(quotation.quotation_valid_until)}
                </strong>
              </div>
              <div>
                <span className="text-slate-400">Payment Term: </span>
                <span className="text-slate-700">
                  {quotation.payment_term?.name || 'Net 15 Days'}
                </span>
              </div>
            </div>
          </div>

          {/* Customer & Plan Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Customer Information
              </span>
              <div className="font-semibold text-sm text-slate-900">
                {customer?.name}
              </div>
              {customer?.company && (
                <div className="text-slate-600 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  {customer.company}
                </div>
              )}
              <div className="text-slate-500">{customer?.email}</div>
              <div className="text-slate-500">{customer?.phone || 'No phone'}</div>
              {customer?.address && (
                <div className="text-slate-500 text-[11px] pt-1">{customer.address}</div>
              )}
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Base Subscription Plan
              </span>
              <div className="font-semibold text-sm text-slate-900">
                {plan?.name}
              </div>
              <div className="text-slate-600">
                Base Fee: <strong>{formatCurrency(plan?.price)}</strong> / {plan?.billing_period}
              </div>
              <div className="text-slate-500 text-[11px]">
                Renewable: {plan?.renewable ? 'Yes' : 'No'} • Pausable: {plan?.pausable ? 'Yes' : 'No'}
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Line Items & Services
            </h3>
            <div className="overflow-x-auto border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">Qty</th>
                    <th className="py-2.5 px-3">Unit Price</th>
                    <th className="py-2.5 px-3">Tax</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Plan recurring line */}
                  {Number(plan?.price || 0) > 0 && (
                    <tr className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-medium text-slate-900">
                        {plan.name} (Recurring Plan Base)
                      </td>
                      <td className="py-2.5 px-3">1</td>
                      <td className="py-2.5 px-3">{formatCurrency(plan.price)}</td>
                      <td className="py-2.5 px-3 text-slate-400">—</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-800">
                        {formatCurrency(plan.price)}
                      </td>
                    </tr>
                  )}

                  {/* Product lines */}
                  {lines.map((line) => (
                    <tr key={line.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-medium text-slate-800">
                        {line.product?.name || 'Product Item'}
                        {line.variant?.value && (
                          <span className="text-slate-500 ml-1">
                            ({line.variant.attribute_name || 'Brand'}: {line.variant.value})
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">{line.quantity}</td>
                      <td className="py-2.5 px-3">{formatCurrency(line.unit_price)}</td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {line.tax?.name ? `${line.tax.name} (${line.tax.rate}%)` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-800">
                        {formatCurrency(line.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals Section */}
          <div className="flex flex-col items-end pt-3 border-t border-slate-100 text-xs space-y-1.5">
            <div className="flex justify-between w-64 text-slate-600">
              <span>Estimated Total:</span>
              <span className="font-bold text-sm text-indigo-600">
                {formatCurrency(quotation.totalAmount)}
              </span>
            </div>
          </div>

          {/* Notes */}
          {quotation.notes && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
              <strong className="block text-slate-700 mb-0.5">Notes:</strong>
              {quotation.notes}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

