// api/scan.js - BottleScan 백엔드
// 바코드 + 이미지 라벨 분석 + 이름 검색 + Vercel KV 카운터

import { kv } from '@vercel/kv';

const BARCODE_LIMIT = 150;
const IMAGE_LIMIT = 20;

function getMonthKey(userId, type) {
  const ym = new Date().toISOString().slice(0, 7);
  return `bottlescan:${type}:${userId}:${ym}`;
}

async function getCount(userId, type) {
  const key = getMonthKey(userId, type);
  const val = await kv.get(key);
  return parseInt(val || '0');
}

async function incrementCount(userId, type) {
  const key = getMonthKey(userId, type);
  const count = await kv.incr(key);
  if (count === 1) {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const ttl = Math.floor((nextMonth - now) / 1000);
    await kv.expire(key, ttl);
  }
  return count;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { barcode, drinkName, imageData, userId } = req.body;
  if (!barcode) return res.status(400).json({ error: '바코드가 없어요' });
  if (!userId) return res.status(400).json({ error: 'userId가 없어요' });

  if (barcode === 'IMAGE_SCAN') {
    const imageUsed = await getCount(userId, 'image');
    if (imageUsed >= IMAGE_LIMIT) {
