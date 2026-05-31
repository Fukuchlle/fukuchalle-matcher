export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { career } = req.body;
  if (!career || career.trim().length === 0) {
    return res.status(400).json({ error: "経歴が入力されていません" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "APIキーが設定されていません" });
  }

  const prompt = `あなたは副業・フリーランスのキャリアアドバイザーです。
以下の経歴・スキル情報を分析して、向いている副業案件を幅広く提案してください。

【重要な提案ルール】
- IT・デザイン・ライティング・コンサル・教育・医療・製造・営業など、あらゆる職種・業界を対象に偏りなく提案すること
- 経歴に合わせて、スポットコンサル・業務委託・スキル販売・講師・執筆など多様な形式を提案すること
- 1つの職種カテゴリに偏らず、異なる切り口で案件タイプを提案すること

経歴・スキル：
${career}

以下のJSON形式のみで返答してください。前置き・説明文・マークダウン記法は一切不要です。JSONのみ出力してください。

{
  "summary": "この人の強みと副業の方向性を2〜3文で（日本語）",
  "profile": "副業マッチングサイトに登録するための自己PRプロフィール文（150文字程度、日本語、一人称は「私」）",
  "jobTypes": [
    {
      "title": "案件タイプ名（12文字以内）",
      "description": "なぜ向いているか・どんな仕事か（50文字程度）",
      "siteCategory": "consult | creative | it | skill | general のいずれか",
      "keywords": ["検索キーワード1", "検索キーワード2", "検索キーワード3"]
    }
  ]
}

jobTypesは5〜6件。各タイプのsiteCategoryは偏らないようにすること。keywordsは各タイプに3つ。`;

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1500,
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errData = await geminiRes.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Gemini API error: ${geminiRes.status}`);
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const jsonStr = rawText.replace(/^```json\s*/m, "").replace(/^```\s*/m, "").replace(/```\s*$/m, "").trim();
    const parsed = JSON.parse(jsonStr);

    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(500).json({ error: e.message || "分析中にエラーが発生しました" });
  }
}
