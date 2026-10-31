import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Building, Phone, UserPlus, Check, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { validatePassword, validateEmail } from '../../utils/validators';

export function RegisterForm() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    companyName: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showRules, setShowRules] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const passwordValidation = validatePassword(formData.password);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.fullName.trim()) {
      setErrorMessage('Full name is required.');
      return;
    }

    if (!validateEmail(formData.email)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!passwordValidation.isValid) {
      setErrorMessage(passwordValidation.errors[0] || 'Password does not meet the security requirements.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      await register({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        companyName: formData.companyName,
        phone: formData.phone,
      });

      toast.success('Registration successful! Welcome to SubFlow.');
      // Public registrations are always customers
      navigate('/customer', { replace: true });
    } catch (err) {
      console.error('Registration error:', err);
      const msg = err.message || 'Failed to create customer account.';
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
          Create Customer Account
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Subscribe to products, manage plans and view invoices
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 flex items-start gap-2.5 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <Input
          label="Full Name"
          name="fullName"
          placeholder="Jane Doe"
          value={formData.fullName}
          onChange={handleChange}
          leftIcon={<User className="w-4 h-4" />}
          required
        />

        <Input
          label="Work Email"
          name="email"
          type="email"
          placeholder="jane@company.com"
          value={formData.email}
          onChange={handleChange}
          leftIcon={<Mail className="w-4 h-4" />}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Company Name"
            name="companyName"
            placeholder="Acme Inc."
            value={formData.companyName}
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

        <div>
          <Input
            label="Password"
            name="password"
            type="password"
            placeholder="Create secure password"
            value={formData.password}
            onChange={handleChange}
            onFocus={() => setShowRules(true)}
            leftIcon={<Lock className="w-4 h-4" />}
            required
          />

          {/* Password requirement indicators */}
          {(showRules || formData.password.length > 0) && (
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
          label="Confirm Password"
          name="confirmPassword"
          type="password"
          placeholder="Repeat password"
          value={formData.confirmPassword}
          onChange={handleChange}
          leftIcon={<Lock className="w-4 h-4" />}
          error={
            formData.confirmPassword && formData.password !== formData.confirmPassword
              ? 'Passwords do not match'
              : undefined
          }
          required
        />

        <div className="pt-2">
          <Button
            type="submit"
            className="w-full"
            size="lg"
            isLoading={isLoading}
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            Create Customer Account
          </Button>
        </div>
      </form>

      <div className="pt-2 text-center border-t border-slate-100">
        <p className="text-xs text-slate-500">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-indigo-600 hover:text-indigo-700 font-semibold hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

