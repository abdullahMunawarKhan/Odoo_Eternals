import React, { useState, useMemo } from 'react';
import { Search, UserPlus, RefreshCw, AlertCircle, Shield, Briefcase, Mail } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { formatDate, formatRoleBadge } from '../../../utils/formatters';

export function StaffList({
  staffMembers = [],
  isLoading = false,
  error = null,
  onRefresh,
  onOpenInvite,
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredStaff = useMemo(() => {
    if (!searchTerm.trim()) return staffMembers;
    const term = searchTerm.toLowerCase();
    return staffMembers.filter(
      (m) =>
        m.full_name?.toLowerCase().includes(term) ||
        m.email?.toLowerCase().includes(term) ||
        m.role?.toLowerCase().includes(term)
    );
  }, [staffMembers, searchTerm]);

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search staff by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={onOpenInvite}
            leftIcon={<UserPlus className="w-3.5 h-3.5" />}
          >
            Invite Staff
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 flex items-start justify-between gap-3 text-sm text-rose-800">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Failed to load staff directory</p>
              <p className="text-xs text-rose-700 mt-0.5">{error}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            Retry
          </Button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
              <div className="flex items-center gap-3">
                <Skeleton className="w-9 h-9 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-4 w-28 hidden md:block" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredStaff.length === 0 && (
        <EmptyState
          icon={Briefcase}
          title={searchTerm ? 'No matching staff members found' : 'No staff members yet'}
          description={
            searchTerm
              ? `No staff members matched "${searchTerm}". Try another search term.`
              : 'Start building your team by inviting administrators or staff members.'
          }
          actionLabel={searchTerm ? 'Clear Search' : 'Invite First Staff Member'}
          onAction={searchTerm ? () => setSearchTerm('') : onOpenInvite}
          actionIcon={<UserPlus className="w-4 h-4" />}
        />
      )}

      {/* Table State */}
      {!isLoading && !error && filteredStaff.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Staff Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Account Status</TableHead>
              <TableHead>Date Added</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStaff.map((staff) => {
              const badgeInfo = formatRoleBadge(staff.role);
              const initials = staff.full_name
                ? staff.full_name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)
                : 'U';

              return (
                <TableRow key={staff.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 truncate">
                          {staff.full_name || 'Staff Member'}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{staff.email || 'No email provided'}</span>
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeInfo.bg}`}
                    >
                      {staff.role === 'admin' ? (
                        <Shield className="w-3 h-3" />
                      ) : (
                        <Briefcase className="w-3 h-3" />
                      )}
                      {badgeInfo.label}
                    </span>
                  </TableCell>

                  <TableCell>
                    <Badge variant="success" className="gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Active
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <span className="text-xs text-slate-500">
                      {formatDate(staff.created_at)}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

