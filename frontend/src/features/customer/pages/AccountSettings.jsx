import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, KeyRound, Mail, LogOut, Check, X, AlertCircle, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../../hooks/useAuth';
import { authService } from '../../../services/authService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { validatePassword } from '../../../utils/validators';

export function AccountSettings() {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();

  // Change password states
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showRules, setShowRules] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Email reset state
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);

  const passwordValidation = validatePassword(password);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (!passwordValidation.isValid) {
      setPasswordError(passwordValidation.errors[0] || 'Password does not meet security requirements.');
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await authService.resetPassword({ newPassword: password });
      toast.success('Your password has been changed successfully.');
      setPassword('');
      setConfirmPassword('');
      setShowRules(false);
    } catch (err) {
      console.error('Password change error:', err);
      setPasswordError(err.message || 'Failed to update password.');
      toast.error(err.message || 'Failed to change password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSendResetEmail = async () => {
    if (!user?.email) return;
    setIsSendingResetEmail(true);
    try {
      await authService.forgotPassword({ email: user.email });
      toast.success(`Password recovery link dispatched to ${user.email}`);
    } catch (err) {
      console.error('Reset email error:', err);
      toast.error(err.message || 'Failed to send recovery email.');
    } finally {
      setIsSendingResetEmail(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Account Settings
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your credentials, password security, and account sessions.
        </p>
      </div>

      {/* Change Password Card */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Update your account password with enterprise security standards
          </CardDescription>
        </CardHeader>

        <CardContent>
          {passwordError && (
            <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 p-3 flex items-start gap-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <Input
                label="New Password"
                type="password"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setShowRules(true)}
                leftIcon={<Lock className="w-4 h-4" />}
                required
              />

              {/* Password Checklist */}
              {(showRules || password.length > 0) && (
                <div className="mt-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1.5 animate-in fade-in">
                  <p className="font-semibold text-slate-700 text-[11px] uppercase tracking-wider">
                    Password Security Checklist
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
                    <div className={`flex items-center gap-1.5 ${passwordValidation.rules.minLength ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                      {passwordValidation.rules.minLength ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <X className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                      <span>Longer than 8 chars (9+)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordValidation.rules.uppercase ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                      {passwordValidation.rules.uppercase ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <X className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                      <span>Uppercase letter (A-Z)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordValidation.rules.lowercase ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                      {passwordValidation.rules.lowercase ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <X className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                      <span>Lowercase letter (a-z)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordValidation.rules.specialChar ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                      {passwordValidation.rules.specialChar ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <X className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                      <span>Special character (!@#$)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Input
              label="Confirm New Password"
              type="password"
              placeholder="Repeat new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
              error={
                confirmPassword && password !== confirmPassword
                  ? 'Passwords do not match'
                  : undefined
              }
              required
            />

            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                isLoading={isChangingPassword}
                leftIcon={<KeyRound className="w-4 h-4" />}
              >
                Update Password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Alternative Reset Link */}
      <Card>
        <CardHeader>
          <CardTitle>Email Password Reset</CardTitle>
          <CardDescription>
            Dispatch a secure password recovery link to your registered address ({user?.email})
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <p className="text-xs text-slate-500 max-w-md">
            Clicking this will send an email containing a one-time login recovery link.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSendResetEmail}
            isLoading={isSendingResetEmail}
            leftIcon={<Mail className="w-3.5 h-3.5" />}
          >
            Send Reset Link
          </Button>
        </CardContent>
      </Card>

      {/* Account Session & Logout */}
      <Card className="border-rose-200/80 bg-rose-50/20">
        <CardHeader>
          <CardTitle className="text-rose-900 text-base">Sign Out of Session</CardTitle>
          <CardDescription className="text-rose-700/80">
            End your authenticated session on this browser
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Role: <span className="font-semibold uppercase text-slate-700">{profile?.role || 'Customer'}</span>
          </span>
          <Button
            variant="danger"
            size="sm"
            onClick={handleLogout}
            leftIcon={<LogOut className="w-4 h-4" />}
          >
            Sign Out Now
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

