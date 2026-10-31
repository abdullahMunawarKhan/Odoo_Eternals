import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  FileSpreadsheet,
  Receipt,
  Repeat,
  UserCheck,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { formatDate } from '../../utils/formatters';

export function StaffOverview() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();

  const operationalCards = [
    {
      title: 'Active Customers',
      value: '—',
      subtext: 'Assigned customer accounts',
      icon: Users,
      badge: 'Coming Soon',
    },
    {
      title: 'Quotations in Review',
      value: '0',
      subtext: 'Pending subscription proposals',
      icon: FileSpreadsheet,
      badge: 'Coming Soon',
    },
    {
      title: 'Subscriptions Managed',
      value: '0',
      subtext: 'Recurring active accounts',
      icon: Repeat,
      badge: 'Coming Soon',
    },
    {
      title: 'Open Invoices',
      value: '0',
      subtext: 'Pending payment verification',
      icon: Receipt,
      badge: 'Coming Soon',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 md:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="primary" className="text-xs">
              Staff Portal Access
            </Badge>
            <span className="text-xs text-slate-400">Account verified</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
            Welcome, {profile?.full_name || 'Staff Member'}!
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-xl">
            You are logged into the SubFlow Staff Workspace. You have access to customer management, quotation handling, and subscription tracking.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            size="sm"
            onClick={() => navigate('/staff/profile')}
            leftIcon={<UserCheck className="w-4 h-4" />}
          >
            My Profile
          </Button>
        </div>
      </div>

      {/* Operational Highlights */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
            Operational Highlights
          </h2>
          <span className="text-xs text-slate-400">Staff workspace metrics</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {operationalCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <Card key={idx} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {card.title}
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-2xl font-bold tracking-tight text-slate-900">
                      {card.value}
                    </span>
                    <Badge variant="warning" className="text-[10px] py-0 px-1.5 font-medium">
                      {card.badge}
                    </Badge>
                  </div>

                  <p className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                    <span>{card.subtext}</span>
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Profile Summary & Permissions Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Staff Identity & Authorization</CardTitle>
            <CardDescription>Your registered platform credentials</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-slate-100 text-sm">
              <span className="text-slate-500">Full Name</span>
              <span className="font-medium text-slate-800">{profile?.full_name || '—'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100 text-sm">
              <span className="text-slate-500">Email Address</span>
              <span className="font-medium text-slate-800">{user?.email || '—'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100 text-sm">
              <span className="text-slate-500">Assigned Role</span>
              <Badge variant="primary" className="capitalize">
                {profile?.role || 'Staff'}
              </Badge>
            </div>
            <div className="flex justify-between items-center py-2 text-sm">
              <span className="text-slate-500">Member Since</span>
              <span className="text-slate-700">{formatDate(profile?.created_at)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-1.5 text-indigo-600 mb-1">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Assigned Duties</span>
            </div>
            <CardTitle>Staff Capabilities</CardTitle>
            <CardDescription>Permitted actions and upcoming operational tools</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 text-xs text-slate-600">
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
              <span>Full read access to subscribed customer accounts and profiles.</span>
            </div>
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
              <span>Personal staff profile management and contact maintenance.</span>
            </div>
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
              <span>Upcoming: Quotation creation, plan upgrades, and invoice generation.</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
