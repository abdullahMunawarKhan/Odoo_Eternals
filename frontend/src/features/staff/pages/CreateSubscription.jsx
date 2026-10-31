import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { staffService } from '../../../services/staffService';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { formatCurrency } from '../../../utils/formatters';

export function CreateSubscription() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCustomerId = searchParams.get('customerId') || '';

  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [saving, setSaving] = useState(false);

  const [catalog, setCatalog] = useState({
    customers: [],
    plans: [],
    products: [],
    taxes: [],
    paymentTerms: [],
  });

  const [customerId, setCustomerId] = useState(initialCustomerId);
  const [planId, setPlanId] = useState('');
  const [paymentTermId, setPaymentTermId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState([]);

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        setLoadingCatalog(true);
        const data = await staffService.getCatalogOptions();
        setCatalog(data);
        if (data.plans.length > 0) setPlanId(data.plans[0].id);
        if (data.paymentTerms.length > 0) setPaymentTermId(data.paymentTerms[0].id);
        if (!initialCustomerId && data.customers.length > 0) setCustomerId(data.customers[0].id);
      } catch (err) {
        console.error('Error loading catalog:', err);
        toast.error('Failed to load catalog');
      } finally {
        setLoadingCatalog(false);
      }
    };
    loadCatalog();
  }, [initialCustomerId]);

  const handleAddLine = () => {
    if (catalog.products.length === 0) return;
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

  const handleQuantityChange = (idx, qty) => {
    const val = Math.max(1, parseInt(qty, 10) || 1);
    const newLines = [...lines];
    newLines[idx] = { ...newLines[idx], quantity: val };
    setLines(newLines);
  };

  const selectedPlan = catalog.plans.find((p) => p.id === planId);
  const planPrice = Number(selectedPlan?.price || 0);
  const linesSubtotal = lines.reduce((acc, l) => acc + l.quantity * l.unit_price, 0);
  const grandTotal = planPrice + linesSubtotal;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerId) {
      toast.error('Please select a customer');
      return;
    }
    if (!planId) {
      toast.error('Please select a plan');
      return;
    }

    try {
      setSaving(true);
      const sub = await staffService.createSubscription({
        customer_id: customerId,
        plan_id: planId,
        start_date: startDate,
        expiry_date: expiryDate,
        payment_term_id: paymentTermId || null,
        notes,
        lines,
      });

      toast.success(`Subscription ${sub.number || ''} created successfully!`);
      navigate(`/staff/subscriptions/${sub.id}`);
    } catch (err) {
      console.error('Error creating subscription:', err);
      toast.error(err.message || 'Failed to create subscription');
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
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/staff/subscriptions')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Subscriptions
        </button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Create Subscription
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Directly onboard an active customer subscription with configured billing cadence.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-slate-200/80">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-800">
              1. Customer & Plan Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Customer *</label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white"
                required
              >
                <option value="">-- Choose Customer --</option>
                {catalog.customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.company || c.email})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Plan *</label>
              <select
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white"
                required
              >
                {catalog.plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {formatCurrency(p.price)} / {p.billing_period}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Expiry Date</label>
              <Input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Payment Terms</label>
              <select
                value={paymentTermId}
                onChange={(e) => setPaymentTermId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white"
              >
                {catalog.paymentTerms.map((pt) => (
                  <option key={pt.id} value={pt.id}>{pt.name} ({pt.days} days)</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Lines */}
        <Card className="border-slate-200/80">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-800">
              2. Products & Services Included
            </CardTitle>
            <Button
              type="button"
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
                Only base plan is included. Click &ldquo;Add Item&rdquo; to add product licenses or services.
              </div>
            ) : (
              lines.map((line, idx) => (
                <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                  <div className="flex-1">
                    <select
                      value={line.product_id}
                      onChange={(e) => handleProductChange(idx, e.target.value)}
                      className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-800 bg-white"
                    >
                      {catalog.products.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-20">
                    <input
                      type="number"
                      min="1"
                      value={line.quantity}
                      onChange={(e) => handleQuantityChange(idx, e.target.value)}
                      className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs text-center"
                    />
                  </div>
                  <div className="w-24 text-right font-semibold text-xs text-slate-800">
                    {formatCurrency(line.quantity * line.unit_price)}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveLine(idx)}
                    className="p-1 text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}

            <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
              <span className="text-slate-600">Calculated Total per billing cycle:</span>
              <span className="text-base font-bold text-indigo-600">{formatCurrency(grandTotal)}</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/staff/subscriptions')}
          >
            Cancel
          </Button>
          <Button type="submit" isLoading={saving} leftIcon={<CheckCircle2 className="w-4 h-4" />}>
            Create Subscription
          </Button>
        </div>
      </form>
    </div>
  );
}

