import { supabase } from './supabase-client.js';

// ========== USER AUTH ==========

export async function signUp(email, password, displayName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName }
    }
  });
  if (error) throw error;
  await syncUserAfterAuth(data.user);
  return data;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  await syncUserAfterAuth(data.user);
  return data;
}

export async function signInWithGitHub() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: window.location.origin + '/fitur.html'
    }
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  localStorage.removeItem('thanzdev_user');
  window.location.href = '/';
}

// Sinkronisasi user ke tabel `users`
export async function syncUserAfterAuth(user) {
  if (!user) return;
  const { data: existing, error: fetchError } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .maybeSingle();

  if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

  if (!existing) {
    // User baru → insert
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        auth_id: user.id,
        email: user.email,
        display_name: user.user_metadata?.display_name || user.email.split('@')[0],
        avatar_url: user.user_metadata?.avatar_url || '',
        credits: 3,
        credit_reset_at: new Date().toISOString()
      });
    if (insertError) throw insertError;
  } else {
    // User sudah ada → update last_login
    await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('auth_id', user.id);
  }

  // Simpan session di localStorage (hanya info dasar)
  localStorage.setItem('thanzdev_user', JSON.stringify({
    id: user.id,
    email: user.email,
    display_name: user.user_metadata?.display_name || user.email.split('@')[0],
    avatar_url: user.user_metadata?.avatar_url || ''
  }));
}

// Cek session saat load
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await syncUserAfterAuth(user);
    return user;
  }
  return null;
}

// ========== ADMIN AUTH ==========
export async function adminLogin(username, password) {
  const res = await fetch('/api/admin-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Login admin gagal');
  localStorage.setItem('thanzdev_admin', JSON.stringify({ token: data.token, username }));
  return data;
}

export function getAdminSession() {
  const raw = localStorage.getItem('thanzdev_admin');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function adminLogout() {
  localStorage.removeItem('thanzdev_admin');
  window.location.href = '/admin-login.html';
}

// Middleware untuk proteksi halaman fitur
export function requireAuth() {
  return getCurrentUser().then(user => {
    if (!user) {
      window.location.href = '/';
      return null;
    }
    return user;
  });
}

// Middleware untuk proteksi dashboard admin
export function requireAdmin() {
  const session = getAdminSession();
  if (!session) {
    window.location.href = '/admin-login.html';
    return null;
  }
  return session;
}
