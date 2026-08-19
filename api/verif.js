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

    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', token)
      .single();

    if (profileErr || !profile) {
      return res.status(401).json({ status: false, error: 'Unauthorized user session.' });
    }

    const { email, magicLink } = req.body;
    if (!email || !magicLink) {
      return res.status(400).json({ status: false, error: 'Email dan Magic Link wajib diisi.' });
    }

    // 1. Panggil Upstream Eksternal Verifikasi/Inject
    const upstreamRes = await fetch(`${API_BASE_URL}/verif`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({ email, magicLink })
    });

    const upstreamData = await upstreamRes.json();
    
    // Jika upstream gagal/tidak valid, jangan kurangi kredit
    if (!upstreamRes.ok || upstreamData.status === false) {
      // Catat log gagal
      await supabase.from('usage_logs').insert({
        user_id: profile.id,
        action: 'inject_verify',
        status: 'failed',
        credits_used: 0,
        metadata: { error: upstreamData.error || 'Upstream failed' }
      });
      return res.status(400).json({ status: false, error: upstreamData.error || 'Verifikasi Magic Link gagal di upstream.' });
    }

    // 2. Eksekusi Atomic Credit Deduction via Supabase RPC (Mencegah kredit negatif & race condition)
    const { data: deductSuccess, error: rpcErr } = await supabase.rpc('deduct_user_credit', {
      p_user_id: profile.id
    });

    if (rpcErr || !deductSuccess) {
      return res.status(400).json({ status: false, error: 'Credit Anda sudah habis atau sudah mencapai limit 24 jam.' });
    }

    // 3. Catat Usage Log sukses
    await supabase.from('usage_logs').insert({
      user_id: profile.id,
      action: 'inject_verify',
      status: 'success',
      credits_used: 1,
      metadata: { email }
    });

    return res.status(200).json({ status: true, message: 'Verifikasi & Inject Berhasil! 1 Kredit dikurangi.' });

  } catch (err) {
    return res.status(500).json({ status: false, error: 'Server error: ' + err.message });
  }
  }
