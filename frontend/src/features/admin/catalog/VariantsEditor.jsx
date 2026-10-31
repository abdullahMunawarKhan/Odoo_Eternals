import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { catalogService } from '../../../services/catalogService';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { formatMoney } from '../../../utils/money';

// Variants of one product (SPEC 3.2). Effective price = sales_price + extra_price and is
// computed by the database (effective_price), never in JS.
export function VariantsEditor({ row: product, canEdit }) {
  const [variants, setVariants] = useState([]);
  const [prices, setPrices] = useState({});
  const [attribute, setAttribute] = useState('Brand');
  const [value, setValue] = useState('');
  const [extra, setExtra] = useState('0');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const list = await catalogService.children('product_variants', 'product_id', product.id);
      setVariants(list);
      const entries = await Promise.all(
        list.map(async (v) => [v.id, await catalogService.effectivePrice(product.id, v.id).catch(() => null)])
      );
      setPrices(Object.fromEntries(entries));
    } catch (err) {
      setError(err.message);
    }
  }, [product.id]);

  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    setError('');
    if (!value.trim()) {
      setError('Enter a variant value, for example Odoo.');
      return;
    }
    setSaving(true);
    try {
      await catalogService.create('product_variants', {
        product_id: product.id,
        attribute_name: attribute.trim() || 'Brand',
        value: value.trim(),
        extra_price: extra === '' ? '0' : extra,
      });
      setValue('');
      setExtra('0');
      toast.success('Variant added');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (v) => {
    try {
      await catalogService.remove('product_variants', v.id);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-800">Variants</h3>
        <p className="text-xs text-slate-500">
          Choosing a variant adds its extra price to the product price, for example Brand: Odoo adds 560.
        </p>
      </div>

      {variants.length === 0 ? (
        <p className="text-xs text-slate-400">No variants yet. This product is sold at its base price.</p>
      ) : (
        <ul className="divide-y divide-slate-100 text-sm">
          {variants.map((v) => (
            <li key={v.id} className="flex items-center justify-between py-2 gap-3">
              <span className="text-slate-800">
                <span className="text-slate-400">{v.attribute_name}:</span> {v.value}
              </span>
              <span className="text-xs text-slate-500 ml-auto">+{formatMoney(v.extra_price)}</span>
              <span className="text-xs font-semibold text-slate-800 w-28 text-right">
                {prices[v.id] == null ? '—' : formatMoney(prices[v.id])}
              </span>
              {canEdit && (
                <button type="button" onClick={() => remove(v)} className="text-slate-400 hover:text-rose-600" aria-label={`Remove ${v.value}`}>
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </li>
          ))}
          <li className="pt-1 text-[11px] uppercase tracking-wider text-slate-400 text-right">Effective price shown on the right</li>
        </ul>
      )}

      {canEdit && (
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
          <Input label="Attribute" value={attribute} onChange={(e) => setAttribute(e.target.value)} id="variant-attribute" />
          <Input label="Value" placeholder="e.g. Odoo" value={value} onChange={(e) => setValue(e.target.value)} id="variant-value" />
          <Input label="Extra price" type="number" step="0.01" min="0" value={extra} onChange={(e) => setExtra(e.target.value)} id="variant-extra" />
          <Button size="md" onClick={add} isLoading={saving} leftIcon={<Plus className="w-4 h-4" />}>
            Add
          </Button>
        </div>
      )}
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
