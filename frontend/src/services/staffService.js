import { supabase } from '../lib/supabase';

export const staffService = {
  /**
   * Fetch all staff members from profiles
   */
  async getStaffList() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, is_active, created_at')
      .in('role', ['staff', 'admin'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching staff list:', error);
      throw error;
    }
    return data || [];
  },

  /**
   * Create a staff account with the admin-only `create-staff` Edge Function
   * (docs/API.md section 4). The staff member can log in right away.
   * Errors come back as { error: { code, message, field } }.
   */
  async createStaff({ email, fullName, password }) {
    const { data, error } = await supabase.functions.invoke('create-staff', {
      body: {
        email: email.trim().toLowerCase(),
        full_name: fullName.trim(),
        password,
      },
    });

    if (error) {
      let message = error.message;
      try {
        if (error.context && typeof error.context.json === 'function') {
          const body = await error.context.json();
          if (body?.error?.message) message = body.error.message;
        }
      } catch {
        // keep the default message
      }
      throw new Error(message || 'Failed to create the staff account');
    }

    return data;
  },

  /**
   * Activate or deactivate an account (admin only). A deactivated user can still sign
   * in but sees no data. Returns the updated profile row.
   */
  async setActive(userId, active) {
    const { data, error } = await supabase.rpc('set_user_active', { user_id: userId, active });
    if (error) throw new Error(error.message);
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

