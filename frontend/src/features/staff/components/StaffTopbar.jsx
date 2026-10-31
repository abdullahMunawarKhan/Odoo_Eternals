import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Menu, UserCheck, LogOut, ChevronDown, Shield } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { Dropdown } from '../../../components/ui/Dropdown';
import { Badge } from '../../../components/ui/Badge';

export function StaffTopbar({ setMobileOpen }) {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();

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
      label: 'My Staff Profile',
      icon: <UserCheck className="w-4 h-4" />,
      onClick: () => navigate('/staff/profile'),
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
    <header className="h-16 bg-white border-b border-slate-200/80 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
      {/* Left: Mobile Toggle & Context */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="md:hidden text-slate-500 hover:text-slate-800 p-2 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2">
          <Badge variant="primary" className="text-xs py-0.5">
            <Shield className="w-3 h-3 mr-1" />
            Staff Workspace
          </Badge>
          <span className="text-slate-300">/</span>
          <span className="text-xs text-slate-500 font-medium">Brightloop Platform</span>
        </div>
      </div>

      {/* Right: User Dropdown */}
      <div className="flex items-center gap-3">
        <Dropdown
          trigger={
            <button className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-semibold text-xs shadow-xs">
                {(profile?.full_name || user?.email || 'S')[0].toUpperCase()}
              </div>
              <div className="text-left hidden md:block">
                <div className="text-xs font-semibold text-slate-800 leading-tight">
                  {profile?.full_name || 'Staff User'}
                </div>
                <div className="text-[10px] text-slate-400 capitalize">
                  {profile?.role || 'staff'}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:block" />
            </button>
          }
          items={userMenuItems}
        />
      </div>
    </header>
  );
}

