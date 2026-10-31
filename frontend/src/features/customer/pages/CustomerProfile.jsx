import React, { useState, useEffect } from 'react';
import { User, Mail, Building, Phone, MapPin, Save, AlertCircle, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../../hooks/useAuth';
import { authService } from '../../../services/authService';
import { customerService } from '../../../services/customerService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { formatDate } from '../../../utils/formatters';

export function CustomerProfile() {
  const { user, profile, refreshProfile } = useAuth();

  const [formData, setFormData] = useState({
    fullName: profile?.full_name || '',
    company: '',
    phone: '',
    address: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function loadCustomer() {
      try {
        const cust = await customerService.getCurrentCustomer();
        if (cust) {
          setFormData({
            fullName: cust.name || profile?.full_name || '',
            company: cust.company || cust.company_name || '',
            phone: cust.phone || '',
            address: cust.address || '',
          });
        }
      } catch (err) {
        console.error('Error fetching customer profile:', err);
      } finally {
        setIsFetching(false);
      }
    }
    loadCustomer();
  }, [profile?.full_name]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.fullName.trim()) {
      setErrorMessage('Full name is required.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Update profile full_name
      if (user?.id) {
        await authService.updateProfile(user.id, {
          fullName: formData.fullName.trim(),
        });
      }

      // 2. Update customer record
      await customerService.updateCustomerProfile({
        name: formData.fullName.trim(),
        company: formData.company,
        phone: formData.phone,
        address: formData.address,
      });

      await refreshProfile();
      toast.success('Your profile details have been saved.');
    } catch (err) {
      console.error('Failed to update customer profile:', err);
      const msg = err.message || 'Failed to update profile.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          My Profile
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Maintain your personal information, company profile, and verified billing address.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile & Contact Information</CardTitle>
          <CardDescription>
            These details appear on your subscription quotations, tax invoices, and receipts.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {errorMessage && (
            <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 p-3 flex items-start gap-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <Input
              label="Full Name"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              leftIcon={<User className="w-4 h-4" />}
              required
            />

            <Input
              label="Registered Email"
              value={user?.email || ''}
              disabled
              leftIcon={<Mail className="w-4 h-4" />}
              helperText="Your login email cannot be changed directly for security reasons."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Company / Organization"
                name="company"
                placeholder="e.g. Acme Innovations"
                value={formData.company}
                onChange={handleChange}
                leftIcon={<Building className="w-4 h-4" />}
              />

              <Input
                label="Phone Number"
                name="phone"
                type="tel"
                placeholder="+1 555-0199"
                value={formData.phone}
                onChange={handleChange}
                leftIcon={<Phone className="w-4 h-4" />}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Billing Address
              </label>
              <div className="relative">
                <textarea
                  name="address"
                  rows={3}
                  placeholder="Enter full physical/billing address for invoice generation..."
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-colors"
                />
              </div>
              <p className="text-xs text-slate-500">
                Appears on all official PDF tax invoices.
              </p>
            </div>

            <div className="pt-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Member Since
              </label>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-700">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>{formatDate(profile?.created_at)}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <Button
                type="submit"
                isLoading={isLoading || isFetching}
                leftIcon={<Save className="w-4 h-4" />}
              >
                Save Profile
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

