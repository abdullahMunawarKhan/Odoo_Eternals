import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Repeat,
  Receipt,
  CreditCard,
  UserCog,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Dropdown } from '../components/ui/Dropdown';
import { Badge } from '../components/ui/Badge';
import { cn } from '../utils/cn';

const customerNavItems = [
  { name: 'Overview', to: '/customer', icon: LayoutDashboard, end: true },
  { name: 'My Subscriptions', to: '/customer/subscriptions', icon: Repeat, comingSoon: true },
  { name: 'My Invoices', to: '/customer/invoices', icon: Receipt, comingSoon: true },
  { name: 'Payment History', to: '/customer/payments', icon: CreditCard, comingSoon: true },
  { name: 'Account Settings', to: '/customer/settings', icon: UserCog },
];

export function CustomerLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const userMenuItems = [
    {
      label: 'Signed in as',
      description: user?.email || '',
      disabled: true,
    },
    { divider: true },
    {
      label: 'Account Settings',
      icon: <UserCog className="w-4 h-4" />,
      onClick: () => navigate('/customer/settings'),
    },
    { divider: true },
    {
      label: 'Sign Out',
      icon: <LogOut className="w-4 h-4" />,
      onClick: handleLogout,
      danger: true,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
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
                Customer Portal
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

        {/* Navigation */}
        <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            My Account
          </div>
          {customerNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMobileOpen(false)}
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
                {item.comingSoon && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    Soon
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Sidebar Footer User Info */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 flex items-center justify-center font-semibold text-xs shrink-0">
              {profile?.full_name?.charAt(0)?.toUpperCase() || 'C'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {profile?.full_name || 'Customer'}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="text-[11px] text-emerald-400 font-medium capitalize">
                  Active Subscriber
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="md:hidden text-slate-500 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-100"
              onClick={() => setMobileOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-500 hidden sm:inline">Self-Service /</span>
              <span className="text-sm font-semibold text-slate-800 capitalize">
                {customerNavItems.find((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)))?.name || 'Dashboard'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="success" className="hidden sm:inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Customer Portal
            </Badge>

            {/* Profile Dropdown */}
            <Dropdown
              trigger={
                <button
                  type="button"
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    {profile?.full_name?.charAt(0)?.toUpperCase() || 'C'}
                  </div>
                  <span className="text-sm font-medium text-slate-700 hidden md:block max-w-[120px] truncate">
                    {profile?.full_name || 'Customer'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>
              }
              items={userMenuItems}
            />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

