import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, KeyRound, Check, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '../../services/authService';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { validatePassword } from '../../utils/validators';

export function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showRules, setShowRules] = useState(false);

  const { refreshProfile } = useAuth();
  const navigate = useNavigate();

  const passwordValidation = validatePassword(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!passwordValidation.isValid) {
      setErrorMessage(passwordValidation.errors[0] || 'Password does not meet the security requirements.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      await authService.resetPassword({ newPassword: password });
      toast.success('Your password has been updated successfully!');

      // Fetch fresh profile to redirect appropriately
      const prof = await refreshProfile();
      const role = prof?.role;

      if (role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (role === 'staff') {
        navigate('/staff', { replace: true });
      } else {
        navigate('/customer', { replace: true });
      }
    } catch (err) {
      console.error('Password reset error:', err);
      const msg = err.message || 'Failed to update password. Your reset link may have expired.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          Set New Password
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Choose a strong password to protect your account
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 flex items-start gap-2.5 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
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

          {(showRules || password.length > 0) && (
            <div className="mt-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1.5 animate-in fade-in">
              <p className="font-semibold text-slate-700 text-[11px] uppercase tracking-wider">
                Password Security Checklist
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
                <div
                  className={`flex items-center gap-1.5 ${
                    passwordValidation.rules.minLength ? 'text-emerald-700 font-medium' : 'text-slate-500'
                  }`}
                >
                  {passwordValidation.rules.minLength ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  )}
                  <span>Longer than 8 chars (9+)</span>
                </div>
                <div
                  className={`flex items-center gap-1.5 ${
                    passwordValidation.rules.uppercase ? 'text-emerald-700 font-medium' : 'text-slate-500'
                  }`}
                >
                  {passwordValidation.rules.uppercase ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  )}
                  <span>Uppercase letter (A-Z)</span>
                </div>
                <div
                  className={`flex items-center gap-1.5 ${
                    passwordValidation.rules.lowercase ? 'text-emerald-700 font-medium' : 'text-slate-500'
                  }`}
                >
                  {passwordValidation.rules.lowercase ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  )}
                  <span>Lowercase letter (a-z)</span>
                </div>
                <div
                  className={`flex items-center gap-1.5 ${
                    passwordValidation.rules.specialChar ? 'text-emerald-700 font-medium' : 'text-slate-500'
                  }`}
                >
                  {passwordValidation.rules.specialChar ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  )}
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

        <Button
          type="submit"
          className="w-full"
          size="lg"
          isLoading={isLoading}
          leftIcon={<KeyRound className="w-4 h-4" />}
        >
          Update Password & Sign In
        </Button>
      </form>
    </div>
  );
}
