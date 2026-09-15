/**
 * Pimpão — Worker de tracking (Meta CAPI + registro de leads p/ Google Ads)
 *
 * Endpoints:
 *   POST /event      -> espelha evento do Pixel para o Meta CAPI (mesmo event_id = dedup)
 *   GET  /leads.csv  -> exporta leads (gclid, telefone, data) p/ importação offline no Google Ads
 *                       requer header  x-admin-key: <ADMIN_KEY>
 *   GET  /health     -> ok
 *
 * Segredos (wrangler secret put): META_PIXEL_ID, META_CAPI_TOKEN, META_TEST_CODE (opcional), ADMIN_KEY
 */

const GRAPH_VERSION = 'v21.0';
const ALLOWED_EVENTS = new Set(['PageView', 'ViewContent', 'AddToWishlist', 'Contact', 'Lead', 'Schedule', 'Purchase']);
const HEX64 = /^[a-f0-9]{64}$/i;

// ---------- normalização (IDÊNTICA ao client em src/components/Tracking.astro) ----------
const normalize = (s) => (s || '').toString().trim().toLowerCase();
const normName = (s) => normalize(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
const digitsOnly = (s) => (s || '').toString().replace(/\D/g, '');
function normPhone(s) {
  let d = digitsOnly(s);
  if (!d) return '';
  if ((d.length === 10 || d.length === 11) && !d.startsWith('55')) d = '55' + d; // BR sem DDI
  return d;
}
async function sha256(input) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
async function maybeHash(v) {
  if (!v) return undefined;
  if (HEX64.test(v)) return v.toLowerCase();
  return sha256(v);
}

// ---------- CORS ----------
function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const ok = allowed.includes(origin) || allowed.includes('*');
  return {
    'Access-Control-Allow-Origin': ok ? origin : 'null',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-key',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}
const json = (data, status, headers) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...headers } });

// ---------- KV helpers (best-effort, nunca quebram o fluxo) ----------
async function kvGetLead(env, vid) {
  if (!env.LEADS || !vid) return null;
  try {
    return await env.LEADS.get('lead:' + vid, 'json');
  } catch {
    return null;
  }
}
async function kvPutLead(env, vid, data) {
  if (!env.LEADS || !vid) return;
  try {
    const prev = (await kvGetLead(env, vid)) || {};
    const merged = { ...prev, ...data, updated_at: new Date().toISOString() };
    if (!prev.created_at) merged.created_at = merged.updated_at;
    if (prev.lead_at && !data.lead_at) merged.lead_at = prev.lead_at;
    await env.LEADS.put('lead:' + vid, JSON.stringify(merged), { expirationTtl: 60 * 60 * 24 * 365 });
  } catch {
    /* ignore */
  }
}

