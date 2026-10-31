import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Repeat,
  Receipt,
  CreditCard,
  Calendar,
  Sparkles,
  ArrowRight,
  RefreshCw,
  User,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { customerService } from '../../../services/customerService';
import { CustomerStatCard } from '../components/CustomerStatCard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { formatShortDate } from '../../../utils/formatters';
import { getSubscriptionStatusBadge } from '../components/SubscriptionTable';
import { getInvoiceStatusBadge } from '../components/InvoiceTable';

export function CustomerOverview() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState({
    metrics: {
      activeSubscriptionsCount: 0,
      upcomingBillingAmount: 0,
      outstandingInvoiceAmount: 0,
      totalPaymentsMade: 0,
    },
    recentSubscriptions: [],
    recentInvoices: [],
    customer: null,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    setError(null);
    try {
      const res = await customerService.getOverviewData();
      setData(res);
    } catch (err) {
      console.error('Failed to load customer overview:', err);
      setError(err.message || 'Unable to retrieve dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const metrics = data.metrics || {};
  const recentSubs = data.recentSubscriptions || [];
  const recentInvs = data.recentInvoices || [];
  const customer = data.customer;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 md:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="success" className="text-xs">
              <Sparkles className="w-3 h-3 mr-1" /> Customer Self-Service
            </Badge>
            <span className="text-xs text-slate-400">Secure RLS Isolation</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
            Welcome back, {customer?.name || profile?.full_name || 'Subscriber'}!
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-xl">
            Monitor your recurring plans, download official tax invoices, and track your payment receipts.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(true)}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => navigate('/customer/subscriptions')}
            leftIcon={<Repeat className="w-3.5 h-3.5" />}
          >
            My Subscriptions
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 flex items-center justify-between text-sm text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => loadData(true)}>
            Retry
          </Button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CustomerStatCard
          title="Active Subscriptions"
          value={isLoading ? '...' : String(metrics.activeSubscriptionsCount || 0)}
          subtext="Current ongoing services"
          icon={Repeat}
          color="text-emerald-600 bg-emerald-50 border-emerald-100"
          badge={metrics.activeSubscriptionsCount > 0 ? 'Active' : 'None'}
          badgeVariant={metrics.activeSubscriptionsCount > 0 ? 'success' : 'default'}
        />

        <CustomerStatCard
          title="Upcoming Billing"
          value={isLoading ? '...' : `$${Number(metrics.upcomingBillingAmount || 0).toFixed(2)}`}
          subtext="Next renewal cycle charges"
          icon={Calendar}
          color="text-indigo-600 bg-indigo-50 border-indigo-100"
          badge="Upcoming"
          badgeVariant="primary"
        />

        <CustomerStatCard
          title="Outstanding Invoices"
          value={isLoading ? '...' : `$${Number(metrics.outstandingInvoiceAmount || 0).toFixed(2)}`}
          subtext="Awaiting verification/payment"
          icon={Receipt}
          color={metrics.outstandingInvoiceAmount > 0 ? 'text-amber-600 bg-amber-50 border-amber-100' : 'text-slate-600 bg-slate-50 border-slate-100'}
          badge={metrics.outstandingInvoiceAmount > 0 ? 'Due' : 'All Settled'}
          badgeVariant={metrics.outstandingInvoiceAmount > 0 ? 'warning' : 'success'}
        />

        <CustomerStatCard
          title="Total Payments Made"
          value={isLoading ? '...' : `$${Number(metrics.totalPaymentsMade || 0).toFixed(2)}`}
          subtext="Lifetime processed payments"
          icon={CreditCard}
          color="text-sky-600 bg-sky-50 border-sky-100"
          badge="Verified"
          badgeVariant="info"
        />
      </div>

      {/* Quick Actions & Recent Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Subscriptions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">Recent Subscriptions</CardTitle>
              <CardDescription>Your latest recurring subscriptions and statuses</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/customer/subscriptions')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              View All
            </Button>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 pt-0">
            {isLoading ? (
              <div className="space-y-3 py-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : recentSubs.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No subscription records found. Contact your account manager to activate a plan.
              </div>
            ) : (
              recentSubs.map((sub) => {
                const badge = getSubscriptionStatusBadge(sub.status);
                return (
                  <div
                    key={sub.id}
                    className="py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50/70 px-2 rounded-lg transition-colors"
                    onClick={() => navigate(`/customer/subscriptions/${sub.id}`)}
                  >
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">
                        {sub.number || `SUB-${sub.id.slice(0, 6)}`}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {sub.plan?.name || 'Standard Plan'} • {sub.plan?.billing_period?.toUpperCase() || 'MONTHLY'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${badge.bg}`}>
                        {badge.label}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Recent Invoices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">Recent Invoices</CardTitle>
              <CardDescription>Latest generated billing statements</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/customer/invoices')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              View All
            </Button>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 pt-0">
            {isLoading ? (
              <div className="space-y-3 py-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : recentInvs.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No invoices found. Invoices are generated automatically on your billing cycle.
              </div>
            ) : (
              recentInvs.map((inv) => {
                const badge = getInvoiceStatusBadge(inv.status);
                return (
                  <div
                    key={inv.id}
                    className="py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50/70 px-2 rounded-lg transition-colors"
                    onClick={() => navigate(`/customer/invoices/${inv.id}`)}
                  >
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">
                        {inv.number || `INV-${inv.id.slice(0, 6)}`}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Due: {formatShortDate(inv.due_date || inv.created_at)} • Total: ${Number(inv.total || 0).toFixed(2)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${badge.bg}`}>
                        {badge.label}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Account Security & Quick Link Hub */}
      <Card className="bg-slate-50/50 border-slate-200">
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Personalized Customer Isolation
              </p>
              <p className="text-xs text-slate-500">
                All records shown above belong exclusively to your registered account ({user?.email}).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/customer/profile')}
              leftIcon={<User className="w-3.5 h-3.5" />}
            >
              My Profile
            </Button>
            <Button
              size="sm"
              onClick={() => navigate('/customer/payments')}
              leftIcon={<CreditCard className="w-3.5 h-3.5" />}
            >
              Payment History
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

