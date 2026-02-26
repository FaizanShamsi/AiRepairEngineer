exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const { code, language } = JSON.parse(event.body);
    if (!code) return { statusCode: 400, headers, body: JSON.stringify({ error: 'No code provided' }) };

    const prompt = `You are an expert AI Pair Engineer. Analyze the following ${language} code and return ONLY valid JSON (no markdown, no code fences) with exactly this structure:
{
  "overallScore": <integer 0-100>,
  "scores": { "readability": <0-100>, "maintainability": <0-100>, "testability": <0-100>, "performance": <0-100> },
  "designFlaws": [{"title": "...", "description": "...", "severity": "high|medium|low", "fix": "..."}],
  "proposedTests": [{"title": "...", "description": "...", "testCode": "..."}],
  "refactoring": [{"title": "...", "description": "...", "before": "...", "after": "..."}],
  "positives": [{"title": "...", "description": "..."}]
}
Provide 2-3 items per section. Keep descriptions concise. Code snippets max 3-4 lines.
Code:
\`\`\`${language}
${code}
\`\`\``;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    if (!response.ok) return { statusCode: 500, headers, body: JSON.stringify({ error: data.error?.message || 'API error' }) };

    const text = data.content.map(i => i.text || '').join('');
    const clean = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);
    return { statusCode: 200, headers, body: JSON.stringify(result) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
