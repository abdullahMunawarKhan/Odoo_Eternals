import { supabase } from '../lib/supabase';

export const authService = {
  /**
   * Sign in with email and password
   */
  async login({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw error;
    return data;
  },

  /**
   * Register customer (public registration always assigns customer role)
   */
  async registerCustomer({ email, password, fullName, companyName = '', phone = '' }) {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          company_name: companyName.trim(),
          phone: phone.trim(),
          role: 'customer', // strictly customer
        },
      },
    });
    if (error) throw error;

    // Optional: If session is immediately available, ensure profile/customer rows are in sync
    if (data?.user) {
      // The database trigger creates profile and customer rows automatically
    }

    return data;
  },

  /**
   * Send password reset email
   */
  async forgotPassword({ email }) {
    const redirectUrl = `${window.location.origin}/reset-password`;
    const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: redirectUrl,
    });
    if (error) throw error;
    return data;
  },

  /**
   * Update password (used when clicking reset link)
   */
  async resetPassword({ newPassword }) {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw error;
    return data;
  },

  /**
   * Sign out
   */
  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /**
   * Get current session
   */
  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  /**
   * Get user profile and role from profiles table
   */
  async getUserProfile(userId) {
    if (!userId) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
    return data;
  },

  /**
   * Update current user's profile details (full_name)
   */
  async updateProfile(userId, { fullName }) {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  },
};

