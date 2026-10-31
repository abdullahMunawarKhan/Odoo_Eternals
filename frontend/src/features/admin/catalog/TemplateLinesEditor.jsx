import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { catalogService } from '../../../services/catalogService';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { SelectField } from './FormControls';

// Product lines of a quotation template (SPEC 3.2). A variant, when chosen, must belong to
// the line's product; the database enforces it too.
export function TemplateLinesEditor({ row: template, canEdit }) {
  const [lines, setLines] = useState([]);
  const [products, setProducts] = useState([]);
  const [variants, setVariants] = useState([]);
  const [productId, setProductId] = useState('');
  const [variantId, setVariantId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setLines(
        await catalogService.children(
          'quotation_template_lines',
          'template_id',
          template.id,
          'id, quantity, product:products(name), variant:product_variants(attribute_name, value)'
        )
      );
    } catch (err) {
      setError(err.message);
    }
  }, [template.id]);

  useEffect(() => {
    load();
    catalogService.options('products').then(setProducts).catch(() => {});
  }, [load]);

  useEffect(() => {
    setVariantId('');
    if (!productId) {
      setVariants([]);
      return;
    }
    catalogService
      .children('product_variants', 'product_id', productId, 'id, attribute_name, value')
      .then(setVariants)
      .catch(() => setVariants([]));
  }, [productId]);

  const add = async () => {
    setError('');
    if (!productId) {
      setError('Choose a product.');
      return;
    }
    setSaving(true);
    try {
      await catalogService.create('quotation_template_lines', {
        template_id: template.id,
        product_id: productId,
        variant_id: variantId || null,
        quantity: Number(quantity) || 1,
      });
      setProductId('');
      setQuantity('1');
      toast.success('Line added');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (line) => {
    try {
      await catalogService.remove('quotation_template_lines', line.id);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-800">Template lines</h3>
        <p className="text-xs text-slate-500">Copied into every subscription created from this template, at current prices.</p>
      </div>

      {lines.length === 0 ? (
        <p className="text-xs text-slate-400">No lines yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100 text-sm">
          {lines.map((l) => (
            <li key={l.id} className="flex items-center justify-between py-2 gap-3">
              <span className="text-slate-800">
                {l.product?.name ?? 'Product'}
                {l.variant && <span className="text-slate-500"> ({l.variant.value})</span>}
              </span>
              <span className="text-xs text-slate-500 ml-auto">Qty {l.quantity}</span>
              {canEdit && (
                <button type="button" onClick={() => remove(l)} className="text-slate-400 hover:text-rose-600" aria-label="Remove line">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <div className="grid grid-cols-1 sm:grid-cols-[2fr_1.5fr_1fr_auto] gap-3 items-end">
          <SelectField label="Product" value={productId} onChange={setProductId} options={products.map((p) => ({ value: p.id, label: p.name }))} />
          <SelectField
            label="Variant"
            value={variantId}
            onChange={setVariantId}
            placeholder={variants.length ? 'No variant' : 'None available'}
            options={variants.map((v) => ({ value: v.id, label: `${v.attribute_name}: ${v.value}` }))}
            disabled={!variants.length}
          />
          <Input label="Quantity" type="number" min="1" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} id="line-quantity" />
          <Button onClick={add} isLoading={saving} leftIcon={<Plus className="w-4 h-4" />}>
            Add
          </Button>
        </div>
      )}
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
