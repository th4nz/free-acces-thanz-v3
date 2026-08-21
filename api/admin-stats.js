import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // hanya di server
);

export default async function handler(req, res) {
  // Verifikasi token admin dari header (sederhana)
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const jwt = require('jsonwebtoken');
    jwt.verify(token, process.env.JWT_SECRET || 'rahasia_jwt');
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  try {
    // Ambil total user
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Ambil total sukses & gagal (dari semua user)
    const { data: stats } = await supabase
      .from('users')
      .select('total_success, total_failed');

    let totalSuccess = 0, totalFailed = 0;
    stats.forEach(row => {
      totalSuccess += row.total_success || 0;
      totalFailed += row.total_failed || 0;
    });

    // Ambil data user terbaru (limit 10)
    const { data: recentUsers } = await supabase
      .from('users')
      .select('email, display_name, total_success, total_failed, last_login_at, credits')
      .order('last_login_at', { ascending: false })
      .limit(10);

    res.status(200).json({
      totalUsers,
      totalSuccess,
      totalFailed,
      recentUsers
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
