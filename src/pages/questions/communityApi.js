import { getSupabaseClient } from '../../lib/getSupabaseClient';

export async function getCommunityAuthHeaders() {
  const supabase = await getSupabaseClient();
  if (!supabase) return {};
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
