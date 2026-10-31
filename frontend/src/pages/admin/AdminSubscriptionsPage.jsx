import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Repeat } from 'lucide-react';
import { toast } from 'sonner';
import { billingService } from '../../services/billingService';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { SelectField } from '../../features/admin/catalog/FormControls';
import { formatShortDate } from '../../utils/formatters';
import { ErrorBox, FilterChips, PageHeader, Pager, SearchBox, SubStatusBadge, useBase, useDebounced } from '../../features/admin/billing/shared';

const STATUSES = [['all', 'All'], ['draft', 'Draft'], ['quotation', 'Quotation'], ['confirmed', 'Confirmed'], ['active', 'Active'], ['paused', 'Paused'], ['closed', 'Closed']];

function NewSubscriptionModal({ isOpen, onClose, onCreated }) {
  const [templates, setTemplates] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [templateId, setTemplateId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    billingService.templateOptions().then(setTemplates).catch((e) => setError(e.message));
    billingService.customerOptions().then(setCustomers).catch((e) => setError(e.message));
  }, [isOpen]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!templateId || !customerId) {
      setError('Choose a template and a customer.');
      return;
    }
    setSaving(true);
    try {
      const sub = await billingService.createFromTemplate({ templateId, customerId, startDate });
      toast.success(`Subscription ${sub.number} created as a draft`);
      onCreated(sub);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New subscription" description="Starts a draft from a quotation template. The plan, payment term and lines are copied at current prices.">
      <form onSubmit={submit} className="space-y-4">
        {error && <p className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">{error}</p>}
        <SelectField label="Quotation template" required value={templateId} onChange={setTemplateId} options={templates.map((t) => ({ value: t.id, label: t.name }))} />
        <SelectField label="Customer" required value={customerId} onChange={setCustomerId} options={customers.map((c) => ({ value: c.id, label: `${c.name} (${c.email})` }))} />
        <Input label="Start date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} helperText="Expiry defaults to one year after the start." />
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={saving}>
            Create draft
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function AdminSubscriptionsPage() {
  const base = useBase();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const debounced = useDebounced(search);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await billingService.listSubscriptions({ search: debounced, status, page });
      setRows(res.rows);
      setTotal(res.total);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [debounced, status, page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscriptions"
        description="Quote, confirm and activate subscriptions, and manage them through their lifecycle."
        actions={
          <Button onClick={() => setShowNew(true)} leftIcon={<Plus className="w-4 h-4" />}>
            New subscription
          </Button>
        }
      />

      <div className="flex flex-col gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Search by subscription number, e.g. SUB-00012" />
        <FilterChips value={status} onChange={(v) => { setStatus(v); setPage(0); }} options={STATUSES} />
      </div>

      {error && <ErrorBox message={error} onRetry={load} />}
      {loading && !rows.length && <Skeleton className="h-40 w-full" />}
      {!loading && !error && rows.length === 0 && (
        <EmptyState icon={Repeat} title="No subscriptions found" description="Create one from a quotation template to get started." actionLabel="New subscription" onAction={() => setShowNew(true)} actionIcon={<Plus className="w-4 h-4" />} />
      )}

      {rows.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Next billing</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((s) => (
                <TableRow key={s.id} className="cursor-pointer" onClick={() => navigate(`${base}/subscriptions/${s.id}`)}>
                  <TableCell className="font-medium text-indigo-700">{s.number}</TableCell>
                  <TableCell>
                    <div className="font-medium text-slate-900">{s.customer?.name ?? '—'}</div>
                    <div className="text-xs text-slate-500">{s.customer?.email}</div>
                  </TableCell>
                  <TableCell>{s.plan?.name ?? '—'}</TableCell>
                  <TableCell>
                    <SubStatusBadge status={s.status} />
                  </TableCell>
                  <TableCell>{formatShortDate(s.start_date)}</TableCell>
                  <TableCell>{formatShortDate(s.expiry_date)}</TableCell>
                  <TableCell>{s.status === 'active' ? formatShortDate(s.next_billing_date) : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pager page={page} total={total} onPage={setPage} loading={loading} />
        </>
      )}

      <NewSubscriptionModal
        isOpen={showNew}
        onClose={() => setShowNew(false)}
        onCreated={(sub) => {
          setShowNew(false);
          navigate(`${base}/subscriptions/${sub.id}`);
        }}
      />
    </div>
  );
}
