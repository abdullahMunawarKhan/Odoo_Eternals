import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { ResourceManager } from '../../features/admin/catalog/ResourceManager';
import { templatesConfig } from '../../features/admin/catalog/resources';

export function AdminTemplatesPage() {
  const { role } = useAuth();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Quotation templates</h1>
        <p className="text-sm text-slate-500 mt-1">Reusable offers with the right plan, payment term and product lines, valid for a set number of days.</p>
      </div>
      <ResourceManager config={templatesConfig} canEdit={role === 'admin'} />
    </div>
  );
}
