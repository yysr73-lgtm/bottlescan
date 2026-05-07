// api/scan.js
// BottleScan 백엔드 - Open Food Facts + Claude AI

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { barcode } = req.body;
  if (!barcode) return res.status(400).json({ error: '바코드가 없어요' });

  // 1) Open Food Facts DB 조회
  let productInfo = '';
  try {
    const offRes = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const offData = await offRes.json();
    if (offData.status === 1 && offData.product) {
      const p = offData.product;
      const name = p.product_name || p.product_name_ko || p.product_name_en || '';
      const brand = p.brands || '';
      const category = p.categories || '';
      const country = p.countries || '';
      const quantity = p.quantity || '';
      if (name || brand) {
        productInfo = `제품명: ${name}, 브랜드: ${brand}, 카테고리: ${category}, 원산지: ${country}, 용량: ${quantity}`;
      }
    }
  } catch (e) {
    console.log('Open Food Facts 조회 실패:', e.message);
  }

  // 2) Claude에게 정보 전달
  const prompt = productInfo
    ? `당신은 주류 전문 소믈리에입니다. 아래 제품 정보를 바탕으로 상세한 술 정보를 알려주세요.

제품 정보: ${productInfo}
바코드: ${barcode}

반드시 아래 JSON만 응답하세요. 절대 "알 수 없음" 금지. 모르면 비슷한 제품으로 추정해서라도 채워주세요:
{"name":"술이름","type":"레드와인|화이트와인|스파클링|로제|위스키|버번|스카치|맥주|에일|사케|청주|소주|진|보드카|테킬라|브랜디|기타","vintage":"연도또는NV","region":"원산지(국가,지역)","ingredient":"주요원료또는품종","abv":13.5,"volume":"750ml","price_range":"₩30,000~50,000","rating":4.2,"tasting":"테이스팅노트2~3문장","pairings":["음식1","음식2","음식3"],"description":"소개2~3문장"}`
    : `당신은 주류 전문 소믈리에입니다.
바코드: ${barcode}

규칙:
1. 바코드 앞자리 국가코드: 30~37=프랑스, 40~44=독일, 45~49=일본, 80~83=이탈리아, 84=스페인, 880=한국, 00~09=미국/캐나다, 76=스위스, 54=벨기에
2. 880으로 시작해도 수입 와인/위스키일 수 있음. 단정 금지.
3. 절대 "알 수 없음", "모름", "확인 불가" 금지! 반드시 해당 국가의 실제 존재하는 술 정보를 추정해서 제공.
4. price_range 반드시 ₩ 단위로 입력.
5. abv 반드시 숫자로 입력.

반드시 아래 JSON만 응답:
{"name":"술이름","type":"레드와인|화이트와인|스파클링|로제|위스키|버번|스카치|맥주|에일|사케|청주|소주|진|보드카|테킬라|브랜디|기타","vintage":"연도또는NV","region":"원산지(국가,지역)","ingredient":"주요원료또는품종","abv":13.5,"volume":"750ml","price_range":"₩30,000~50,000","rating":4.2,"tasting":"테이스팅노트2~3문장","pairings":["음식1","음식2","음식3"],"description":"소개2~3문장"}`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      }),
    });

    const data = await r.json();
    if (data.error) return res.status(500).json({ error: 'Claude API 오류', detail: data.error.message });

    const raw = data?.content?.[0]?.text || '';
    const drink = JSON.parse(raw.replace(/```json|```/g, '').trim());

    return res.status(200).json({
      ...drink,
      _meta: {
        used: 1,
        remaining: 149,
        limit: 150,
        source: productInfo ? 'DB조회+AI' : 'AI추정'
      }
    });

  } catch (e) {
    return res.status(500).json({ error: '오류발생', detail: e.message });
  }
}
