import { supabase } from './supabase-client.js';
import { getCurrentUser } from './auth.js';

// Cek credit user, reset otomatis jika > 3 jam
export async function getCredit(userId) {
  const { data, error } = await supabase
    .rpc('reset_credits_if_needed', { user_id: userId });
  if (error) throw error;
  return data; // returns current credits
}

// Kurangi credit setelah sukses
export async function useCredit(userId) {
  // Pertama reset credit jika perlu
  const current = await getCredit(userId);
  if (current <= 0) {
    throw new Error('Credit habis. Tunggu reset 3 jam berikutnya.');
  }
  const { data, error } = await supabase
    .from('users')
    .update({ credits: current - 1 })
    .eq('auth_id', userId)
    .select('credits')
    .single();
  if (error) throw error;
  return data.credits;
}

// Tambah statistik sukses/gagal (opsional)
export async function incrementStats(userId, type) {
  const field = type === 'success' ? 'total_success' : 'total_failed';
  const { error } = await supabase
    .from('users')
    .update({ [field]: supabase.rpc('increment', { row_id: userId, column: field }) })
    .eq('auth_id', userId);
  if (error) throw error;
}
