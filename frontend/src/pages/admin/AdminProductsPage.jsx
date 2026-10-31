import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { ResourceManager } from '../../features/admin/catalog/ResourceManager';
import { productsConfig } from '../../features/admin/catalog/resources';

export function AdminProductsPage() {
  const { role } = useAuth();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Products</h1>
        <p className="text-sm text-slate-500 mt-1">Define what you sell: name, type, sales and cost price, tax, and variants such as brands that add to the price.</p>
      </div>
      <ResourceManager config={productsConfig} canEdit={role === 'admin'} />
    </div>
  );
}
