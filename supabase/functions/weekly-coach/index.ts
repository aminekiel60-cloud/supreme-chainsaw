// Supabase Edge Function: weekly coach.
//
// The app sends this week's totals (workouts, food, sleep, no names or photos)
// with the user's login token. This function checks who it is, takes one of
// the week's coach requests (3 per week), asks Claude for short advice and
// returns it as JSON. The Anthropic key lives only here (ANTHROPIC_API_KEY).
import Anthropic from 'npm:@anthropic-ai/sdk@1.6.0';
import { createClient } from 'npm:@supabase/supabase-js@2';

const WEEKLY_LIMIT = 3;
const MAX_BODY = 60_000;

const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
const anthropic = apiKey ? new Anthropic({ apiKey }) : null;
const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}');
const admin = createClient(Deno.env.get('SUPABASE_URL')!, secretKeys.default ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const ADVICE_SCHEMA = {
  type: 'object',
  properties: {
    headline: { type: 'string', description: 'One short sentence that sums up the week' },
    wins: { type: 'array', items: { type: 'string' }, description: 'One to three things that went well, each one short sentence' },
    focus: {
      type: 'array',
      description: 'Two or three concrete things to do next week',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Three to six words' },
          detail: { type: 'string', description: 'One or two short sentences with a concrete action' },
        },
        required: ['title', 'detail'],
        additionalProperties: false,
      },
    },
  },
  required: ['headline', 'wins', 'focus'],
  additionalProperties: false,
};

const SYSTEM = `You are the coach inside Locked in, a fitness, food and habit app. You get one user's numbers for the last 7 days as JSON and write their weekly check-in.

How to write:
- Talk to the user directly, like a good personal trainer texting a client. Warm, honest, specific.
- Use short, plain sentences. Never use dashes (no "—", no "–") and never use the "·" character. Use commas and full stops instead.
- No headings, no markdown, no emojis, no exclamation marks in every sentence.
- Base every point on the numbers you got. Name real numbers (sets, grams, minutes). If something is missing (for example no sleep data), don't guess it.
- Give actions they can do next week: which muscles to add, how much protein to add and with which foods, when to rest.
- This is general fitness advice, not medical advice. If numbers look risky (very low calories, almost no sleep), say gently that they should check with a doctor.`;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Monday of this week in Belgium. */
function weekStart() {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Brussels' }));
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d.toLocaleDateString('en-CA');
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);
  if (!anthropic) return json({ error: 'The AI coach is not switched on yet.' }, 503);

  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  const { data: auth } = token ? await admin.auth.getUser(token) : { data: { user: null } };
  if (!auth.user) return json({ error: 'Please sign in again.' }, 401);

  const raw = await req.text();
  if (raw.length > MAX_BODY) return json({ error: 'Too much data.' }, 400);
  let week: unknown;
  try {
    week = JSON.parse(raw).week;
  } catch {
    return json({ error: 'Bad request.' }, 400);
  }
  if (!week || typeof week !== 'object') return json({ error: 'Bad request.' }, 400);

  const monday = weekStart();
  const { data: used, error: creditError } = await admin.rpc('use_coach_credit', { p_user: auth.user.id, p_week: monday, p_limit: WEEKLY_LIMIT });
  if (creditError) return json({ error: 'Server error, try again.' }, 500);
  if (used === -1) return json({ error: `You asked the coach ${WEEKLY_LIMIT} times this week. New advice on Monday.` }, 429);

  try {
    const response = await anthropic.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema: ADVICE_SCHEMA } },
      system: SYSTEM,
      messages: [{ role: 'user', content: `My last 7 days:\n${JSON.stringify(week)}` }],
    });
    if (response.stop_reason === 'refusal') throw new Error('refused');
    const text = response.content.find((b) => b.type === 'text');
    if (!text || text.type !== 'text') throw new Error('no answer');
    const advice = JSON.parse(text.text);
    return json({ ...advice, remainingThisWeek: WEEKLY_LIMIT - (used as number) });
  } catch (e) {
    await admin.rpc('refund_coach_credit', { p_user: auth.user.id, p_week: monday });
    if (e instanceof Anthropic.RateLimitError) return json({ error: 'The coach is busy. Try again in a minute.' }, 503);
    console.error(e);
    return json({ error: 'The coach could not answer right now. Try again later.' }, 502);
  }
});
