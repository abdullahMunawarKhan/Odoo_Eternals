import React, { useState } from 'react';
import { User, Mail, Shield, Save, AlertCircle, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/authService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { formatDate } from '../../utils/formatters';

export function StaffProfile() {
  const { profile, user, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleUpdate = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!fullName.trim()) {
      setErrorMessage('Full name cannot be blank.');
      return;
    }

    setIsLoading(true);

    try {
      await authService.updateProfile(user.id, { fullName: fullName.trim() });
      await refreshProfile();
      toast.success('Your profile has been updated.');
    } catch (err) {
      console.error('Update profile error:', err);
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
          Staff Profile
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your personal details and account preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Details</CardTitle>
          <CardDescription>
            Update your display name visible across company records
          </CardDescription>
        </CardHeader>

        <CardContent>
          {errorMessage && (
            <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 p-3 flex items-start gap-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleUpdate} className="space-y-4">
            <Input
              label="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              leftIcon={<User className="w-4 h-4" />}
              required
            />

            <Input
              label="Registered Email"
              value={user?.email || ''}
              disabled
              leftIcon={<Mail className="w-4 h-4" />}
              helperText="Email address is managed by your system administrator."
            />

            <div className="pt-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Assigned Role
              </label>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
                <Shield className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-semibold text-slate-800 capitalize">
                  {profile?.role || 'Staff'}
                </span>
                <span className="text-xs text-slate-400 ml-auto">
                  Controlled by Administrator RLS
                </span>
              </div>
            </div>

            <div className="pt-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Account Creation Date
              </label>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-700">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>{formatDate(profile?.created_at)}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <Button
                type="submit"
                isLoading={isLoading}
                leftIcon={<Save className="w-4 h-4" />}
              >
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
