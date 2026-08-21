export default async function handler(req, res) {
  // Hanya menerima GET (sesuai dengan cara panggil dari frontend)
  const { action, email, url } = req.query;

  const API_BASE = process.env.API_BASE_URL || 'https://restapidhan.vercel.app';
  const API_KEY = process.env.API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ error: 'API key tidak dikonfigurasi' });
  }

  try {
    let targetUrl = `${API_BASE}/api/am?action=${action}&apikey=${API_KEY}&email=${encodeURIComponent(email)}`;
    if (url) {
      targetUrl += `&url=${encodeURIComponent(url)}`;
    }
    const response = await fetch(targetUrl);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
