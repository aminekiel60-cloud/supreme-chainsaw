// Supabase Edge Function: AI meal photo → foods with grams, calories and macros.
//
// The app sends a JPEG (base64) with the user's login token. This function:
// 1. checks who the user is, 2. takes one of today's AI credits (limit per day),
// 3. asks Claude to identify the food, 4. returns structured JSON.
// The Anthropic API key lives only here, as the ANTHROPIC_API_KEY secret.
import Anthropic from 'npm:@anthropic-ai/sdk@1.6.0';
import { createClient } from 'npm:@supabase/supabase-js@2';

const DAILY_LIMIT = 5;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });
const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SECRET_KEY')!,
);

const MEAL_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Short food name in English, e.g. "Grilled chicken breast"' },
          grams: { type: 'number', description: 'Estimated weight of this portion in grams' },
          kcal: { type: 'number' },
          protein: { type: 'number', description: 'grams' },
          carbs: { type: 'number', description: 'grams' },
          fat: { type: 'number', description: 'grams' },
        },
        required: ['name', 'grams', 'kcal', 'protein', 'carbs', 'fat'],
        additionalProperties: false,
      },
    },
    confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
    note: { type: 'string', description: 'One short sentence for the user, e.g. what was hard to estimate' },
  },
  required: ['items', 'confidence', 'note'],
  additionalProperties: false,
};

const PROMPT = `You are the food recognition feature of a fitness app. Identify every food and drink in this photo and estimate each portion's weight and nutrition (kcal, protein, carbs, fat in grams), using typical European portion sizes and recipes when unsure.
If the photo contains no food, return an empty items list and say so in the note.`;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Today's date in Belgium, so the daily limit resets at local midnight. */
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Brussels' });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);

  // 1. Who is calling?
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  const { data: auth } = token ? await admin.auth.getUser(token) : { data: { user: null } };
  if (!auth.user) return json({ error: 'Please sign in again.' }, 401);

  const { image } = (await req.json().catch(() => ({}))) as { image?: string };
  if (!image || image.length * 0.75 > MAX_IMAGE_BYTES) return json({ error: 'Photo missing or too large.' }, 400);

  // 2. Take one credit for today.
  const day = today();
  const { data: used, error: creditError } = await admin.rpc('use_ai_credit', {
    p_user: auth.user.id,
    p_day: day,
    p_limit: DAILY_LIMIT,
  });
  if (creditError) return json({ error: 'Server error, try again.' }, 500);
  if (used === -1) return json({ error: `You've used your ${DAILY_LIMIT} AI photos for today. Try again tomorrow!` }, 429);

  // 3. Ask Claude.
  try {
    const response = await anthropic.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: MEAL_SCHEMA },
      },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
    });

    if (response.stop_reason === 'refusal') throw new Error('refused');
    const text = response.content.find((b) => b.type === 'text');
    if (!text || text.type !== 'text') throw new Error('no answer');
    const meal = JSON.parse(text.text);

    // 4. Done.
    return json({ ...meal, remainingToday: DAILY_LIMIT - (used as number) });
  } catch (e) {
    await admin.rpc('refund_ai_credit', { p_user: auth.user.id, p_day: day });
    if (e instanceof Anthropic.RateLimitError) return json({ error: 'AI is busy right now. Try again in a minute.' }, 503);
    console.error(e);
    return json({ error: 'Could not analyse this photo. Try another one or add the food by hand.' }, 502);
  }
});
