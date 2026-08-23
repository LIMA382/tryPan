import { NextResponse } from 'next/server';

function textFromResponse(result) {
  for (const output of result.output || []) {
    for (const content of output.content || []) if (content.type === 'output_text') return content.text;
  }
  return '';
}

export async function POST(request) {
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ configured: false, suggestions: [] });
  try {
    const body = await request.json();
    const pantry = Array.isArray(body.pantry) ? body.pantry.slice(0, 80) : [];
    const candidates = Array.isArray(body.candidates) ? body.candidates.slice(0, 60) : [];
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-5.4', store: false,
        instructions: 'You are tryPan, a practical meal coach for one student. Select exactly three different meals, strongly prefer the supplied recipe candidates, maximize pantry use, respect time and budget, and keep reasons short. Never claim an ingredient is available unless it appears in the pantry. If using a candidate, copy its title and mealId exactly.',
        input: JSON.stringify({ pantry, preferences: body.preferences || {}, recipeCandidates: candidates }),
        text: { format: { type: 'json_schema', name: 'meal_recommendations', strict: true, schema: { type: 'object', additionalProperties: false, properties: { suggestions: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'object', additionalProperties: false, properties: { mealId: { type: 'string' }, title: { type: 'string' }, reason: { type: 'string' }, pantryMatch: { type: 'string' }, missing: { type: 'array', items: { type: 'string' } }, prepTime: { type: 'integer' } }, required: ['mealId', 'title', 'reason', 'pantryMatch', 'missing', 'prepTime'] } } }, required: ['suggestions'] } } },
      }),
    });
    if (!response.ok) return NextResponse.json({ error: 'Meal suggestions are temporarily unavailable.' }, { status: 502 });
    const result = await response.json();
    const parsed = JSON.parse(textFromResponse(result));
    return NextResponse.json({ configured: true, suggestions: parsed.suggestions });
  } catch {
    return NextResponse.json({ error: 'Meal suggestions are temporarily unavailable.' }, { status: 502 });
  }
}
