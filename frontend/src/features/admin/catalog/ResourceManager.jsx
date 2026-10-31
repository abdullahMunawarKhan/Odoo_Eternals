import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, Pencil, Plus, RefreshCw, Search, Trash2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { catalogService, PAGE_SIZE } from '../../../services/catalogService';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SelectField, TextareaField, CheckboxField } from './FormControls';

// Build the request body from the form values. Money fields are sent as strings so no
// float ever touches an amount; hidden conditional fields are cleared.
function toPayload(fields, values) {
  const payload = {};
  for (const f of fields) {
    if (f.showWhen && !f.showWhen(values)) {
      payload[f.name] = null;
      continue;
    }
    const v = values[f.name];
    const empty = v === '' || v === null || v === undefined;
    if (f.type === 'checkbox') payload[f.name] = Boolean(v);
    else if (f.type === 'number') {
      if (empty) {
        if (f.nullable) payload[f.name] = null; // otherwise omitted so the database default applies
      } else payload[f.name] = f.money ? String(v).trim() : Number(v);
    } else if (f.type === 'select' || f.type === 'date') payload[f.name] = empty ? null : v;
    else payload[f.name] = empty || String(v).trim() === '' ? null : String(v).trim();
  }
  return payload;
}

function initialValues(config, row) {
  const values = {};
  for (const f of config.fields) {
    const source = row ? row[f.name] : config.defaults?.[f.name];
    values[f.name] = f.type === 'checkbox' ? Boolean(source) : source === null || source === undefined ? '' : String(source);
  }
  return values;
}

function ResourceForm({ config, lookups, row, onSaved, onClose, canEdit }) {
  const [values, setValues] = useState(() => initialValues(config, row));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (name, value) => setValues((prev) => ({ ...prev, [name]: value }));
  const Extras = row && config.Extras;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    for (const f of config.fields) {
      if (f.required && (!f.showWhen || f.showWhen(values)) && String(values[f.name] ?? '').trim() === '') {
        setError(`${f.label} is required.`);
        return;
      }
    }
    setSaving(true);
    try {
      const payload = toPayload(config.fields, values);
      const saved = row
        ? await catalogService.update(config.table, row.id, payload)
        : await catalogService.create(config.table, payload);
      toast.success(`${config.singular} ${row ? 'updated' : 'created'}`);
      onSaved(saved, { created: !row });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 flex items-start gap-2.5 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {config.fields.map((f) => {
            if (f.showWhen && !f.showWhen(values)) return null;
            const span = f.type === 'textarea' || f.type === 'checkbox' ? 'sm:col-span-2' : '';
            const common = { label: f.label, required: f.required, helperText: f.helperText, className: span };
            if (f.type === 'select') {
              const options = f.options ?? (lookups[f.lookup] ?? []).map((o) => ({ value: o.id, label: o.name }));
              return <SelectField key={f.name} {...common} value={values[f.name]} onChange={(v) => set(f.name, v)} options={options} disabled={!canEdit} placeholder={f.placeholder} />;
            }
            if (f.type === 'textarea') {
              return <TextareaField key={f.name} {...common} value={values[f.name]} onChange={(v) => set(f.name, v)} disabled={!canEdit} />;
            }
            if (f.type === 'checkbox') {
              return <CheckboxField key={f.name} label={f.label} description={f.helperText} checked={values[f.name]} onChange={(v) => set(f.name, v)} disabled={!canEdit} />;
            }
            return (
              <Input
                key={f.name}
                label={f.label}
                required={f.required}
                helperText={f.helperText}
                className={span}
                type={f.type === 'number' ? 'number' : f.type}
                step={f.money ? '0.01' : f.step}
                min={f.min}
                max={f.max}
                placeholder={f.placeholder}
                value={values[f.name]}
                onChange={(e) => set(f.name, e.target.value)}
                disabled={!canEdit}
              />
            );
          })}
        </div>

        {Extras && <Extras row={row} canEdit={canEdit} />}
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
        <Button variant="outline" onClick={onClose}>
          {canEdit ? 'Cancel' : 'Close'}
        </Button>
        {canEdit && (
          <Button type="submit" isLoading={saving}>
            {row ? 'Save changes' : `Create ${config.singular.toLowerCase()}`}
          </Button>
        )}
      </div>
    </form>
  );
}

