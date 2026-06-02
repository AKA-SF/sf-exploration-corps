export async function getSupabaseClient() {
  const { supabase } = await import('./supabaseClient');
  return supabase;
}
