import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, LogIn, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await login({ email, password });
      toast.success('Signed in successfully!');

      // Check role and redirect
      const userRole = result?.profile?.role;
      const targetFromState = location.state?.from?.pathname;

      if (targetFromState && !targetFromState.startsWith('/login')) {
        navigate(targetFromState, { replace: true });
      } else {
        switch (userRole) {
          case 'admin':
            navigate('/admin', { replace: true });
            break;
          case 'staff':
            navigate('/staff', { replace: true });
            break;
          case 'customer':
          default:
            navigate('/customer', { replace: true });
            break;
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      const msg = err.message || 'Invalid email or password.';
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
          Sign in to your account
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Access your subscription dashboard and manage services
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 flex items-start gap-2.5 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email address"
          type="email"
          placeholder="name@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leftIcon={<Mail className="w-4 h-4" />}
          autoComplete="email"
          required
        />

        <div>
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock className="w-4 h-4" />}
            autoComplete="current-password"
            required
          />
          <div className="flex justify-end mt-1.5">
            <Link
              to="/forgot-password"
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full"
          size="lg"
          isLoading={isLoading}
          leftIcon={<LogIn className="w-4 h-4" />}
        >
          Sign In
        </Button>
      </form>

      <div className="pt-2 text-center border-t border-slate-100">
        <p className="text-xs text-slate-500">
          Don't have an account yet?{' '}
          <Link
            to="/register"
            className="text-indigo-600 hover:text-indigo-700 font-semibold hover:underline"
          >
            Create Customer Account
          </Link>
        </p>
      </div>
    </div>
  );
}

