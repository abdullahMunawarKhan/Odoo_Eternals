import { supabase } from '../lib/supabase';

export const staffService = {
  /**
   * Fetch all staff members from profiles
   */
  async getStaffList() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, created_at, updated_at')
      .in('role', ['staff', 'admin'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching staff list:', error);
      throw error;
    }
    return data || [];
  },

  /**
   * Invite a new staff member via Supabase Edge Function
   */
  async inviteStaff({ email, fullName }) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('You must be signed in as an admin to invite staff.');
    }

    const redirectTo = `${window.location.origin}/reset-password`;

    // Invoke the Edge Function 'invite-staff'
    const { data, error } = await supabase.functions.invoke('invite-staff', {
      body: {
        email: email.trim().toLowerCase(),
        full_name: fullName.trim(),
        redirectTo,
      },
    });

    if (error) {
      // FunctionsHttpError contains the response payload in error.context
      let errorMsg = error.message;
      try {
        if (error.context && typeof error.context.json === 'function') {
          const body = await error.context.json();
          if (body?.error) errorMsg = body.error;
        }
      } catch {
        // Fallback to error.message
      }
      throw new Error(errorMsg || 'Failed to send staff invitation');
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    return data;
  },

  /**
   * Fetch live metrics for Admin Overview:
   * - Total Staff
   * - Total Customers
   * - Active Subscriptions (placeholder)
   * - Total Revenue (placeholder)
   */
  async getAdminOverviewStats() {
    try {
      // Real database count for staff
      const { count: staffCount, error: staffErr } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'staff');

      // Real database count for customers
      const { count: customerCount, error: custErr } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'customer');

      if (staffErr) console.warn('Could not count staff:', staffErr);
      if (custErr) console.warn('Could not count customers:', custErr);

      return {
        totalStaff: staffCount ?? 0,
        totalCustomers: customerCount ?? 0,
        activeSubscriptions: {
          value: '0',
          isPlaceholder: true,
          label: 'Active Subscriptions (Module Coming Soon)',
        },
        totalRevenue: {
          value: '$0.00',
          isPlaceholder: true,
          label: 'Total Revenue (Billing Coming Soon)',
        },
      };
    } catch (err) {
      console.error('Error fetching admin overview stats:', err);
      return {
        totalStaff: 0,
        totalCustomers: 0,
        activeSubscriptions: { value: '0', isPlaceholder: true, label: 'Coming Soon' },
        totalRevenue: { value: '$0.00', isPlaceholder: true, label: 'Coming Soon' },
      };
    }
  },
};

