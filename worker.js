/**
 * Marginalia studio: a tiny Cloudflare Worker that plans scenes and draws plates
 * with Workers AI, on your own free Cloudflare account.
 *
 * Needs two things set on the Worker (see README):
 *   - a Workers AI binding named  AI
 *   - a secret named             STUDIO_KEY   (any long random phrase; the app sends it as a Bearer token)
 * Optional plain-text variables:
 *   - IMAGE_MODEL  default @cf/black-forest-labs/flux-2-klein-4b   (falls back to flux-1-schnell)
 *   - TEXT_MODEL   default @cf/meta/llama-3.3-70b-instruct-fp8-fast
 */
const KLEIN = '@cf/black-forest-labs/flux-2-klein-4b';
const SCHNELL = '@cf/black-forest-labs/flux-1-schnell';
const LLAMA = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Expose-Headers': 'X-Studio-Model',
  'Access-Control-Max-Age': '86400',
};
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const clampInt = (v, lo, hi, dflt) => { const n = parseInt(v, 10); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : dflt; };

function sameKey(a, b) {                     // constant-time-ish comparison
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/* Workers AI image models answer in different shapes: {image: base64}, a byte stream, or raw bytes. */
async function toImageResponse(out, model) {
  const headers = { ...CORS, 'Cache-Control': 'no-store', 'X-Studio-Model': model };
  if (out && typeof out === 'object' && typeof out.image === 'string') {
    const bin = atob(out.image); const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const png = bytes[0] === 0x89 && bytes[1] === 0x50;
    return new Response(bytes, { headers: { ...headers, 'Content-Type': png ? 'image/png' : 'image/jpeg' } });
  }
  if (out instanceof ReadableStream || out instanceof ArrayBuffer || ArrayBuffer.isView(out)) return new Response(out, { headers: { ...headers, 'Content-Type': 'image/png' } });
  throw new Error('The image model returned an unexpected shape.');
}

async function drawWith(env, model, { prompt, width, height, seed }) {
  if (/flux-2/.test(model)) {                // FLUX.2 models take multipart form input, even for a bare prompt
    const form = new FormData();
    form.append('prompt', prompt); form.append('width', String(width)); form.append('height', String(height)); form.append('seed', String(seed));
    const packed = new Response(form);
    return env.AI.run(model, { multipart: { body: packed.body, contentType: packed.headers.get('content-type') } });
  }
  if (model === SCHNELL) return env.AI.run(model, { prompt: prompt.slice(0, 2048), steps: 6, seed });   // square only; the app crops
  return env.AI.run(model, { prompt, width, height, seed, num_steps: 8 });                              // SDXL-family models
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const path = new URL(request.url).pathname.replace(/\/+$/, '') || '/';
    if (request.method === 'GET' && path === '/') return json({ ok: true, service: 'marginalia-studio' });

    if (!env.STUDIO_KEY) return json({ error: 'Set a secret named STUDIO_KEY on this Worker.' }, 500);
    if (!env.AI) return json({ error: 'Add a Workers AI binding named AI to this Worker.' }, 500);
    const sent = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    if (!sameKey(sent, env.STUDIO_KEY)) return json({ error: 'Wrong studio secret.' }, 401);
    if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405);

    let body; try { body = await request.json(); } catch { return json({ error: 'Send JSON.' }, 400); }
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt) return json({ error: 'Missing prompt.' }, 400);

    try {
      if (path === '/plan') {
        const model = env.TEXT_MODEL || LLAMA;
        const messages = [
          { role: 'system', content: 'You are a careful art director. Reply with only one valid JSON object and nothing else.' },
          { role: 'user', content: prompt.slice(0, 60000) },
        ];
        let out;
        try { out = await env.AI.run(model, { messages, max_tokens: 1600, temperature: 0.4, response_format: { type: 'json_object' } }); }
        catch { out = await env.AI.run(model, { messages, max_tokens: 1600, temperature: 0.4 }); }      // model without JSON mode
        const r = out && (out.response ?? out.result ?? out);
        return json({ text: typeof r === 'string' ? r : JSON.stringify(r), model });
      }

      if (path === '/draw') {
        const job = { prompt, width: clampInt(body.width, 256, 1920, 768), height: clampInt(body.height, 256, 1920, 1024), seed: clampInt(body.seed, 0, 2147483647, 1) };
        const first = env.IMAGE_MODEL || KLEIN;
        try { return await toImageResponse(await drawWith(env, first, job), first); }
        catch (e) {
          if (first === SCHNELL) throw e;
          return await toImageResponse(await drawWith(env, SCHNELL, job), SCHNELL);                     // dependable fallback
        }
      }
      return json({ error: 'Unknown path. Use /plan or /draw.' }, 404);
    } catch (e) {
      const msg = String(e && e.message || e);
      const status = /capacity|rate|limit|quota|neurons|429/i.test(msg) ? 429 : /nsfw|safety|flagged|blocked/i.test(msg) ? 422 : 502;
      return json({ error: msg.slice(0, 400) }, status);
    }
  },
};
