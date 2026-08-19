import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'thanz337';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'thanz337';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  // Jika akses GET ke /admin (render HTML Admin Panel)
  if (req.method === 'GET') {
    const query = req.query;
    if (query.action === 'status') {
      const { username } = query;
      const { data } = await supabase.from('profiles').select('credits').eq('username', username).single();
      if (!data) return res.status(404).json({ status: false, error: 'User not found' });
      return res.status(200).json({ status: true, credits: data.credits });
    }

    // Render halaman Admin UI
    const html = `<!DOCTYPE html>
    <html lang="id" class="dark">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard | AM Pro Toolkit</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/js/all.min.js"></script>
    <style>body{background:#000308;color:#f8fafc;font-family:Inter,sans-serif;}</style>
    </head>
    <body class="p-4 max-w-4xl mx-auto">
      <div id="adminLoginBox" class="p-6 bg-slate-900/80 border border-cyan-500/30 rounded-2xl shadow-2xl mt-12 max-w-md mx-auto">
        <h2 class="text-xl font-bold text-cyan-400 mb-4"><i class="fa-solid fa-shield-halved mr-2"></i>Admin Portal v2.5</h2>
        <div class="space-y-3">
          <input type="text" id="admUser" placeholder="Admin Username" class="w-full p-3 bg-black/60 border border-cyan-500/30 rounded-xl text-white">
          <input type="password" id="admPass" placeholder="Admin Password" class="w-full p-3 bg-black/60 border border-cyan-500/30 rounded-xl text-white">
          <button onclick="adminLogin()" class="w-full py-3 bg-cyan-500 text-black font-bold rounded-xl">Login Admin</button>
        </div>
      </div>
      <div id="adminDash" class="hidden mt-6">
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-2xl font-bold text-cyan-400">Admin Dashboard</h1>
          <button onclick="loadStats()" class="px-4 py-2 bg-cyan-900/50 border border-cyan-500 text-cyan-300 rounded-xl text-xs">Refresh Statistik</button>
        </div>
        <div id="statsGrid" class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6"></div>
        <h3 class="text-lg font-bold mb-3">User Management</h3>
        <div class="overflow-x-auto bg-slate-900/60 border border-cyan-500/20 rounded-xl p-4">
          <table class="w-full text-left text-xs">
            <thead><tr class="border-b border-cyan-500/20 text-cyan-300"><th>Username</th><th>Credits</th><th>Status</th><th>Registered</th></tr></thead>
            <tbody id="userTableBody"></tbody>
          </table>
        </div>
      </div>
      <script>
        async function adminLogin() {
          const u = document.getElementById('admUser').value;
          const p = document.getElementById('admPass').value;
          const res = await fetch('/api/admin', {method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({action: 'admin_login', username: u, password: p})});
          const d = await res.json();
          if(d.status) {
            localStorage.setItem('admin_token', d.token);
            document.getElementById('adminLoginBox').classList.add('hidden');
            document.getElementById('adminDash').classList.remove('hidden');
            loadStats();
          } else { alert(d.error); }
        }
        async function loadStats() {
          const token = localStorage.getItem('admin_token');
          const res = await fetch('/api/admin?action=stats', {headers: {'Authorization': 'Bearer ' + token}});
          const d = await res.json();
          if(d.status) {
            document.getElementById('statsGrid').innerHTML = \`
              <div class="p-4 bg-black/40 border border-cyan-500/20 rounded-xl"><div class="text-xs text-slate-400">Total User</div><div class="text-xl font-bold text-cyan-300">\${d.totalUsers}</div></div>
              <div class="p-4 bg-black/40 border border-cyan-500/20 rounded-xl"><div class="text-xs text-slate-400">Total Devices</div><div class="text-xl font-bold text-emerald-300">\${d.totalDevices}</div></div>
              <div class="p-4 bg-black/40 border border-cyan-500/20 rounded-xl"><div class="text-xs text-slate-400">Total Usage</div><div class="text-xl font-bold text-cyan-300">\${d.totalUsage}</div></div>
              <div class="p-4 bg-black/40 border border-cyan-500/20 rounded-xl"><div class="text-xs text-slate-400">Usage Hari Ini</div><div class="text-xl font-bold text-emerald-300">\${d.todayUsage}</div></div>
            \`;
            let rows = '';
            d.users.forEach(u => {
              rows += \`<tr class="border-b border-white/5"><td>\${u.username}</td><td>\${u.credits}/3</td><td>\${u.status}</td><td>\{new Date(u.created_at).toLocaleString()}</td></tr>\`;
            });
            document.getElementById('userTableBody').innerHTML = rows;
          }
        }
      </script>
    </body>
    </html>`;
    return res.setHeader('Content-Type', 'text/html').status(200).send(html);
  }

  // Handle POST Request API Admin / Register / Login
  if (req.method === 'POST') {
    const body = req.body;
    
    // 1. Admin Login
    if (body.action === 'admin_login') {
      if (body.username === ADMIN_USERNAME && body.password === ADMIN_PASSWORD) {
        return res.status(200).json({ status: true, token: 'admin_secure_token_session_2026' });
      }
      return res.status(401).json({ status: false, error: 'Username atau password admin salah.' });
    }

    // 2. User Register & Device Binding Check
    if (body.action === 'register') {
      const { username, password, device_id } = body;
      if (!username || !password || !device_id) {
        return res.status(400).json({ status: false, error: 'Data tidak lengkap.' });
      }

      // Cek apakah device_id sudah terdaftar sebelumnya di tabel devices
      const { data: existingDevice } = await supabase.from('devices').select('*').eq('device_id', device_id).single();
      if (existingDevice) {
        return res.status(400).json({ status: false, error: 'Perangkat ini sudah memiliki akun (Device binding terkunci).' });
      }

      // Buat user baru di profiles
      const { data: newUser, err: userErr } = await supabase.from('profiles').insert({
        username,
        password_hash: password, // Di production, gunakan hash
        credits: 3
      }).select().single();

      if (userErr || !newUser) {
        return res.status(400).json({ status: false, error: 'Username sudah digunakan atau gagal membuat akun.' });
      }

      // Simpan device binding
      await supabase.from('devices').insert({
        user_id: newUser.id,
        device_id: device_id
      });

      return res.status(200).json({ status: true, message: 'Registrasi dan device binding berhasil!' });
    }

    // 3. User Login
    if (body.action === 'login') {
      const { username, password } = body;
      const { data: user, error } = await supabase.from('profiles').select('*').eq('username', username).single();
      if (error || !user || user.password_hash !== password) {
        return res.status(401).json({ status: false, error: 'Username atau Password salah.' });
      }
      if (user.status === 'disabled') {
        return res.status(403).json({ status: false, error: 'Akun Anda dinonaktifkan oleh Admin.' });
      }
      return res.status(200).json({ status: true, token: user.username, username: user.username });
    }

    // 4. Admin Stats Endpoint (Protected)
    if (body.action === 'stats' || req.headers.authorization) {
      // Sederhana pengecekan admin token
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.includes('admin_secure_token_session')) {
        return res.status(403).json({ status: false, error: 'Forbidden' });
      }

      const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: totalDevices } = await supabase.from('devices').select('*', { count: 'exact', head: true });
      const { count: totalUsage } = await supabase.from('usage_logs').select('*', { count: 'exact', head: true });
      
      const todayIso = new Date().toISOString().split('T')[0];
      const { count: todayUsage } = await supabase.from('usage_logs').select('*', { count: 'exact', head: true }).gte('created_at', todayIso);
      const { data: users } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });

      return res.status(200).json({
        status: true,
        totalUsers: totalUsers || 0,
        totalDevices: totalDevices || 0,
        totalUsage: totalUsage || 0,
        todayUsage: todayUsage || 0,
        users: users || []
      });
    }

    return res.status(400).json({ status: false, error: 'Invalid action.' });
  }

  return res.status(405).json({ status: false, error: 'Method not allowed' });
}
