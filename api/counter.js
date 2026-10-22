// api/counter.js
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId 없음' });

  const ym = new Date().toISOString().slice(0, 7);

  const [barcodeUsed, imageUsed] = await Promise.all([
    redis.get(`bottlescan:barcode:${userId}:${ym}`),
    redis.get(`bottlescan:image:${userId}:${ym}`)
  ]);

  return res.status(200).json({
    barcode: { used: parseInt(barcodeUsed || '0'), limit: 150, remaining: 150 - parseInt(barcodeUsed || '0') },
    image: { used: parseInt(imageUsed || '0'), limit: 20, remaining: 20 - parseInt(imageUsed || '0') }
  });
}
