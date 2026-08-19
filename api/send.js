const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ status: false, error: 'Method not allowed' });
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const API_BASE_URL = process.env.API_BASE_URL;
  const API_KEY = process.env.API_KEY;

  if (!supabaseUrl || !supabaseKey || !API_BASE_URL || !API_KEY) {
    return res.status(500).json({ status: false, error: 'Konfigurasi Server Environment Variables belum lengkap.' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ status: false, error: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];

    const { data: user } = await supabase.from('profiles').select('*').eq('username', token).single();
    if (!user) return res.status(401).json({ status: false, error: 'Sesi user tidak valid.' });

    const { email } = req.body;
    if (!email) return res.status(400).json({ status: false, error: 'Email wajib diisi.' });

    const upstream = await fetch(`${API_BASE_URL}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
      body: JSON.stringify({ email })
    });

    const result = await upstream.json();
    return res.status(200).json({ status: true, message: 'Berhasil dikirim', data: result });
  } catch (err) {
    return res.status(500).json({ status: false, error: err.message });
  }
};
