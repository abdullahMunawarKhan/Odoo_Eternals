import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { ResourceManager } from '../../features/admin/catalog/ResourceManager';
import { taxesConfig, paymentTermsConfig } from '../../features/admin/catalog/resources';

export function AdminTaxesPage() {
  const { role } = useAuth();
  const canEdit = role === 'admin';
  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Taxes</h1>
          <p className="text-sm text-slate-500 mt-1">Tax rules are calculated automatically on every invoice line.</p>
        </div>
        <ResourceManager config={taxesConfig} canEdit={canEdit} />
      </section>
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Payment terms</h2>
          <p className="text-sm text-slate-500 mt-1">How long customers have to pay an invoice.</p>
        </div>
        <ResourceManager config={paymentTermsConfig} canEdit={canEdit} />
      </section>
    </div>
  );
}
