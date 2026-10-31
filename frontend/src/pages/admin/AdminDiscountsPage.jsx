import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { ResourceManager } from '../../features/admin/catalog/ResourceManager';
import { discountsConfig } from '../../features/admin/catalog/resources';

export function AdminDiscountsPage() {
  const { role } = useAuth();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Discounts</h1>
        <p className="text-sm text-slate-500 mt-1">Only admins create discount rules: fixed or percentage, minimums, dates and a usage limit. They apply to invoices automatically.</p>
      </div>
      <ResourceManager config={discountsConfig} canEdit={role === 'admin'} />
    </div>
  );
}
