import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'thanz337';
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'thanz337';

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ status: false, error: 'Supabase credentials missing.' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  if (req.method === 'GET') {
    const query = req.query;
    if (query.action === 'status') {
      const { data } = await supabase.from('profiles').select('credits').eq('username', query.username).single();
      if (!data) return res.status(404).json({ status: false, error: 'User not found' });
      return res.status(200).json({ status: true, credits: data.credits });
    }

    if (query.action === 'stats') {
      const auth = req.headers.authorization;
      if (!auth || !auth.includes('admin_token_ok')) return res.status(403).json({ status: false, error: 'Unauthorized' });

      const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: totalDevices } = await supabase.from('devices').select('*', { count: 'exact', head: true });
      const { data: users } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });

      return res.status(200).json({ status: true, totalUsers: totalUsers || 0, totalDevices: totalDevices || 0, users: users || [] });
    }

    return res.status(400).json({ status: false, error: 'Invalid action' });
  }

  if (req.method === 'POST') {
    const body = req.body;
    if (body.action === 'admin_login') {
      if (body.username === ADMIN_USERNAME && body.password === ADMIN_PASSWORD) {
        return res.status(200).json({ status: true, token: 'admin_token_ok_2026' });
      }
      return res.status(401).json({ status: false, error: 'Username atau password salah.' });
    }

    if (body.action === 'register') {
      const { username, password, device_id } = body;
      const { data: dev } = await supabase.from('devices').select('*').eq('device_id', device_id).single();
      if (dev) return res.status(400).json({ status: false, error: 'Perangkat ini sudah memiliki akun terdaftar.' });

      const { data: newUser, err } = await supabase.from('profiles').insert({ username, password_hash: password, credits: 3 }).select().single();
      if (err || !newUser) return res.status(400).json({ status: false, error: 'Username sudah digunakan.' });

      await supabase.from('devices').insert({ user_id: newUser.id, device_id });
      return res.status(200).json({ status: true, message: 'Berhasil register.' });
    }

    if (body.action === 'login') {
      const { username, password } = body;
      const { data: user } = await supabase.from('profiles').select('*').eq('username', username).single();
      if (!user || user.password_hash !== password) return res.status(401).json({ status: false, error: 'Username atau password salah.' });
      return res.status(200).json({ status: true, token: user.username, username: user.username });
    }
  }

  return res.status(405).json({ status: false, error: 'Method not allowed' });
                                 }