export function ResourceManager({ config, canEdit = true }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lookups, setLookups] = useState({});
  const [modal, setModal] = useState(null); // { row } (row null = create)

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let alive = true;
    Promise.all(
      Object.entries(config.lookups ?? {}).map(([key, l]) =>
        catalogService.options(l.table, l.columns).then((data) => [key, data])
      )
    )
      .then((pairs) => alive && setLookups(Object.fromEntries(pairs)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [config]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { rows: data, total: count } = await catalogService.list({
        table: config.table,
        select: config.select,
        search: debounced,
        searchColumn: config.searchColumn,
        page,
        orderBy: config.orderBy,
        ascending: config.ascending,
      });
      setRows(data);
      setTotal(count);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [config, debounced, page]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (row) => {
    if (!window.confirm(`Delete this ${config.singular.toLowerCase()}? This cannot be undone.`)) return;
    try {
      await catalogService.remove(config.table, row.id);
      toast.success(`${config.singular} deleted`);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const onSaved = (saved, { created }) => {
    load();
    // keep the editor open after creating so variants / lines can be added right away
    if (created && config.Extras) {
      catalogService
        .list({ table: config.table, select: config.select, search: '', page: 0, orderBy: 'created_at', ascending: false })
        .then(({ rows: fresh }) => setModal({ row: fresh.find((r) => r.id === saved.id) ?? saved }))
        .catch(() => setModal({ row: saved }));
    } else {
      setModal(null);
    }
  };

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={`Search ${config.title.toLowerCase()} by name...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
          />
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button variant="outline" size="sm" onClick={load} isLoading={loading} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            Refresh
          </Button>
          {canEdit ? (
            <Button size="sm" onClick={() => setModal({ row: null })} leftIcon={<Plus className="w-3.5 h-3.5" />}>
              New {config.singular.toLowerCase()}
            </Button>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <Lock className="w-3.5 h-3.5" /> Read only
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 flex items-start justify-between gap-3 text-sm text-rose-800">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Failed to load {config.title.toLowerCase()}</p>
              <p className="text-xs text-rose-700 mt-0.5">{error}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={load}>
            Retry
          </Button>
        </div>
      )}

      {loading && !rows.length && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <EmptyState
          icon={config.icon}
          title={debounced ? `No ${config.title.toLowerCase()} match "${debounced}"` : `No ${config.title.toLowerCase()} yet`}
          description={debounced ? 'Try a different search term.' : config.emptyText}
          actionLabel={canEdit && !debounced ? `New ${config.singular.toLowerCase()}` : undefined}
          onAction={() => setModal({ row: null })}
          actionIcon={<Plus className="w-4 h-4" />}
        />
      )}

      {rows.length > 0 && !error && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                {config.columns.map((c) => (
                  <TableHead key={c.label} className={c.className}>
                    {c.label}
                  </TableHead>
                ))}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  {config.columns.map((c) => (
                    <TableCell key={c.label} className={c.className}>
                      {c.render ? c.render(row) : (row[c.key] ?? '—')}
                    </TableCell>
                  ))}
                  <TableCell className="text-right whitespace-nowrap">
                    <Button variant="ghost" size="sm" onClick={() => setModal({ row })} leftIcon={canEdit ? <Pencil className="w-3.5 h-3.5" /> : null}>
                      {canEdit ? 'Edit' : 'View'}
                    </Button>
                    {canEdit && (
                      <Button variant="ghost" size="sm" className="text-rose-600 hover:bg-rose-50" onClick={() => remove(row)} leftIcon={<Trash2 className="w-3.5 h-3.5" />}>
                        Delete
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              {total} {total === 1 ? 'record' : 'records'}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 0 || loading} onClick={() => setPage((p) => p - 1)} leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}>
                Prev
              </Button>
              <span>
                Page {page + 1} of {pages}
              </span>
              <Button variant="outline" size="sm" disabled={page + 1 >= pages || loading} onClick={() => setPage((p) => p + 1)} rightIcon={<ChevronRight className="w-3.5 h-3.5" />}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      <Modal
        isOpen={Boolean(modal)}
        onClose={() => setModal(null)}
        title={modal?.row ? `${canEdit ? 'Edit' : 'View'} ${config.singular.toLowerCase()}` : `New ${config.singular.toLowerCase()}`}
        description={config.formHint}
        maxWidth="max-w-2xl"
      >
        {modal && (
          <ResourceForm
            key={modal.row?.id ?? 'new'}
            config={config}
            lookups={lookups}
            row={modal.row}
            canEdit={canEdit}
            onSaved={onSaved}
            onClose={() => setModal(null)}
          />
        )}
      </Modal>
    </div>
  );
}
