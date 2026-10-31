import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  CreditCard,
  Receipt,
  Repeat,
  Building,
  Phone,
  Mail,
  Calendar,
  User,
  ArrowRight,
  Clock,
  Settings,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { customerService } from '../../services/customerService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { formatDate } from '../../utils/formatters';

export function CustomerOverview() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [customerDetails, setCustomerDetails] = useState(null);

  useEffect(() => {
    async function loadCustomer() {
      if (user?.id) {
        try {
          const data = await customerService.getCustomerDetails(user.id);
          setCustomerDetails(data);
        } catch (err) {
          console.error('Error loading customer info:', err);
        }
      }
    }
    loadCustomer();
  }, [user?.id]);

  const customerCards = [
    {
      title: 'Active Subscription',
      value: 'Standard Plan',
      subtext: 'Monthly billing cycle',
      icon: Repeat,
      badge: 'Active',
      badgeVariant: 'success',
    },
    {
      title: 'Current Period Due',
      value: '$0.00',
      subtext: 'No unpaid invoices',
      icon: Receipt,
      badge: 'Up to Date',
      badgeVariant: 'primary',
    },
    {
      title: 'Payment Method',
      value: 'Primary Card',
      subtext: 'Managed via payment portal',
      icon: CreditCard,
      badge: 'Placeholder',
      badgeVariant: 'warning',
      isPlaceholder: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 md:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="success" className="text-xs">
              <Sparkles className="w-3 h-3 mr-1" /> Customer Account
            </Badge>
            <span className="text-xs text-slate-400">Self-Service Portal</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
            Welcome, {profile?.full_name || 'Subscriber'}!
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-xl">
            Manage your subscription details, company information, and review past invoices from your personal dashboard.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            size="sm"
            onClick={() => navigate('/customer/settings')}
            leftIcon={<Settings className="w-4 h-4" />}
          >
            Account Settings
          </Button>
        </div>
      </div>

      {/* Subscription Status Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {customerCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Card key={idx} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {card.title}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                    <Icon className="w-4 h-4" />
                  </div>
                </div>

                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight text-slate-900">
                    {card.value}
                  </span>
                  <Badge variant={card.badgeVariant} className="text-[10px] py-0 px-1.5 font-medium">
                    {card.badge}
                  </Badge>
                </div>

                <p className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                  {card.isPlaceholder && <Clock className="w-3 h-3 text-amber-500 shrink-0" />}
                  <span>{card.subtext}</span>
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Personal Profile & Company Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Subscriber Profile</CardTitle>
              <CardDescription>Your personal contact and account details</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/customer/settings')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Edit
            </Button>
          </CardHeader>
          <CardContent className="space-y-3.5">
            <div className="flex items-center gap-3 py-2 border-b border-slate-100">
              <User className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="flex-1 flex justify-between text-sm">
                <span className="text-slate-500">Full Name</span>
                <span className="font-semibold text-slate-800">{profile?.full_name || '—'}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 py-2 border-b border-slate-100">
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="flex-1 flex justify-between text-sm">
                <span className="text-slate-500">Email</span>
                <span className="font-semibold text-slate-800">{user?.email || '—'}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 py-2 border-b border-slate-100">
              <Building className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="flex-1 flex justify-between text-sm">
                <span className="text-slate-500">Company Name</span>
                <span className="font-semibold text-slate-800">
                  {customerDetails?.company_name || 'Individual Subscriber'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 py-2 border-b border-slate-100">
              <Phone className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="flex-1 flex justify-between text-sm">
                <span className="text-slate-500">Phone</span>
                <span className="font-semibold text-slate-800">
                  {customerDetails?.phone || 'Not provided'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 py-2">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="flex-1 flex justify-between text-sm">
                <span className="text-slate-500">Account Creation Date</span>
                <span className="text-slate-700">{formatDate(profile?.created_at)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Self-Service Subscriptions</CardTitle>
            <CardDescription>What you can manage in SubFlow</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-slate-600">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
              <p className="font-semibold text-slate-800 mb-1">Row-Level Security Isolation</p>
              <p className="text-slate-500">
                Your records are secured by PostgreSQL RLS. Only you and authorized company administrators can view your invoices and subscription data.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
              <p className="font-semibold text-slate-800 mb-1">Billing & Invoices (Coming Soon)</p>
              <p className="text-slate-500">
                Automated monthly PDF invoices and receipts will be downloadable right from your customer dashboard.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
