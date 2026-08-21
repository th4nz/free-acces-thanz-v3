import bcrypt from 'bcryptjs';

// Idealnya admin credentials disimpan di Supabase, tapi untuk demo kita pakai env
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin_root';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'rahasia123'; // should be hashed in production

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password } = req.body;

  if (username !== ADMIN_USERNAME) {
    return res.status(401).json({ message: 'Username atau password salah' });
  }

  // Untuk production, bandingkan dengan bcrypt hash
  const isValid = password === ADMIN_PASSWORD;
  // Jika pakai bcrypt: const isValid = await bcrypt.compare(password, hashed);

  if (!isValid) {
    return res.status(401).json({ message: 'Username atau password salah' });
  }

  // Buat token sederhana (JWT) untuk session admin
  const jwt = require('jsonwebtoken');
  const token = jwt.sign(
    { username, role: 'admin' },
    process.env.JWT_SECRET || 'rahasia_jwt',
    { expiresIn: '1d' }
  );

  res.status(200).json({ token, username });
}
