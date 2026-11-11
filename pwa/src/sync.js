'use strict';
/* ===================== Cloud sync (Supabase, end-to-end encrypted) =====================
   Everything is encrypted on this device with your sync passphrase (AES-256-GCM) before upload.
   The server only ever stores ciphertext. Last write wins per record. */
const SY_URL = 'https://uyxsmsizvshlbynyrnuu.supabase.co', SY_KEY = 'sb_publishable_GGvo2WmhgWI5Zo_dvdpZnQ_NIvrlj6F';
const SY = { cfg: null, key: null, q: {}, busy: false, applying: false, timer: null, err: '' };
const SY_STORES = ['patients', 'investigations', 'surgeries', 'followups', 'notes', 'media'];
const b64e = u => { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
const b64d = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function syEnc(u8) { const iv = crypto.getRandomValues(new Uint8Array(12)); const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, SY.key, u8)); const o = new Uint8Array(12 + ct.length); o.set(iv); o.set(ct, 12); return o; }
async function syDec(u8) { return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: u8.slice(0, 12) }, SY.key, u8.slice(12))); }
const syJ = async o => b64e(await syEnc(new TextEncoder().encode(JSON.stringify(o))));
const syUnJ = async s => JSON.parse(new TextDecoder().decode(await syDec(b64d(s))));

