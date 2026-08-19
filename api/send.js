import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API_BASE_URL = process.env.API_BASE_URL;
const API_KEY = process.env.API_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: false, error: 'Method not allowed' });
  }

  if (!API_BASE_URL || !API_KEY) {
    return res.status(500).json({ status: false, error: 'API_BASE_URL belum dikonfigurasi.' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ status: false, error: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    
    // Verifikasi token session sederhana / mapping dari username
    // Untuk production, token bisa berupa signed JWT dari Supabase Auth
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', token) // mapping token sederhana atau gunakan auth.users
      .single();

    if (profileErr || !profile) {
      return res.status(401).json({ status: false, error: 'Unauthorized user session.' });
    }

    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ status: false, error: 'Email wajib diisi.' });
    }

    // Panggil API Upstream Eksternal
    const upstreamRes = await fetch(`${API_BASE_URL}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({ email })
    });

    const upstreamData = await upstreamRes.json();
    return res.status(200).json({ status: true, message: 'Magic link berhasil dikirim', data: upstreamData });

  } catch (err) {
    return res.status(500).json({ status: false, error: 'Internal server error: ' + err.message });
  }
}
