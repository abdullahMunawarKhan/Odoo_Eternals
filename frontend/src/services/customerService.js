import { supabase } from '../lib/supabase';

export const customerService = {
  /**
   * Fetch customer details linked to profile
   */
  async getCustomerDetails(profileId) {
    if (!profileId) return null;

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('profile_id', profileId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching customer details:', error);
      throw error;
    }
    return data;
  },

  /**
   * Update customer company and phone
   */
  async updateCustomerDetails(profileId, { companyName, phone }) {
    if (!profileId) throw new Error('Missing profile ID');

    const { data, error } = await supabase
      .from('customers')
      .upsert(
        {
          profile_id: profileId,
          company_name: companyName?.trim() || null,
          phone: phone?.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'profile_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('Error updating customer details:', error);
      throw error;
    }
    return data;
  },
};

