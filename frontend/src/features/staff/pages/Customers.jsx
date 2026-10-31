import React, { useState, useEffect } from 'react';
import { Plus, Search, Building2, UserPlus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { staffService } from '../../../services/staffService';
import { CustomerTable } from '../components/CustomerTable';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';

export function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
  });

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const res = await staffService.getCustomers({ search, page, limit: 10 });
      setCustomers(res.data);
      setTotalPages(res.totalPages);
      setTotalCount(res.count);
    } catch (err) {
      console.error('Error fetching customers:', err);
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [page, search]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadCustomers();
  };

  const handleOpenAddModal = () => {
    setFormData({ name: '', email: '', phone: '', company: '', address: '' });
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (cust) => {
    setEditingCustomer(cust);
    setFormData({
      name: cust.name || '',
      email: cust.email || '',
      phone: cust.phone || '',
      company: cust.company || '',
      address: cust.address || '',
    });
    setIsEditModalOpen(true);
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error('Customer name and email are required');
      return;
    }

    try {
      setSaving(true);
      await staffService.createCustomer(formData);
      toast.success('Customer created successfully');
      setIsAddModalOpen(false);
      loadCustomers();
    } catch (err) {
      console.error('Error creating customer:', err);
      toast.error(err.message || 'Failed to create customer');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCustomer = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Customer name is required');
      return;
    }

    try {
      setSaving(true);
      await staffService.updateCustomer(editingCustomer.id, formData);
      toast.success('Customer updated successfully');
      setIsEditModalOpen(false);
      loadCustomers();
    } catch (err) {
      console.error('Error updating customer:', err);
      toast.error(err.message || 'Failed to update customer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Customer Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage customer accounts, update contact information, and review account histories.
          </p>
        </div>

        <Button
          onClick={handleOpenAddModal}
          leftIcon={<UserPlus className="w-4 h-4" />}
        >
          Add Customer
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Input
            placeholder="Search by name, email, or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
          />
        </form>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Total: <strong>{totalCount}</strong> customers</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={loadCustomers}
            title="Refresh"
            className="p-1.5 h-8 text-slate-500"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Customer Table */}
      <CustomerTable
        customers={customers}
        onEdit={handleOpenEditModal}
        isLoading={loading}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 pt-2">
          <div className="text-xs text-slate-500">
            Page {page} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Customer"
        description="Create a client profile for quotations and subscription onboarding."
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4 pt-2">
          <Input
            label="Full Name *"
            placeholder="e.g. Acme Corporation or Jane Doe"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <Input
            label="Email Address *"
            type="email"
            placeholder="client@example.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />

          <Input
            label="Phone Number"
            placeholder="+1 (555) 000-0000"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />

          <Input
            label="Company Name"
            placeholder="Acme Technologies Inc."
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Billing Address
            </label>
            <textarea
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              placeholder="123 Business Way, Suite 400, City, Country"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={saving}>
              Save Customer
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Customer Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Customer Information"
        description="Update contact and billing details for this account."
      >
        <form onSubmit={handleUpdateCustomer} className="space-y-4 pt-2">
          <Input
            label="Full Name *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <Input
            label="Email Address (Locked)"
            type="email"
            value={formData.email}
            disabled
          />

          <Input
            label="Phone Number"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />

          <Input
            label="Company Name"
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Billing Address
            </label>
            <textarea
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={saving}>
              Update Customer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

