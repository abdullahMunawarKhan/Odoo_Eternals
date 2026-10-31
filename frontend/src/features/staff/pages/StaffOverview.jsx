import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Users,
  FileSpreadsheet,
  Receipt,
  Repeat,
  CreditCard,
  AlertCircle,
  Plus,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Calendar,
  Building2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../../hooks/useAuth';
import { staffService } from '../../../services/staffService';
import { StaffStatCard } from '../components/StaffStatCard';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { formatCurrency, formatShortDate } from '../../../utils/formatters';
import { getSubscriptionStatusBadge } from '../components/SubscriptionTable';

export function StaffOverview() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await staffService.getStaffOverviewStats();
      setData(res);
    } catch (err) {
      console.error('Error loading staff overview:', err);
      toast.error('Failed to load operational statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const metrics = data?.metrics || {};
  const pendingActions = data?.pendingActions || {};
  const recentActivities = data?.recentActivities || {};

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 md:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="primary" className="text-xs">
              Staff Workspace
            </Badge>
            <span className="text-xs text-slate-400">Operations Console</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
            Welcome, {profile?.full_name || 'Staff Member'}!
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-xl">
            Monitor client subscriptions, manage quotations, process invoice billing, and record received customer payments.
          </p>
        </div>

        {/* Quick Operational Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            size="sm"
            onClick={() => navigate('/staff/customers')}
            variant="outline"
            leftIcon={<Users className="w-4 h-4" />}
          >
            Customers
          </Button>
          <Button
            size="sm"
            onClick={() => navigate('/staff/quotations/new')}
            variant="outline"
            leftIcon={<Plus className="w-4 h-4" />}
          >
            New Quote
          </Button>
          <Button
            size="sm"
            onClick={() => navigate('/staff/payments/new')}
            leftIcon={<CreditCard className="w-4 h-4" />}
          >
            Record Payment
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StaffStatCard
          title="Total Customers"
          value={metrics.totalCustomers ?? 0}
          subtext="Registered client accounts"
          icon={Users}
          isLoading={loading}
        />
        <StaffStatCard
          title="Active Subscriptions"
          value={metrics.activeSubscriptions ?? 0}
          subtext="Currently recurring services"
          icon={Repeat}
          badge="Active"
          badgeVariant="success"
          isLoading={loading}
        />
        <StaffStatCard
          title="Pending Quotations"
          value={metrics.pendingQuotations ?? 0}
          subtext="Awaiting customer signoff"
          icon={FileSpreadsheet}
          badge={metrics.pendingQuotations > 0 ? 'Pending' : undefined}
          badgeVariant="warning"
          isLoading={loading}
        />
        <StaffStatCard
          title="Outstanding Invoices"
          value={metrics.outstandingInvoicesCount ?? 0}
          subtext={formatCurrency(metrics.outstandingAmount ?? 0) + ' unpaid'}
          icon={Receipt}
          badge={metrics.overdueInvoicesCount > 0 ? `${metrics.overdueInvoicesCount} Overdue` : undefined}
          badgeVariant="warning"
          isLoading={loading}
        />
        <StaffStatCard
          title="Payments Recorded"
          value={formatCurrency(metrics.totalPaymentsAmount ?? 0)}
          subtext={`${metrics.paymentsCount ?? 0} total transactions`}
          icon={CreditCard}
          isLoading={loading}
        />
      </div>

      {/* Grid: Pending Actions & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Actions (Left 1 col) */}
        <div className="space-y-4">
          <Card className="border-slate-200/80">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                Pending Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {/* Overdue Invoices Alert */}
              {pendingActions.overdueInvoices?.length > 0 ? (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-rose-800">
                    <span>{pendingActions.overdueInvoices.length} Overdue Invoices</span>
                    <Link to="/staff/invoices" className="underline text-[11px]">
                      View All
                    </Link>
                  </div>
                  {pendingActions.overdueInvoices.map((inv) => (
                    <div key={inv.id} className="text-xs text-rose-700 flex justify-between py-0.5">
                      <span className="font-mono">{inv.number} ({inv.customer?.name})</span>
                      <span className="font-semibold">{formatCurrency(inv.total - inv.amount_paid)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>No overdue invoices currently.</span>
                </div>
              )}

              {/* Quotations Awaiting Confirmation */}
              {pendingActions.quotationsAwaitingConfirmation?.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-amber-800">
                    <span>Quotes Awaiting Confirmation</span>
                    <Link to="/staff/quotations" className="underline text-[11px]">
                      Review
                    </Link>
                  </div>
                  {pendingActions.quotationsAwaitingConfirmation.map((q) => (
                    <div key={q.id} className="text-xs text-amber-900 flex justify-between py-0.5">
                      <span className="font-mono">{q.number}</span>
                      <span>{q.customer?.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Upcoming Renewals */}
              {pendingActions.upcomingRenewals?.length > 0 && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-indigo-800">
                    <span>Upcoming Renewals (30 Days)</span>
                    <Link to="/staff/subscriptions" className="underline text-[11px]">
                      Manage
                    </Link>
                  </div>
                  {pendingActions.upcomingRenewals.map((sub) => (
                    <div key={sub.id} className="text-xs text-indigo-900 flex justify-between py-0.5">
                      <span>{sub.number} ({sub.customer?.name})</span>
                      <span className="font-medium text-[11px]">Exp: {formatShortDate(sub.expiry_date)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Customers & Activities (Right 2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Customers */}
          <Card className="border-slate-200/80">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-slate-800">
                  Recent Customers
                </CardTitle>
                <p className="text-xs text-slate-400 mt-0.5">Newly registered or onboarded customer accounts</p>
              </div>
              <Link to="/staff/customers">
                <Button size="sm" variant="ghost" className="text-xs text-indigo-600">
                  View All Customers <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {data?.recentCustomers?.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">No customers registered yet.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {data?.recentCustomers?.map((c) => (
                    <div key={c.id} className="p-3.5 sm:px-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">
                          {c.name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-900">{c.name}</div>
                          <div className="text-[11px] text-slate-400">{c.company} • {c.email}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="default" className="text-[11px]">
                          {c.subscriptionCount} subscriptions
                        </Badge>
                        <div className="text-[10px] text-slate-400 mt-0.5">{formatShortDate(c.created_at)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Subscriptions & Payments */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Recent Subscriptions */}
            <Card className="border-slate-200/80">
              <CardHeader className="pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-semibold text-slate-800">
                  Recent Subscriptions
                </CardTitle>
                <Link to="/staff/subscriptions" className="text-[11px] text-indigo-600 hover:underline">
                  View all
                </Link>
              </CardHeader>
              <CardContent className="p-3 divide-y divide-slate-100">
                {recentActivities.recentSubscriptions?.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">No subscriptions found</div>
                ) : (
                  recentActivities.recentSubscriptions?.slice(0, 4).map((sub) => (
                    <div key={sub.id} className="py-2 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-mono font-semibold text-indigo-600">{sub.number}</span>
                        <div className="text-[11px] text-slate-500">{sub.customer?.name}</div>
                      </div>
                      <div className="text-right">
                        {getSubscriptionStatusBadge(sub.status)}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Recent Payments */}
            <Card className="border-slate-200/80">
              <CardHeader className="pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-semibold text-slate-800">
                  Recent Payments
                </CardTitle>
                <Link to="/staff/payments" className="text-[11px] text-indigo-600 hover:underline">
                  View all
                </Link>
              </CardHeader>
              <CardContent className="p-3 divide-y divide-slate-100">
                {recentActivities.recentPayments?.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">No payments recorded yet</div>
                ) : (
                  recentActivities.recentPayments?.slice(0, 4).map((p) => (
                    <div key={p.id} className="py-2 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-mono text-slate-800">{p.reference || `PAY-${p.id?.slice(0, 6)}`}</span>
                        <div className="text-[11px] text-slate-500">{p.invoice?.customer?.name || 'Customer'}</div>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-emerald-600">{formatCurrency(p.amount)}</span>
                        <div className="text-[10px] text-slate-400">{formatShortDate(p.payment_date)}</div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

