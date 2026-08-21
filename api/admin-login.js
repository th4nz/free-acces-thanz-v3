import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password } = req.body;

  const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin_root';
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'rahasia123';

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ message: 'Username atau password salah' });
  }

  const token = jwt.sign(
    { username, role: 'admin' },
    process.env.JWT_SECRET || 'rahasia_jwt',
    { expiresIn: '1d' }
  );

  res.status(200).json({ token, username });
}
