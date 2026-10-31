import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Calculator, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { staffService } from '../../../services/staffService';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { formatCurrency } from '../../../utils/formatters';

export function CreateQuotation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCustomerId = searchParams.get('customerId') || '';

  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [saving, setSaving] = useState(false);

  // Catalog state
  const [catalog, setCatalog] = useState({
    customers: [],
    plans: [],
    products: [],
    taxes: [],
    paymentTerms: [],
  });

  // Form state
  const [customerId, setCustomerId] = useState(initialCustomerId);
  const [planId, setPlanId] = useState('');
  const [paymentTermId, setPaymentTermId] = useState('');
  const [validityDays, setValidityDays] = useState(30);
  const [notes, setNotes] = useState('');

  // Line items state
  const [lines, setLines] = useState([]);

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        setLoadingCatalog(true);
        const data = await staffService.getCatalogOptions();
        setCatalog(data);
        if (data.plans.length > 0) {
          setPlanId(data.plans[0].id);
        }
        if (data.paymentTerms.length > 0) {
          setPaymentTermId(data.paymentTerms[0].id);
        }
        if (!initialCustomerId && data.customers.length > 0) {
          setCustomerId(data.customers[0].id);
        }
      } catch (err) {
        console.error('Error loading catalog options:', err);
        toast.error('Failed to load catalog data');
      } finally {
        setLoadingCatalog(false);
      }
    };
    loadCatalog();
  }, [initialCustomerId]);

  // Add line item
  const handleAddLine = () => {
    if (catalog.products.length === 0) {
      toast.error('No active products found in catalog');
      return;
    }
    const defaultProduct = catalog.products[0];
    const defaultVariant = defaultProduct.product_variants?.[0] || null;
    const basePrice = Number(defaultProduct.sales_price || 0);
    const extraPrice = Number(defaultVariant?.extra_price || 0);
    const effectiveUnitPrice = basePrice + extraPrice;

    setLines([
      ...lines,
      {
        product_id: defaultProduct.id,
        variant_id: defaultVariant?.id || null,
        quantity: 1,
        unit_price: effectiveUnitPrice,
        tax_id: catalog.taxes?.[0]?.id || null,
      },
    ]);
  };

  const handleRemoveLine = (idx) => {
    setLines(lines.filter((_, i) => i !== idx));
  };

  const handleProductChange = (idx, newProdId) => {
    const prod = catalog.products.find((p) => p.id === newProdId);
    if (!prod) return;
    const defaultVariant = prod.product_variants?.[0] || null;
    const basePrice = Number(prod.sales_price || 0);
    const extraPrice = Number(defaultVariant?.extra_price || 0);
    const effectiveUnitPrice = basePrice + extraPrice;

    const newLines = [...lines];
    newLines[idx] = {
      ...newLines[idx],
      product_id: prod.id,
      variant_id: defaultVariant?.id || null,
      unit_price: effectiveUnitPrice,
    };
    setLines(newLines);
  };

  const handleVariantChange = (idx, newVariantId) => {
    const line = lines[idx];
    const prod = catalog.products.find((p) => p.id === line.product_id);
    if (!prod) return;
    const variant = prod.product_variants?.find((v) => v.id === newVariantId);
    const basePrice = Number(prod.sales_price || 0);
    const extraPrice = Number(variant?.extra_price || 0);
    const effectiveUnitPrice = basePrice + extraPrice;

    const newLines = [...lines];
    newLines[idx] = {
      ...newLines[idx],
      variant_id: newVariantId || null,
      unit_price: effectiveUnitPrice,
    };
    setLines(newLines);
  };

  const handleQuantityChange = (idx, qty) => {
    const val = Math.max(1, parseInt(qty, 10) || 1);
    const newLines = [...lines];
    newLines[idx] = { ...newLines[idx], quantity: val };
    setLines(newLines);
  };

  const handleTaxChange = (idx, taxId) => {
    const newLines = [...lines];
    newLines[idx] = { ...newLines[idx], tax_id: taxId || null };
    setLines(newLines);
  };

  // Calculations
  const selectedPlan = catalog.plans.find((p) => p.id === planId);
  const planPrice = Number(selectedPlan?.price || 0);

  const linesSubtotal = lines.reduce((acc, l) => acc + l.quantity * l.unit_price, 0);
  const subtotal = planPrice + linesSubtotal;

  let totalTax = 0;
  lines.forEach((l) => {
    const lineAmount = l.quantity * l.unit_price;
    const tax = catalog.taxes.find((t) => t.id === l.tax_id);
    if (tax) {
      if (tax.rate_type === 'percent') {
        totalTax += (lineAmount * Number(tax.rate)) / 100.0;
      } else {
        totalTax += Number(tax.rate);
      }
    }
  });

  const grandTotal = subtotal + totalTax;

  const handleSubmit = async (status = 'quotation') => {
    if (!customerId) {
      toast.error('Please select a customer');
      return;
    }
    if (!planId) {
      toast.error('Please select a subscription plan');
      return;
    }

    try {
      setSaving(true);
      const res = await staffService.createQuotation({
        customer_id: customerId,
        plan_id: planId,
        validity_days: validityDays,
        payment_term_id: paymentTermId || null,
        notes,
        lines,
        status,
      });

      toast.success(
        status === 'draft'
          ? 'Quotation saved as draft'
          : `Quotation ${res.number || ''} created successfully!`
      );
      navigate(`/staff/quotations/${res.id}`);
    } catch (err) {
      console.error('Error creating quotation:', err);
      toast.error(err.message || 'Failed to create quotation');
    } finally {
      setSaving(false);
    }
  };

  if (loadingCatalog) {
    return (
      <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
        Loading catalog configuration...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/staff/quotations')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Quotations
        </button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Create New Quotation
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Select customer and recurring plan, configure product line items, and issue quotation.
        </p>
      </div>

      {/* Main Form Cards */}
      <div className="space-y-6">
        {/* Customer & Plan Section */}
        <Card className="border-slate-200/80">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-800">
              1. Customer & Plan Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Select Customer *
              </label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600"
                required
              >
                <option value="">-- Choose Customer --</option>
                {catalog.customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.company || c.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Subscription Plan *
              </label>
              <select
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600"
                required
              >
                <option value="">-- Choose Plan --</option>
                {catalog.plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {formatCurrency(p.price)} / {p.billing_period}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Quotation Validity (Days)
              </label>
              <Input
                type="number"
                min="1"
                max="365"
                value={validityDays}
                onChange={(e) => setValidityDays(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Payment Terms
              </label>
              <select
                value={paymentTermId}
                onChange={(e) => setPaymentTermId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600"
              >
                {catalog.paymentTerms.map((pt) => (
                  <option key={pt.id} value={pt.id}>
                    {pt.name} ({pt.days} days)
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Product Line Items */}
        <Card className="border-slate-200/80">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-slate-800">
                2. Products & Add-ons
              </CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">Add products and variants to attach to this quotation.</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleAddLine}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Item
            </Button>
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            {lines.length === 0 ? (
              <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl text-xs text-slate-500">
                No extra products added yet. Click &ldquo;Add Item&rdquo; to include products or software services.
              </div>
            ) : (
              <div className="space-y-3">
                {lines.map((line, idx) => {
                  const currentProd = catalog.products.find((p) => p.id === line.product_id);
                  const variants = currentProd?.product_variants || [];

                  return (
                    <div
                      key={idx}
                      className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center gap-3"
                    >
                      {/* Product select */}
                      <div className="flex-1 min-w-[140px]">
                        <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                          Product
                        </label>
                        <select
                          value={line.product_id}
                          onChange={(e) => handleProductChange(idx, e.target.value)}
                          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-800 bg-white"
                        >
                          {catalog.products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} (${Number(p.sales_price).toFixed(2)})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Variant select if available */}
                      {variants.length > 0 && (
                        <div className="w-32">
                          <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                            Variant
                          </label>
                          <select
                            value={line.variant_id || ''}
                            onChange={(e) => handleVariantChange(idx, e.target.value)}
                            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-800 bg-white"
                          >
                            <option value="">Base (No extra)</option>
                            {variants.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.value} (+${Number(v.extra_price).toFixed(2)})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Quantity */}
                      <div className="w-20">
                        <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                          Qty
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={line.quantity}
                          onChange={(e) => handleQuantityChange(idx, e.target.value)}
                          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-800 text-center"
                        />
                      </div>

                      {/* Effective Unit Price */}
                      <div className="w-24 text-right">
                        <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                          Unit Price
                        </label>
                        <span className="text-xs font-semibold text-slate-800 block py-1.5">
                          {formatCurrency(line.unit_price)}
                        </span>
                      </div>

                      {/* Tax Select */}
                      <div className="w-28">
                        <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                          Tax Rate
                        </label>
                        <select
                          value={line.tax_id || ''}
                          onChange={(e) => handleTaxChange(idx, e.target.value)}
                          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-800 bg-white"
                        >
                          <option value="">No Tax</option>
                          {catalog.taxes.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({t.rate}%)
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Line Total */}
                      <div className="w-24 text-right">
                        <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                          Total
                        </label>
                        <span className="text-xs font-bold text-slate-900 block py-1.5">
                          {formatCurrency(line.quantity * line.unit_price)}
                        </span>
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-200 transition-colors mt-4 sm:mt-0"
                        title="Remove Item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Financial Summary Box */}
            <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-end space-y-1.5 text-xs">
              <div className="flex justify-between w-64 text-slate-600">
                <span>Plan Base Fee:</span>
                <span className="font-semibold">{formatCurrency(planPrice)}</span>
              </div>
              <div className="flex justify-between w-64 text-slate-600">
                <span>Products Subtotal:</span>
                <span className="font-semibold">{formatCurrency(linesSubtotal)}</span>
              </div>
              <div className="flex justify-between w-64 text-slate-600">
                <span>Estimated Taxes:</span>
                <span className="font-semibold">{formatCurrency(totalTax)}</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between w-64 text-sm font-bold text-slate-900">
                <span>Quotation Total:</span>
                <span className="text-indigo-600">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="border-slate-200/80">
          <CardContent className="p-5">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Customer Notes / Quotation Terms
            </label>
            <textarea
              rows={3}
              placeholder="Include customer-specific pricing terms or discount notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            />
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => handleSubmit('draft')}
          >
            Save as Draft
          </Button>
          <Button
            type="button"
            isLoading={saving}
            onClick={() => handleSubmit('quotation')}
            leftIcon={<CheckCircle2 className="w-4 h-4" />}
          >
            Create Quotation
          </Button>
        </div>
      </div>
    </div>
  );
}