async function syRaw(url, opt) {
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), 60000);
  try { return await fetch(url, Object.assign({ signal: ac.signal }, opt)); }
  catch (e) { throw new Error(e.name === 'AbortError' ? 'Sync timed out' : 'Offline or network error'); }
  finally { clearTimeout(t); }
}
const syErr = async r => { try { const j = await r.json(); return j.message || j.msg || j.error_description || j.error || ('HTTP ' + r.status); } catch (e) { return 'HTTP ' + r.status; } };
function syTokens(j) { const c = SY.cfg; c.access = j.access_token; c.refresh = j.refresh_token; c.exp = Date.now() + (j.expires_in || 3600) * 1000; }
const syCfgSave = () => metaSet('syncCfg', SY.cfg);
async function syTok(force) {
  const c = SY.cfg; if (!force && c.exp - Date.now() > 60000) return c.access;
  const r = await syRaw(c.url + '/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: { apikey: c.anon, 'content-type': 'application/json' }, body: JSON.stringify({ refresh_token: c.refresh }) });
  if (!r.ok) throw new Error('Cloud session expired. Reconnect in Settings > Cloud sync.');
  syTokens(await r.json()); await syCfgSave(); return c.access;
}
async function syReq(path, o) {
  o = o || {}; const c = SY.cfg;
  const go = t => syRaw(c.url + path, { method: o.method || 'GET', headers: Object.assign({ apikey: c.anon, Authorization: 'Bearer ' + t }, o.headers || {}), body: o.body });
  let r = await go(await syTok());
  if (r.status === 401) r = await go(await syTok(true));
  return r;
}
const syStoragePath = id => '/storage/v1/object/' + 'media/' + SY.cfg.uid + '/' + id + '.bin';
const syStorage = (m, id, body) => m === 'GET' ? syReq('/storage/v1/object/authenticated/media/' + SY.cfg.uid + '/' + id + '.bin') : m === 'DELETE' ? syReq(syStoragePath(id), { method: 'DELETE' }) : syReq(syStoragePath(id), { method: 'POST', headers: { 'content-type': 'application/octet-stream', 'x-upsert': 'true' }, body });

/* ---- change queue ---- */
SYNCHOOK = (op, n, o, r) => {
  if (!SY.cfg || !SY.cfg.on || SY.applying) return;
  if (n !== 'blobs' && !SY_STORES.includes(n)) return;
  const id = op === 'put' ? (o && o.id != null ? o.id : r) : o;
  SY.q[n + ':' + id] = { op, mt: Date.now() };
  metaSet('syncq', SY.q); syKick();
};
function syKick() { clearTimeout(SY.timer); SY.timer = setTimeout(() => syncNow(false), 4000); }
async function syQueueAll() {
  for (const n of SY_STORES.concat(['blobs'])) for (const r of await dbAll(n)) SY.q[n + ':' + r.id] = { op: 'put', mt: Date.now() };
  await metaSet('syncq', SY.q);
}

async function syPush() {
  const keys = Object.keys(SY.q); let done = 0;
  for (let i = 0; i < keys.length; i += 25) {
    const rows = [], sent = [];
    for (const k of keys.slice(i, i + 25)) {
      const it = SY.q[k], p = k.split(':'), n = p[0], id = Number(p[1]);
      const rec = it.op === 'put' ? await dbGet(n, id) : null;
      if (!rec) { rows.push({ k, d: null, mt: it.mt, del: true, dev: SY.cfg.dev }); if (n === 'blobs') await syStorage('DELETE', id).catch(() => { }); }
      else if (n === 'blobs') {
        const up = await syStorage('POST', id, new Blob([await syEnc(new Uint8Array(await rec.blob.arrayBuffer()))]));
        if (!up.ok) throw new Error('Photo upload failed: ' + await syErr(up));
        rows.push({ k, d: await syJ({ type: rec.blob.type }), mt: it.mt, del: false, dev: SY.cfg.dev });
      } else rows.push({ k, d: await syJ(rec), mt: it.mt, del: false, dev: SY.cfg.dev });
      sent.push([k, it.mt]);
    }
    const r = await syReq('/rest/v1/records?on_conflict=user_id,k', { method: 'POST', headers: { 'content-type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(rows) });
    if (!r.ok) throw new Error(await syErr(r));
    sent.forEach(([k, mt]) => { if (SY.q[k] && SY.q[k].mt === mt) delete SY.q[k]; });
    done += rows.length; await metaSet('syncq', SY.q);
  }
  return done;
}
async function syPull() {
  let applied = 0;
  for (;;) {
    const cur = SY.cfg.cursor ? '&srv=gt.' + encodeURIComponent(SY.cfg.cursor) : '';
    const r = await syReq('/rest/v1/records?select=k,d,mt,del,srv,dev&order=srv.asc&limit=100' + cur);
    if (!r.ok) throw new Error(await syErr(r));
    const rows = await r.json(); if (!rows.length) break;
    for (const row of rows) {
      SY.cfg.cursor = row.srv;
      if (row.k.startsWith('meta:') || row.dev === SY.cfg.dev) continue;
      const qi = SY.q[row.k]; if (qi && qi.mt >= row.mt) continue;
      if (qi) delete SY.q[row.k];
      const p = row.k.split(':'), n = p[0], id = Number(p[1]);
      SY.applying = true;
      try {
        if (row.del) { await dbDel(n, id); freeUrl(id); }
        else if (n === 'blobs') {
          const meta = await syUnJ(row.d); const g = await syStorage('GET', id);
          if (!g.ok) throw new Error('Photo download failed');
          const bytes = await syDec(new Uint8Array(await g.arrayBuffer()));
          await dbPut('blobs', { id, blob: new Blob([bytes], { type: meta.type }) }); freeUrl(id);
        } else await dbPut(n, await syUnJ(row.d));
        applied++;
      } catch (e) { if (!(e && e.name === 'ConstraintError')) throw e; }
      finally { SY.applying = false; }
    }
    await syCfgSave(); await metaSet('syncq', SY.q);
    if (rows.length < 100) break;
  }
  return applied;
}
async function syncNow(manual) {
  if (!SY.cfg || !SY.cfg.on || !SY.key || SY.busy) return;
  SY.busy = true;
  try {
    const got = await syPull(); await syPush();
    SY.cfg.last = new Date().toISOString(); SY.err = ''; await syCfgSave();
    const top = STACK[STACK.length - 1];
    if (got && top && ['home', 'patients', 'followups', 'more'].includes(top.view)) refresh();
    if (manual) toast(got ? 'Synced - ' + got + ' change(s) from cloud' : 'Cloud is up to date');
  } catch (e) { SY.err = e.message || String(e); if (manual) toast(SY.err); }
  finally { SY.busy = false; }
}
async function syLoad() {
  const cfg = await metaGet('syncCfg'); if (!cfg || !cfg.on) return;
  SY.cfg = cfg; SY.key = await metaGet('syncKey'); SY.q = (await metaGet('syncq')) || {};
  if (!SY.key) { SY.cfg = null; return; }
  setTimeout(() => syncNow(false), 3000); syLoops();
}
function syLoops() {
  if (SY.loops) return; SY.loops = true;
  setInterval(() => syncNow(false), 5 * 60 * 1000);
  window.addEventListener('online', () => syncNow(false));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) syncNow(false); });
}

/* ---- connect / disconnect ---- */
async function syConnect(f) {
  let url = f.url.trim(); try { url = new URL(url).origin; } catch (e) { throw new Error('Project URL is not valid'); }
  const cfg = { url, anon: f.anon.trim(), email: f.email.trim(), dev: crypto.randomUUID(), on: false, cursor: null };
  SY.cfg = cfg;
  const H = { apikey: cfg.anon, 'content-type': 'application/json' }, body = JSON.stringify({ email: cfg.email, password: f.pw });
  let r = await syRaw(url + '/auth/v1/token?grant_type=password', { method: 'POST', headers: H, body }), j = await r.json();
  if (!r.ok) {
    const r2 = await syRaw(url + '/auth/v1/signup', { method: 'POST', headers: H, body }), j2 = await r2.json();
    if (!r2.ok) throw new Error(/already/i.test(JSON.stringify(j2)) ? 'Wrong password for this email' : (j2.msg || j2.message || j2.error_description || 'Login failed'));
    if (!j2.access_token) throw new Error('Account created, but email confirmation is ON. In Supabase go to Authentication > Providers > Email, turn off "Confirm email", then connect again.');
    j = j2;
  }
  syTokens(j); cfg.uid = j.user.id;
  const rs = await (await syReq('/rest/v1/records?select=d&k=eq.meta:salt')).json();
  let salt;
  if (Array.isArray(rs) && rs.length) salt = b64d(rs[0].d);
  else {
    salt = crypto.getRandomValues(new Uint8Array(16));
    const w = await syReq('/rest/v1/records?on_conflict=user_id,k', { method: 'POST', headers: { 'content-type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify([{ k: 'meta:salt', d: b64e(salt), mt: Date.now(), del: false, dev: cfg.dev }]) });
    if (!w.ok) throw new Error((await syErr(w)) + ' - did you run the SQL setup in Supabase?');
  }
  SY.key = await uvbKey(f.pass, salt);
  const chk = await (await syReq('/rest/v1/records?select=d&k=eq.meta:check')).json();
  if (Array.isArray(chk) && chk.length) { try { await syDec(b64d(chk[0].d)); } catch (e) { throw new Error('Wrong sync passphrase for this account'); } }
  else await syReq('/rest/v1/records?on_conflict=user_id,k', { method: 'POST', headers: { 'content-type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify([{ k: 'meta:check', d: b64e(await syEnc(new TextEncoder().encode('ok'))), mt: Date.now(), del: false, dev: cfg.dev }]) });
  const rem = await (await syReq('/rest/v1/records?select=k&k=not.like.meta:*&limit=1')).json();
  return { hasRemote: Array.isArray(rem) && rem.length > 0, hasLocal: (await dbAll('patients')).length > 0 };
}
async function syEnable(mode) {
  /* mode: 'push' (cloud empty) | 'pull' (replace local with cloud) */
  if (mode === 'pull') { SY.applying = true; try { for (const n of SY_STORES.concat(['blobs'])) await dbClear(n); } finally { SY.applying = false; } _urls.forEach(u => URL.revokeObjectURL(u)); _urls.clear(); SY.q = {}; SY.cfg.cursor = null; }
  SY.cfg.on = true; await metaSet('syncKey', SY.key); await syCfgSave();
  if (mode === 'push') await syQueueAll(); else await metaSet('syncq', {});
  SY.busy = false; await syncNow(true);
  syLoops();
}
async function syDisconnect() { if (SY.cfg) SY.cfg.on = false; SY.cfg = null; SY.key = null; SY.q = {}; await metaSet('syncCfg', null); await metaSet('syncKey', null); await metaSet('syncq', {}); }

const SY_SQL = "create table if not exists public.records (\n  user_id uuid not null default auth.uid(),\n  k text not null,\n  d text,\n  mt bigint not null,\n  del boolean not null default false,\n  dev text,\n  srv timestamptz not null default now(),\n  primary key (user_id, k)\n);\ncreate index if not exists records_srv on public.records (user_id, srv);\ncreate or replace function public.touch_srv() returns trigger language plpgsql as $$ begin new.srv := clock_timestamp(); return new; end $$;\ndrop trigger if exists records_touch on public.records;\ncreate trigger records_touch before insert or update on public.records for each row execute function public.touch_srv();\nalter table public.records enable row level security;\ndrop policy if exists own_records on public.records;\ncreate policy own_records on public.records for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());\ninsert into storage.buckets (id, name, public) values ('media', 'media', false) on conflict (id) do nothing;\ndrop policy if exists own_media on storage.objects;\ncreate policy own_media on storage.objects for all to authenticated using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);\n";

/* Cloud login + encryption passphrase derived from the app account, so nothing extra to remember. */
async function syDerive(id, pw) {
  const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = async lbl => new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode('urovault-' + lbl + '-v1:' + id), iterations: 150000, hash: 'SHA-256' }, km, 256));
  const clean = id.trim().toLowerCase().replace(/\s+/g, '.');
  return { email: clean.includes('@') ? clean : clean + '@urovault.app', cloudPw: b64e(await bits('cloud')), pass: b64e(await bits('enc')) };
}
