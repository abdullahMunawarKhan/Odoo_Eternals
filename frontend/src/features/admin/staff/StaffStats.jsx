import React from 'react';
import { Users, UserCheck, Repeat, DollarSign, Clock } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/Card';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Badge } from '../../../components/ui/Badge';

export function StaffStats({ stats, isLoading }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-5">
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-32" />
          </Card>
        ))}
      </div>
    );
  }

  const statItems = [
    {
      title: 'Total Staff',
      value: stats?.totalStaff ?? 0,
      subtext: 'Active staff members with portal access',
      icon: UserCheck,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
      badge: 'Live Data',
      badgeVariant: 'primary',
    },
    {
      title: 'Total Customers',
      value: stats?.totalCustomers ?? 0,
      subtext: 'Registered subscriber accounts',
      icon: Users,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
      badge: 'Live Data',
      badgeVariant: 'success',
    },
    {
      title: 'Active Subscriptions',
      value: stats?.activeSubscriptions?.value ?? '0',
      subtext: 'Recurring subscription plans',
      icon: Repeat,
      color: 'text-amber-600 bg-amber-50 border-amber-100',
      badge: 'Placeholder',
      badgeVariant: 'warning',
      isPlaceholder: true,
    },
    {
      title: 'Total Revenue',
      value: stats?.totalRevenue?.value ?? '$0.00',
      subtext: 'Cumulative processed subscription billing',
      icon: DollarSign,
      color: 'text-sky-600 bg-sky-50 border-sky-100',
      badge: 'Placeholder',
      badgeVariant: 'warning',
      isPlaceholder: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {statItems.map((item, idx) => {
        const Icon = item.icon;
        return (
          <Card key={idx} className="relative overflow-hidden hover:shadow-sm transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {item.title}
                </span>
                <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${item.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-slate-900">
                  {item.value}
                </span>
                <Badge variant={item.badgeVariant} className="text-[10px] py-0 px-1.5 font-medium">
                  {item.badge}
                </Badge>
              </div>

              <p className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                {item.isPlaceholder && <Clock className="w-3 h-3 text-amber-500 shrink-0" />}
                <span className="truncate">{item.subtext}</span>
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

