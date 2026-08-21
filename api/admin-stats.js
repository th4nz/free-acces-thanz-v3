import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // hanya di server
);

export default async function handler(req, res) {
  // Verifikasi token admin
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  try {
    jwt.verify(token, process.env.JWT_SECRET || 'rahasia_jwt');
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  try {
    // Total user
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Total sukses & gagal
    const { data: stats } = await supabase
      .from('users')
      .select('total_success, total_failed');

    let totalSuccess = 0, totalFailed = 0;
    stats.forEach(row => {
      totalSuccess += row.total_success || 0;
      totalFailed += row.total_failed || 0;
    });

    // 10 user terbaru
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
