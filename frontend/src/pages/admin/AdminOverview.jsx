import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Shield, ArrowRight, RefreshCw, AlertTriangle, Wallet, Receipt, Repeat } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { staffService } from '../../services/staffService';
import { billingService } from '../../services/billingService';
import { StaffStats } from '../../features/admin/staff/StaffStats';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { InviteStaffModal } from '../../features/admin/staff/InviteStaffModal';
import { ErrorBox } from '../../features/admin/billing/shared';
import { formatShortDate } from '../../utils/formatters';
import { formatMoney } from '../../utils/money';

function FinanceCard({ title, value, sub, icon: Icon, tone }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
          <span className={`w-9 h-9 rounded-lg border flex items-center justify-center ${tone}`}>
            <Icon className="w-4 h-4" />
          </span>
        </div>
        <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500 mt-1">{sub}</p>
      </CardContent>
    </Card>
  );
}

export function AdminOverview() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [team, setTeam] = useState(null);
  const [finance, setFinance] = useState(null);
  const [recentStaff, setRecentStaff] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [teamStats, staffData, fin] = await Promise.all([
        staffService.getAdminOverviewStats(),
        staffService.getStaffList(),
        billingService.dashboard(),
      ]);
      setTeam(teamStats);
      setRecentStaff(staffData.slice(0, 5));
      setFinance(fin);
    } catch (err) {
      console.error('Failed to load admin overview:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const s = finance?.summary;
  // Live numbers from v_dashboard_summary replace the old placeholders.
  const stats = team && s
    ? {
        ...team,
        activeSubscriptions: { value: String(s.active_subscriptions), isPlaceholder: false },
        totalRevenue: { value: formatMoney(s.total_revenue), isPlaceholder: false },
      }
    : team;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 md:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="danger" className="text-xs">
              <Shield className="w-3 h-3 mr-1" /> Super Admin
            </Badge>
            <span className="text-xs text-slate-400">Finance and operations overview</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
            Welcome back, {profile?.full_name || 'Administrator'}
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-xl">
            Active subscriptions, revenue collected, what is still owed and which invoices are overdue, all from live data.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <Button variant="outline" size="sm" onClick={load} isLoading={isLoading} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            Refresh
          </Button>
          <Button size="sm" onClick={() => setIsInviteOpen(true)} leftIcon={<UserPlus className="w-3.5 h-3.5" />}>
            Add Staff
          </Button>
        </div>
      </div>

      {error && <ErrorBox message={error} onRetry={load} />}

      <div>
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">Summary</h2>
        <StaffStats stats={stats} isLoading={isLoading} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {isLoading || !s ? (
          [1, 2].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)
        ) : (
          <>
            <FinanceCard title="Outstanding" value={formatMoney(s.outstanding_amount)} sub="Still owed on confirmed invoices" icon={Wallet} tone="text-sky-600 bg-sky-50 border-sky-100" />
            <FinanceCard title="Overdue" value={formatMoney(s.overdue_amount)} sub={`${s.overdue_count} overdue ${s.overdue_count === 1 ? 'invoice' : 'invoices'}`} icon={AlertTriangle} tone="text-rose-600 bg-rose-50 border-rose-100" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Overdue invoices</CardTitle>
              <CardDescription>Most overdue first. Chase these before they become lost revenue.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/payments')} rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
              View all
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table className="border-0">
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Overdue</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!isLoading && (finance?.overdue ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-slate-400">Nothing overdue</TableCell>
                  </TableRow>
                )}
                {(finance?.overdue ?? []).map((i) => (
                  <TableRow key={i.id} className="cursor-pointer" onClick={() => navigate(`/admin/invoices/${i.id}`)}>
                    <TableCell className="font-medium text-indigo-700">{i.number}</TableCell>
                    <TableCell>{i.customer_name}</TableCell>
                    <TableCell>{formatShortDate(i.due_date)}</TableCell>
                    <TableCell><Badge variant="danger">{i.days_overdue} days</Badge></TableCell>
                    <TableCell className="text-right font-medium">{formatMoney(i.outstanding)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick actions</CardTitle>
            <CardDescription>Jump to the daily work</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              ['/admin/subscriptions', 'Subscriptions', 'Quote, confirm, activate', Repeat],
              ['/admin/invoices', 'Invoices', 'Run billing, confirm, send, print', Receipt],
              ['/admin/payments', 'Payments', 'Outstanding and overdue', Wallet],
            ].map(([to, label, hint, Icon]) => (
              <Link key={to} to={to} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50 transition-colors">
                <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center"><Icon className="w-4 h-4" /></span>
                <span>
                  <span className="block text-sm font-medium text-slate-900">{label}</span>
                  <span className="block text-xs text-slate-500">{hint}</span>
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Team and staff</CardTitle>
            <CardDescription>Recently added staff members</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/staff')} rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
            Manage
          </Button>
        </CardHeader>
        <CardContent className="divide-y divide-slate-100">
          {recentStaff.length === 0 && !isLoading ? (
            <div className="py-6 text-center text-sm text-slate-500">No staff yet. Click "Add Staff".</div>
          ) : (
            recentStaff.map((m) => (
              <div key={m.id} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium text-slate-900 leading-tight">{m.full_name || 'Staff member'}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{m.email || '—'}</p>
                </div>
                <div className="flex items-center gap-2">
                  {m.is_active === false && <Badge>Deactivated</Badge>}
                  <Badge variant={m.role === 'admin' ? 'danger' : 'primary'} className="capitalize text-[11px]">{m.role}</Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <InviteStaffModal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} onStaffInvited={load} />
    </div>
  );
}
