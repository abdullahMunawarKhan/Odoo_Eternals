import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileSpreadsheet,
  Repeat,
  Receipt,
  CreditCard,
  UserCheck,
  LogOut,
  Layers,
  X,
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { cn } from '../../../utils/cn';

const staffNavItems = [
  { name: 'Overview', to: '/staff', icon: LayoutDashboard, end: true },
  { name: 'Customers', to: '/staff/customers', icon: Users },
  { name: 'Quotations', to: '/staff/quotations', icon: FileSpreadsheet },
  { name: 'Subscriptions', to: '/staff/subscriptions', icon: Repeat },
  { name: 'Invoices', to: '/staff/invoices', icon: Receipt },
  { name: 'Payments', to: '/staff/payments', icon: CreditCard },
  { name: 'My Profile', to: '/staff/profile', icon: UserCheck },
];

export function StaffSidebar({ mobileOpen, setMobileOpen }) {
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
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
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
              <div className="text-[10px] text-indigo-400 font-medium tracking-wider uppercase mt-1">
                Staff Operations
              </div>
            </div>
          </div>
          <button
            type="button"
            className="md:hidden text-slate-400 hover:text-white"
            onClick={() => setMobileOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
            Workspace
          </div>
          {staffNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.to}
                end={item.end}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                    isActive
                      ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 font-semibold'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  )
                }
              >
                <Icon className="w-4 h-4 shrink-0 transition-colors" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Staff User Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/60">
          <div className="flex items-center justify-between gap-2 px-2 py-1">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-semibold text-xs shrink-0">
                {(profile?.full_name || user?.email || 'S')[0].toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-medium text-slate-200 truncate">
                  {profile?.full_name || 'Staff User'}
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  {user?.email}
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

