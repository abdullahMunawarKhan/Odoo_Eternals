import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Repeat,
  Receipt,
  CreditCard,
  User,
  Settings,
  LogOut,
  X,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { cn } from '../../../utils/cn';

const customerNavItems = [
  { name: 'Overview', to: '/customer', icon: LayoutDashboard, end: true },
  { name: 'My Subscriptions', to: '/customer/subscriptions', icon: Repeat },
  { name: 'My Invoices', to: '/customer/invoices', icon: Receipt },
  { name: 'Payment History', to: '/customer/payments', icon: CreditCard },
  { name: 'My Profile', to: '/customer/profile', icon: User },
  { name: 'Account Settings', to: '/customer/settings', icon: Settings },
];

export function CustomerSidebar({ mobileOpen, onClose }) {
  const { profile, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:h-screen',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-500/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-white font-bold text-base leading-none">SubFlow</div>
              <div className="text-[10px] text-emerald-400 font-medium tracking-wider uppercase mt-1">
                Customer Portal
              </div>
            </div>
          </div>
          <button
            type="button"
            className="md:hidden text-slate-400 hover:text-white"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Self-Service Hub
          </div>
          {customerNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  )
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </div>
              </NavLink>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 flex items-center justify-center font-semibold text-xs shrink-0">
              {profile?.full_name?.charAt(0)?.toUpperCase() || 'C'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {profile?.full_name || 'Subscriber'}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="text-[11px] text-emerald-400 font-medium capitalize">
                  Active Subscriber
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

