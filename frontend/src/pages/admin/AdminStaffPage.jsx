import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import { staffService } from '../../services/staffService';
import { StaffList } from '../../features/admin/staff/StaffList';
import { InviteStaffModal } from '../../features/admin/staff/InviteStaffModal';

export function AdminStaffPage() {
  const [staffMembers, setStaffMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const { user } = useAuth();

  const handleToggleActive = async (member) => {
    const activate = member.is_active === false;
    const verb = activate ? 'reactivate' : 'deactivate';
    if (!window.confirm(`Do you want to ${verb} ${member.full_name || member.email}?`)) return;
    try {
      await staffService.setActive(member.id, activate);
      toast.success(`Account ${activate ? 'reactivated' : 'deactivated'}`);
      fetchStaff();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const fetchStaff = async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    setError(null);
    try {
      const data = await staffService.getStaffList();
      setStaffMembers(data);
    } catch (err) {
      console.error('Failed to load staff list:', err);
      setError(err.message || 'Unable to retrieve staff accounts.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    staffService
      .getStaffList()
      .then((data) => {
        if (mounted) {
          setStaffMembers(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err.message || 'Unable to retrieve staff accounts.');
          setIsLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Staff Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your organization's staff members, dispatch invitations, and control dashboard permissions.
          </p>
        </div>
      </div>

      {/* Staff Directory Component */}
      <StaffList
        staffMembers={staffMembers}
        isLoading={isLoading}
        error={error}
        onRefresh={fetchStaff}
        onOpenInvite={() => setIsInviteOpen(true)}
        onToggleActive={handleToggleActive}
        currentUserId={user?.id}
      />

      {/* Staff Invitation Modal */}
      <InviteStaffModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        onStaffInvited={fetchStaff}
      />
    </div>
  );
}
