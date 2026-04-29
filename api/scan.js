// api/scan.js
// BottleScan 백엔드 - KV 없는 간단 버전
// 필요 환경변수: ANTHROPIC_API_KEY

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { barcode } = req.body;
  if (!barcode) return res.status(400).json({ error: '바코드가 없어요' });

  const prompt = `당신은 주류 전문 소믈리에이자 바텐더입니다. 아래 바코드 번호에 해당하는 술 정보를 알려주세요.

바코드: ${barcode}

규칙:
1. 바코드 앞자리(국가코드)를 참고해 해당 국가의 실제 주류 정보를 제공하세요.
   - 30~37: 프랑스, 40~44: 독일, 45~49: 일본, 80~83: 이탈리아, 84: 스페인, 880: 한국, 00~09: 미국/캐나다
2. 절대 알 수 없다고 하지 마세요. 바코드 국가코드에 맞는 실제 존재하는 술 정보를 제공하세요.
3. type은 반드시 다음 중 하나: 레드와인 / 화이트와인 / 스파클링 / 로제 / 위스키 / 버번 / 스카치 / 맥주 / 에일 / 사케 / 청주 / 소주 / 진 / 보드카 / 테킬라 / 브랜디 / 기타
4. price_range(가격대)는 반드시 포함. 한국 기준 예상 가격을 원화로 표기.
5. abv(도수)도 반드시 포함.
6. ingredient: 와인이면 포도품종, 위스키면 곡물 종류, 맥주면 홉/맥아 등.

반드시 아래 JSON 형식으로만 응답하세요. JSON 외 다른 텍스트 절대 금지:

{
  "name": "술 이름",
  "type": "주류 종류",
  "vintage": "빈티지 연도 또는 NV",
  "region": "원산지 (국가, 지역)",
  "ingredient": "주요 원료 또는 품종",
  "abv": 13.5,
  "volume": "750ml",
  "price_range": "한국 기준 예상 가격대",
  "rating": 4.2,
  "tasting": "테이스팅 노트 2~3문장",
  "pairings": ["음식1", "음식2", "음식3"],
  "description": "소개 2~3문장"
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error('Claude API error:', data.error);
      return res.status(500).json({ error: 'Claude API 오류', detail: data.error.message });
    }

    const raw = data?.content?.[0]?.text || '';
    const clean = raw.replace(/```json|```/g, '').trim();
    const drink = JSON.parse(clean);

    return res.status(200).json({
      ...drink,
      _meta: { used: 1, remaining: 149, limit: 150 }
    });

  } catch (e) {
    console.error('BottleScan error:', e);
    return res.status(500).json({ error: '정보를 가져오지 못했어요', detail: e.message });
  }
}
