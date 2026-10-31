import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { ResourceManager } from '../../features/admin/catalog/ResourceManager';
import { plansConfig } from '../../features/admin/catalog/resources';

export function AdminPlansPage() {
  const { role } = useAuth();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Plans</h1>
        <p className="text-sm text-slate-500 mt-1">Set what a plan costs, how often it bills, its minimum quantity, availability dates, and which actions (auto-close, close early, pause, renew) it allows.</p>
      </div>
      <ResourceManager config={plansConfig} canEdit={role === 'admin'} />
    </div>
  );
}