// ---------- /event ----------
async function handleEvent(request, env, ctx) {
  const cors = corsHeaders(request, env);
  if (!env.META_PIXEL_ID || !env.META_CAPI_TOKEN) {
    return json({ ok: false, error: 'META_PIXEL_ID/META_CAPI_TOKEN nao configurados' }, 500, cors);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'JSON invalido' }, 400, cors);
  }

  const event_name = body.event_name;
  if (!ALLOWED_EVENTS.has(event_name)) return json({ ok: false, error: 'evento nao permitido' }, 400, cors);
  const event_id = (body.event_id || '').toString().slice(0, 120);
  if (!event_id) return json({ ok: false, error: 'event_id obrigatorio' }, 400, cors);

  const ip = request.headers.get('CF-Connecting-IP') || '';
  const ua = request.headers.get('User-Agent') || '';
  const cf = request.cf || {};
  const external_id = (body.external_id || '').toString().slice(0, 120);

  // PII do body (normalizada de novo por segurança; aceita já hasheada)
  const ud = body.user_data || {};
  let em_raw = HEX64.test(ud.em || '') ? ud.em : normalize(ud.em);
  let ph_raw = HEX64.test(ud.ph || '') ? ud.ph : normPhone(ud.ph);
  let fn_raw = HEX64.test(ud.fn || '') ? ud.fn : normName(ud.fn);
  let ln_raw = HEX64.test(ud.ln || '') ? ud.ln : normName(ud.ln);

  // Hidratação cross-device: sem PII no body mas já conhecemos esse visitante
  let stored = null;
  if (external_id && !(em_raw || ph_raw || fn_raw)) {
    stored = await kvGetLead(env, external_id);
    if (stored) {
      em_raw = em_raw || stored.em || '';
      ph_raw = ph_raw || stored.ph || '';
      fn_raw = fn_raw || stored.fn || '';
      ln_raw = ln_raw || stored.ln || '';
    }
  }

  // Geo em cascata: body.geo -> Cloudflare
  const geo = body.geo || {};
  const ct_raw = normName(geo.ct || cf.city);
  const st_raw = normalize(geo.st || cf.regionCode).replace(/[^a-z]/g, '');
  const zp_raw = digitsOnly(geo.zp || cf.postalCode).slice(0, 5);
  const country_raw = normalize(geo.country || cf.country).slice(0, 2);

  const [em, ph, fn, ln, ct, st, zp, country, ext] = await Promise.all([
    em_raw ? maybeHash(em_raw) : undefined,
    ph_raw ? maybeHash(ph_raw) : undefined,
    fn_raw ? maybeHash(fn_raw) : undefined,
    ln_raw ? maybeHash(ln_raw) : undefined,
    ct_raw ? sha256(ct_raw) : undefined,
    st_raw ? sha256(st_raw) : undefined,
    zp_raw ? sha256(zp_raw) : undefined,
    country_raw ? sha256(country_raw) : undefined,
    external_id ? sha256(external_id) : undefined,
  ]);

  const user_data = { client_ip_address: ip, client_user_agent: ua };
  if (em) user_data.em = [em];
  if (ph) user_data.ph = [ph];
  if (fn) user_data.fn = [fn];
  if (ln) user_data.ln = [ln];
  if (ct) user_data.ct = [ct];
  if (st) user_data.st = [st];
  if (zp) user_data.zp = [zp];
  if (country) user_data.country = [country];
  if (ext) user_data.external_id = [ext];
  if (body.fbp) user_data.fbp = String(body.fbp).slice(0, 200); // cru
  if (body.fbc) user_data.fbc = String(body.fbc).slice(0, 300); // cru

  const custom_data = { content_type: 'product', ...(body.custom_data || {}) };
  if (custom_data.value !== undefined && custom_data.value !== null && !custom_data.currency) custom_data.currency = 'BRL';

  const capiEvent = {
    event_name,
    event_id,
    event_time: Math.floor(Date.now() / 1000),
    event_source_url: (body.page_url || '').toString().slice(0, 500),
    action_source: 'website',
    user_data,
    custom_data,
  };

  const payload = { data: [capiEvent], ...(env.META_TEST_CODE ? { test_event_code: env.META_TEST_CODE } : {}) };
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${env.META_PIXEL_ID}/events?access_token=${encodeURIComponent(env.META_CAPI_TOKEN)}`;

  let capi = { status: 0, body: null };
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    capi = { status: r.status, body: await r.json().catch(() => null) };
  } catch (e) {
    capi = { status: 0, body: { error: String(e) } };
  }

  // Persistência do lead (quando há PII ou id de clique) — best-effort, em background
  const lead = body.lead || {};
  const hasLeadData = em_raw || ph_raw || fn_raw || lead.gclid || lead.gbraid || lead.wbraid;
  if (external_id && hasLeadData) {
    const rec = {
      em: em_raw && !HEX64.test(em_raw) ? em_raw : undefined,
      ph: ph_raw && !HEX64.test(ph_raw) ? ph_raw : undefined,
      fn: fn_raw && !HEX64.test(fn_raw) ? fn_raw : undefined,
      ln: ln_raw && !HEX64.test(ln_raw) ? ln_raw : undefined,
      nome: lead.nome ? String(lead.nome).slice(0, 120) : undefined,
      tipo: lead.tipo ? String(lead.tipo).slice(0, 60) : undefined,
      data_evento: lead.data_evento ? String(lead.data_evento).slice(0, 20) : undefined,
      convidados: lead.convidados ? String(lead.convidados).slice(0, 20) : undefined,
      gclid: lead.gclid ? String(lead.gclid).slice(0, 200) : undefined,
      gbraid: lead.gbraid ? String(lead.gbraid).slice(0, 200) : undefined,
      wbraid: lead.wbraid ? String(lead.wbraid).slice(0, 200) : undefined,
      fbc: body.fbc ? String(body.fbc).slice(0, 300) : undefined,
      utm: lead.utm && typeof lead.utm === 'object' ? lead.utm : undefined,
      city: cf.city,
      region: cf.regionCode,
      country: cf.country,
      last_event: event_name,
      lead_at: event_name === 'Lead' ? new Date().toISOString() : undefined,
    };
    Object.keys(rec).forEach((k) => rec[k] === undefined && delete rec[k]);
    ctx.waitUntil(kvPutLead(env, external_id, rec));
  }

  const ok = capi.status === 200;
  return json({ ok, event_id, capi_status: capi.status, ...(ok ? {} : { capi: capi.body }) }, ok ? 200 : 502, cors);
}

// ---------- /leads.csv (export p/ Google Ads "importar conversões offline") ----------
async function handleLeadsCsv(request, env) {
  if (!env.ADMIN_KEY || request.headers.get('x-admin-key') !== env.ADMIN_KEY) return new Response('unauthorized', { status: 401 });
  if (!env.LEADS) return new Response('KV LEADS nao configurado', { status: 500 });

  const header = ['Google Click ID', 'Conversion Name', 'Conversion Time', 'Conversion Value', 'Conversion Currency', 'nome', 'telefone', 'tipo', 'data_evento', 'convidados', 'cidade', 'gbraid', 'wbraid', 'vid'];
  const rows = [header];
  let cursor;
  do {
    const page = await env.LEADS.list({ prefix: 'lead:', cursor, limit: 1000 });
    for (const k of page.keys) {
      const l = await env.LEADS.get(k.name, 'json');
      if (!l) continue;
      const when = l.lead_at || l.created_at || '';
      // Formato aceito pelo Google Ads: yyyy-MM-dd HH:mm:ss+HH:mm
      const t = when ? when.replace('T', ' ').replace(/\.\d+Z$/, '+00:00') : '';
      rows.push([l.gclid || '', 'Lead', t, '', 'BRL', l.nome || '', l.ph || '', l.tipo || '', l.data_evento || '', l.convidados || '', l.city || '', l.gbraid || '', l.wbraid || '', k.name.slice(5)]);
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  const esc = (v) => '"' + String(v).replace(/"/g, '""') + '"';
  const csv = rows.map((r) => r.map(esc).join(',')).join('\r\n');
  return new Response('﻿' + csv, {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="leads-pimpao.csv"' },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (url.pathname === '/health') return json({ ok: true }, 200, cors);
    if (url.pathname === '/event' && request.method === 'POST') return handleEvent(request, env, ctx);
    if (url.pathname === '/leads.csv' && request.method === 'GET') return handleLeadsCsv(request, env);
    return json({ ok: false, error: 'not found' }, 404, cors);
  },
};
