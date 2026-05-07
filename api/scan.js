export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { barcode } = req.body;
  if (!barcode) return res.status(400).json({ error: '바코드가 없어요' });
  const prompt = `당신은 주류 전문 소믈리에입니다. 바코드: ${barcode}
바코드 국가코드 참고(30~37:프랑스, 45~49:일본, 880:한국, 00~09:미국).
반드시 아래 JSON만 응답하세요:
{"name":"술이름","type":"레드와인|화이트와인|스파클링|로제|위스키|버번|스카치|맥주|에일|사케|소주|진|보드카|테킬라|브랜디|기타","vintage":"연도또는NV","region":"원산지","ingredient":"원료","abv":13.5,"volume":"750ml","price_range":"₩30,000~50,000","rating":4.2,"tasting":"테이스팅노트","pairings":["음식1","음식2","음식3"],"description":"소개"}`;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 1000, messages: [{ role: 'user', content: prompt }] }),
    });
    const data = await r.json();
    if (data.error) return res.status(500).json({ error: 'Claude API 오류', detail: data.error.message });
    const raw = data?.content?.[0]?.text || '';
    const drink = JSON.parse(raw.replace(/```json|```/g, '').trim());
    return res.status(200).json({ ...drink, _meta: { used: 1, remaining: 149, limit: 150 } });
  } catch (e) {
    return res.status(500).json({ error: '오류발생', detail: e.message });
  }
}
