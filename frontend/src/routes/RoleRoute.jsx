import React from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export function RoleRoute({ allowedRoles = [], children }) {
  const { role, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-xs font-medium text-slate-500 tracking-wide uppercase">
          Checking authorizations...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If role is still loading or not set, default to customer
  const currentRole = role || 'customer';

  // Check if role is allowed
  if (!allowedRoles.includes(currentRole)) {
    // Redirect user to their own role's dashboard
    switch (currentRole) {
      case 'admin':
        return <Navigate to="/admin" replace />;
      case 'staff':
        return <Navigate to="/staff" replace />;
      case 'customer':
      default:
        return <Navigate to="/customer" replace />;
    }
  }

  return children;
}

