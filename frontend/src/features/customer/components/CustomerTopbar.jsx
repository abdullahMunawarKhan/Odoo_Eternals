import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, ChevronDown, User, Settings, LogOut, Sparkles } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { Dropdown } from '../../../components/ui/Dropdown';
import { Badge } from '../../../components/ui/Badge';

export function CustomerTopbar({ onOpenMobileMenu }) {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/customer') return 'Overview';
    if (path.startsWith('/customer/subscriptions')) return 'My Subscriptions';
    if (path.startsWith('/customer/invoices')) return 'My Invoices';
    if (path.startsWith('/customer/payments')) return 'Payment History';
    if (path.startsWith('/customer/profile')) return 'My Profile';
    if (path.startsWith('/customer/settings')) return 'Account Settings';
    return 'Customer Portal';
  };

  const userMenuItems = [
    {
      label: 'Signed in as',
      description: user?.email || '',
      disabled: true,
    },
    { divider: true },
    {
      label: 'My Profile',
      icon: <User className="w-4 h-4" />,
      onClick: () => navigate('/customer/profile'),
    },
    {
      label: 'Account Settings',
      icon: <Settings className="w-4 h-4" />,
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
    <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-2xs">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="md:hidden text-slate-500 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-100"
          onClick={onOpenMobileMenu}
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-400 hidden sm:inline">Self-Service /</span>
          <span className="text-sm font-semibold text-slate-800">
            {getPageTitle()}
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
  );
}

