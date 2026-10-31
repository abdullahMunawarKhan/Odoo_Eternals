import React, { useState, useEffect } from 'react';
import { User, Mail, Building, Phone, Calendar, Save, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/authService';
import { customerService } from '../../services/customerService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { formatDate } from '../../utils/formatters';

export function CustomerSettings() {
  const { user, profile, refreshProfile } = useAuth();

  const [formData, setFormData] = useState({
    fullName: profile?.full_name || '',
    companyName: '',
    phone: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function loadData() {
      if (user?.id) {
        try {
          const cust = await customerService.getCustomerDetails(user.id);
          setFormData({
            fullName: profile?.full_name || '',
            companyName: cust?.company_name || '',
            phone: cust?.phone || '',
          });
        } catch (err) {
          console.error('Error fetching customer details:', err);
        } finally {
          setIsFetching(false);
        }
      }
    }
    loadData();
  }, [user?.id, profile?.full_name]);

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
      await authService.updateProfile(user.id, {
        fullName: formData.fullName.trim(),
      });

      // 2. Update customer company_name & phone
      await customerService.updateCustomerDetails(user.id, {
        companyName: formData.companyName,
        phone: formData.phone,
      });

      await refreshProfile();
      toast.success('Your account details have been updated successfully.');
    } catch (err) {
      console.error('Save customer settings error:', err);
      const msg = err.message || 'Failed to update account settings.';
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
          Account Settings
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Update your contact information, company name, and review your registration timestamp.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile & Company Information</CardTitle>
          <CardDescription>
            These details are used for your invoices and subscription statements
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
              label="Email Address"
              value={user?.email || ''}
              disabled
              leftIcon={<Mail className="w-4 h-4" />}
              helperText="Your login email cannot be changed here. Contact support if you need an email change."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Company / Organization"
                name="companyName"
                placeholder="e.g. Acme Corp"
                value={formData.companyName}
                onChange={handleChange}
                leftIcon={<Building className="w-4 h-4" />}
              />

              <Input
                label="Phone Number"
                name="phone"
                type="tel"
                placeholder="+1 555-0100"
                value={formData.phone}
                onChange={handleChange}
                leftIcon={<Phone className="w-4 h-4" />}
              />
            </div>

            <div className="pt-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Account Registration Date
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
                Save Settings
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

