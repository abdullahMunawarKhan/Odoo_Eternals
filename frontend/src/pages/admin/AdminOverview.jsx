import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Shield, Sparkles, ArrowRight, RefreshCw } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { staffService } from '../../services/staffService';
import { StaffStats } from '../../features/admin/staff/StaffStats';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { InviteStaffModal } from '../../features/admin/staff/InviteStaffModal';

export function AdminOverview() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [recentStaff, setRecentStaff] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  const loadDashboardData = async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const [statsData, staffData] = await Promise.all([
        staffService.getAdminOverviewStats(),
        staffService.getStaffList(),
      ]);
      setStats(statsData);
      setRecentStaff(staffData.slice(0, 5));
    } catch (err) {
      console.error('Failed to load admin overview:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    Promise.all([
      staffService.getAdminOverviewStats(),
      staffService.getStaffList(),
    ])
      .then(([statsData, staffData]) => {
        if (mounted) {
          setStats(statsData);
          setRecentStaff(staffData.slice(0, 5));
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load admin overview:', err);
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 md:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="danger" className="text-xs">
              <Shield className="w-3 h-3 mr-1" /> Super Admin
            </Badge>
            <span className="text-xs text-slate-400">System Control Center</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
            Welcome back, {profile?.full_name || 'Administrator'}
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-xl">
            Monitor real-time subscription performance, manage internal staff personnel, and oversee customer accounts.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={loadDashboardData}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setIsInviteOpen(true)}
            leftIcon={<UserPlus className="w-3.5 h-3.5" />}
          >
            Invite Staff
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
            Operational Metrics
          </h2>
          <span className="text-xs text-slate-400">Real-time database sync</span>
        </div>
        <StaffStats stats={stats} isLoading={isLoading} />
      </div>

      {/* Grid: Recent Staff & Roadmap Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Staff Members */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Team & Staff Directory</CardTitle>
              <CardDescription>Recently onboarded staff members</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin/staff')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              View All
            </Button>
          </CardHeader>

          <CardContent className="divide-y divide-slate-100">
            {recentStaff.length === 0 && !isLoading ? (
              <div className="py-8 text-center text-sm text-slate-500">
                No staff members found. Click "Invite Staff" to add colleagues.
              </div>
            ) : (
              recentStaff.map((staff) => (
                <div key={staff.id} className="py-3.5 flex items-center justify-between first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                      {staff.full_name?.charAt(0)?.toUpperCase() || 'S'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 leading-tight">
                        {staff.full_name || 'Staff Member'}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{staff.email || '—'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={staff.role === 'admin' ? 'danger' : 'primary'} className="capitalize text-[11px]">
                      {staff.role}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Subscription Engine Roadmap */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-1.5 text-indigo-600 mb-1">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Subscription Modules</span>
            </div>
            <CardTitle className="text-base">Upcoming Releases</CardTitle>
            <CardDescription>Scheduled development phases</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3.5 text-xs">
            <div className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/50 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">Products & Catalog</span>
                <Badge variant="default" className="text-[10px]">Phase 2</Badge>
              </div>
              <p className="text-slate-500">Configurable recurring tiers and billing frequencies.</p>
            </div>

            <div className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/50 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">Automated Invoicing</span>
                <Badge variant="default" className="text-[10px]">Phase 2</Badge>
              </div>
              <p className="text-slate-500">Auto-generated tax-compliant billing and payment reconciliation.</p>
            </div>

            <div className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/50 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">Customer Portal Checkout</span>
                <Badge variant="default" className="text-[10px]">Phase 3</Badge>
              </div>
              <p className="text-slate-500">Direct payment gateway integration and receipt download.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <InviteStaffModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        onStaffInvited={loadDashboardData}
      />
    </div>
  );
}
