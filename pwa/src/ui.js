'use strict';
/* ===================== UroVault PWA - ui infrastructure ===================== */
const app = $('#app');
const SESSION = { unlocked: false, hiddenAt: 0 };
const Views = {};
const ACT = {};
let STACK = [];
let CUR_TAB = 'home';
let _renderSeq = 0;

const IS_IOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const IS_STANDALONE = window.navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);

function hdr(title, o) {
  o = o || {};
  return '<header class="hdr"><div class="in">' +
    (o.back === false ? '<div class="sp"></div>' : '<button class="ib" data-act="back" aria-label="Back">' + ic('left', 22) + '</button>') +
    '<h1>' + esc(title) + '</h1>' + (o.right || '<div class="sp"></div>') + '</div></header>';
}
function navbar(active) {
  const b = (k, i, l) => '<button class="' + (active === k ? 'on' : '') + '" data-act="tab" data-v="' + k + '">' + ic(i, 22) + '<span>' + l + '</span></button>';
  return '<nav class="nav"><div class="in">' + b('home', 'home', 'Home') + b('patients', 'users', 'Patients') +
    '<div class="plus"><button data-act="newPatient" aria-label="New patient">' + ic('plus', 26) + '</button></div>' +
    b('followups', 'cal', 'Follow-ups') + b('more', 'more', 'More') + '</div></nav>';
}
const wrapPage = (html, bar) => '<div class="wrap page' + (bar ? '' : ' nobar') + '">' + html + '</div>';
const emptyBox = (icon, title, text, btn) => '<div class="empty"><div class="ring">' + ic(icon, 34) + '</div><h3>' + esc(title) + '</h3><p>' + esc(text) + '</p>' + (btn || '') + '</div>';

async function render(keepScroll) {
  const seq = ++_renderSeq;
  const top = STACK[STACK.length - 1];
  if (!top) return;
  let r;
  try { r = await Views[top.view](top.params || {}); }
  catch (e) {
    console.error(e);
    r = { html: hdr('Error', { back: STACK.length > 1 }) + wrapPage('<div class="card"><b>Something went wrong.</b><div class="small" style="margin-top:6px">' + esc(e && e.message) + '</div></div>') };
  }
  if (seq !== _renderSeq) return;
  app.innerHTML = r.html;
  app.onclick = ev => {
    const el = ev.target.closest('[data-act]');
    if (!el || !app.contains(el)) return;
    const h = (r.acts && r.acts[el.dataset.act]) || ACT[el.dataset.act];
    if (h) h(el, ev);
  };
  if (r.bind) r.bind(app);
  window.scrollTo(0, keepScroll ? (top.scroll || 0) : 0);
}
function go(view, params) {
  const t = STACK[STACK.length - 1]; if (t) t.scroll = window.scrollY;
  STACK.push({ view, params });
  try { history.pushState({ d: STACK.length }, ''); } catch (e) { /* ignore */ }
  render();
}
function replace(view, params) { STACK[STACK.length - 1] = { view, params }; render(); }
function back() { if (STACK.length > 1) history.back(); }
function setTab(t) { CUR_TAB = t; STACK = [{ view: t }]; render(); }
window.addEventListener('popstate', () => { if (STACK.length > 1) { STACK.pop(); render(true); } });
ACT.back = () => back();
ACT.tab = el => setTab(el.dataset.v);
ACT.newPatient = () => go('addPatient', {});

/* ---------- overlays ---------- */
function sheet(html, bind) {
  const s = document.createElement('div');
  s.className = 'scrim';
  s.innerHTML = '<div class="sheet"><div class="grab"></div>' + html + '</div>';
  s.addEventListener('click', e => { if (e.target === s) s.remove(); });
  document.body.appendChild(s);
  const close = () => s.remove();
  if (bind) bind(s.firstChild, close);
  return { el: s, close };
}
function confirmDlg(title, msg, okLabel, danger) {
  return new Promise(res => {
    const s = document.createElement('div');
    s.className = 'scrim mid';
    s.innerHTML = '<div class="modal"><h3>' + esc(title) + '</h3><p>' + esc(msg) + '</p><div class="row"><button class="btn o" data-r="0">Cancel</button><button class="btn ' + (danger ? 'red' : '') + '" data-r="1">' + esc(okLabel || 'OK') + '</button></div></div>';
    s.addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (b || e.target === s) { s.remove(); res(!!b && b.dataset.r === '1'); } });
    document.body.appendChild(s);
  });
}
function alertDlg(title, msg) {
  return new Promise(res => {
    const s = document.createElement('div');
    s.className = 'scrim mid';
    s.innerHTML = '<div class="modal"><h3>' + esc(title) + '</h3><p>' + esc(msg) + '</p><button class="btn" data-r="1" style="height:44px">OK</button></div>';
    s.addEventListener('click', e => { if (e.target.closest('[data-r]') || e.target === s) { s.remove(); res(); } });
    document.body.appendChild(s);
  });
}
let _toastT = null;
function toast(msg) {
  $$('.toast').forEach(t => t.remove());
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t);
  clearTimeout(_toastT); _toastT = setTimeout(() => t.remove(), 2600);
}
function busy(msg) {
  const b = document.createElement('div'); b.className = 'busy';
  b.innerHTML = '<div class="spin"></div><div class="msg">' + esc(msg || 'Working...') + '</div>';
  document.body.appendChild(b);
  return { set: m => { $('.msg', b).textContent = m; }, done: () => b.remove() };
}
async function withBusy(msg, fn) {
  const b = busy(msg);
  try { return await fn(b); } finally { b.done(); }
}

/* ---------- files ---------- */
function pickFiles(o) {
  return new Promise(res => {
    const i = document.createElement('input');
    i.type = 'file'; i.style.display = 'none';
    if (o.accept) i.accept = o.accept;
    if (o.multiple) i.multiple = true;
    if (o.capture) i.setAttribute('capture', o.capture);
    document.body.appendChild(i);
    i.onchange = () => { res([...i.files]); setTimeout(() => i.remove(), 1500); };
    i.click();
  });
}
function downloadBlob(blob, name) {
  const u = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = u; a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(u); }, 4000);
}
/** Must be called straight from a tap (fresh user gesture) so iOS allows the share sheet. */
async function shareOrSave(blob, name) {
  const file = new File([blob], name, { type: blob.type || 'application/octet-stream' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: name }); return 'shared'; }
  } catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; }
  downloadBlob(blob, name);
  return 'downloaded';
}

/* ---------- attachment picker block ---------- */
function attachHtml(id, title) {
  return '<div id="' + id + '"><div class="lbl">' + esc(title || 'Attachments') + '</div><div class="row">' +
    '<button type="button" class="btn o sm" data-pk="cam">' + ic('camera', 16) + ' Camera</button>' +
    '<button type="button" class="btn o sm" data-pk="lib">' + ic('image', 16) + ' Photos</button>' +
    '<button type="button" class="btn o sm" data-pk="file">' + ic('clip', 16) + ' File</button></div><div class="thumbs"></div></div>';
}
function bindAttach(root) {
  const st = { files: [] };
  const th = $('.thumbs', root);
  const draw = () => {
    th.innerHTML = st.files.map((f, i) => '<div class="th ' + (f.img ? '' : 'file') + '">' + (f.img ? '<img alt="" src="' + f.url + '">' : ic('file', 22)) + '<button type="button" class="x" data-rm="' + i + '">' + ic('x', 12) + '</button></div>').join('');
  };
  root.addEventListener('click', async e => {
    const rm = e.target.closest('[data-rm]');
    if (rm) { const f = st.files.splice(+rm.dataset.rm, 1)[0]; if (f.url) URL.revokeObjectURL(f.url); draw(); return; }
    const b = e.target.closest('[data-pk]'); if (!b) return;
    const k = b.dataset.pk;
    const fs = await pickFiles(k === 'cam' ? { accept: 'image/*', capture: 'environment' } : k === 'lib' ? { accept: 'image/*', multiple: true } : { accept: 'image/*,application/pdf,.pdf,.doc,.docx,.txt', multiple: true });
    fs.forEach(f => { const img = isImg(f); st.files.push({ file: f, img, url: img ? URL.createObjectURL(f) : '' }); });
    draw();
  });
  st.clear = () => { st.files.forEach(f => f.url && URL.revokeObjectURL(f.url)); st.files = []; draw(); };
  return st;
}
async function saveStaged(st, o) {
  let n = 0;
  for (const f of st.files) {
    await Repo.addMedia({ pid: o.pid, file: f.file, category: o.category, caption: o.caption, takenAt: o.takenAt, refType: o.refType, refId: o.refId });
    n++;
  }
  return n;
}

/* ---------- media thumbnails with existing attachments ---------- */
function thumbsHtml(list, attr) {
  return list.map((m, i) => '<div class="th ' + (m.kind === 'image' ? '' : 'file') + '" ' + (attr || '') + ' data-mi="' + i + '">' +
    (m.kind === 'image' && m.thumb ? '<img alt="" src="' + m.thumb + '">' : ic('file', 22)) + '</div>').join('');
}

/* ---------- viewer (zoom / pan / swipe) ---------- */
function openViewer(list, idx, done) {
  list = list.slice();
  let i = Math.min(idx, list.length - 1), sc = 1, tx = 0, ty = 0, changed = false;
  const v = document.createElement('div'); v.className = 'viewer';
  document.body.appendChild(v);
  const close = () => { v.remove(); if (changed && done) done(); };
  const apply = () => { const im = $('img', v); if (im) im.style.transform = 'translate(-50%,-50%) translate(' + tx + 'px,' + ty + 'px) scale(' + sc + ')'; };
  async function show() {
    const m = list[i]; sc = 1; tx = 0; ty = 0;
    const url = await blobUrl(m.id);
    v.innerHTML = '<div class="vt"><button class="ib" data-v="close" aria-label="Close">' + ic('x', 22) + '</button><div class="cnt">' + (i + 1) + ' / ' + list.length + '</div>' +
      '<button class="ib" data-v="edit" aria-label="Edit">' + ic('edit', 20) + '</button><button class="ib" data-v="share" aria-label="Share">' + ic('share', 20) + '</button><button class="ib" data-v="del" aria-label="Delete">' + ic('trash', 20) + '</button></div>' +
      '<div class="stage">' + (m.kind === 'image' ? '<img alt="" src="' + url + '">' :
        '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;gap:14px;padding:30px;text-align:center">' + ic('file', 56) + '<div style="font-weight:600;overflow-wrap:anywhere">' + esc(m.name) + '</div><button class="btn" style="width:auto;padding:0 28px" data-v="share">Open / Share</button></div>') +
      (list.length > 1 ? '<button class="nav" style="left:0;border-radius:0 12px 12px 0" data-v="prev">' + ic('left', 22) + '</button><button class="nav" style="right:0;border-radius:12px 0 0 12px" data-v="next">' + ic('right', 22) + '</button>' : '') + '</div>' +
      '<div class="vb"><b>' + esc(m.category) + '</b> &middot; ' + fmt(m.takenAt) + (m.caption ? '<div style="margin-top:4px;opacity:.9">' + esc(m.caption) + '</div>' : '') + '</div>';
    apply(); bindStage();
  }
  function bindStage() {
    const st = $('.stage', v); if (!st || !$('img', st)) return;
    const ptrs = new Map(); let d0 = 0, s0 = 1, last = null, sx = 0, moved = 0, lastTap = 0;
    st.onpointerdown = e => { st.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; d0 = Math.hypot(a.x - b.x, a.y - b.y); s0 = sc; } last = { x: e.clientX, y: e.clientY }; sx = e.clientX; moved = 0; };
    st.onpointermove = e => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; sc = Math.min(6, Math.max(1, s0 * Math.hypot(a.x - b.x, a.y - b.y) / d0)); if (sc === 1) { tx = 0; ty = 0; } apply(); }
      else if (sc > 1 && last) { tx += e.clientX - last.x; ty += e.clientY - last.y; apply(); }
      if (last) { moved += Math.abs(e.clientX - last.x) + Math.abs(e.clientY - last.y); last = { x: e.clientX, y: e.clientY }; }
    };
    st.onpointerup = st.onpointercancel = e => {
      const wasOne = ptrs.size === 1; ptrs.delete(e.pointerId);
      if (wasOne && sc === 1 && list.length > 1 && Math.abs(e.clientX - sx) > 70) { i = (i + (e.clientX < sx ? 1 : list.length - 1)) % list.length; show(); return; }
      if (wasOne && moved < 8) { const now = Date.now(); if (now - lastTap < 300) { sc = sc > 1 ? 1 : 2.5; tx = 0; ty = 0; apply(); lastTap = 0; } else lastTap = now; }
    };
  }
  v.addEventListener('click', async e => {
    const b = e.target.closest('[data-v]'); if (!b) return;
    const a = b.dataset.v, m = list[i];
    if (a === 'close') close();
    else if (a === 'prev') { i = (i + list.length - 1) % list.length; show(); }
    else if (a === 'next') { i = (i + 1) % list.length; show(); }
    else if (a === 'share') { const d = await dbGet('blobs', m.id); if (d) { const r = await shareOrSave(d.blob, m.name || 'file'); if (r === 'downloaded') toast('Saved to downloads'); } }
    else if (a === 'del') {
      if (await confirmDlg('Delete this item?', 'This cannot be undone.', 'Delete', true)) {
        await Repo.delMedia(m); changed = true; list.splice(i, 1);
        if (!list.length) { close(); return; }
        i = Math.min(i, list.length - 1); show();
      }
    } else if (a === 'edit') {
      sheet('<h3>Edit details</h3><div class="lbl">Category</div><div class="chips wrapchips" id="ecats">' + MEDIA_CATS.map(c => '<button class="chip sm ' + (c === m.category ? 'on' : '') + '" data-c="' + c + '">' + c + '</button>').join('') + '</div>' +
        '<div class="lbl">Caption</div><input class="inp" id="ecap" value="' + esc(m.caption || '') + '" placeholder="Optional"><div style="height:16px"></div><button class="btn" id="esave">Save</button>', (s, cl) => {
        let cat = m.category;
        $('#ecats', s).onclick = ev => { const c = ev.target.closest('[data-c]'); if (!c) return; cat = c.dataset.c; $$('#ecats .chip', s).forEach(x => x.classList.toggle('on', x === c)); };
        $('#esave', s).onclick = async () => { await Repo.updMedia(m.id, cat, $('#ecap', s).value); m.category = cat; m.caption = nn($('#ecap', s).value); changed = true; cl(); show(); };
      });
    }
  });
  show();
}

/* ---------- small shared view helpers ---------- */
const dxLabel = (d, p) => (d.name === 'Other' && p && p.addDx ? p.addDx : d.name) + (d.lat ? ' (' + d.lat + ')' : '');
function ptile(p) {
  const dx = (p.dx || []).map(d => dxLabel(d, p));
  return '<div class="card tap tile" data-act="open" data-id="' + p.id + '"><div class="avatar">' + esc(initials(p.name)) + '</div><div class="grow"><div class="t-name">' + esc(p.name) + (p.isDemo ? ' <span class="pill grey">Demo</span>' : '') + '</div>' +
    '<div class="t-sub"><b>' + esc(p.uhid) + '</b> &middot; ' + p.age + 'y &middot; ' + esc(p.sex) + '</div>' +
    (dx.length ? '<div style="margin-top:5px"><span class="pill">' + esc(dx[0]) + '</span>' + (dx.length > 1 ? ' <span class="pill grey">+' + (dx.length - 1) + '</span>' : '') + '</div>' : '') +
    '</div>' + ic('chev', 18) + '</div>';
}
function fuTile(f) {
  const cls = Repo.fuClass(f);
  const pc = cls === 'Overdue' ? 'red' : cls === 'Due Today' ? 'amber' : cls === 'Completed' ? 'green' : '';
  return '<div class="card tap tile" data-act="openfu" data-id="' + f.patientId + '"><div class="avatar">' + esc(initials(f.pname)) + '</div><div class="grow"><div class="t-name">' + esc(f.pname) + '</div>' +
    '<div class="t-sub"><b>' + esc(f.uhid) + '</b>' + (f.dx ? ' &middot; ' + esc(f.dx) : '') + '</div></div>' +
    '<div style="text-align:right"><div class="small"><b style="color:var(--navy)">' + fmt(f.date) + '</b></div><span class="pill ' + pc + '">' + esc(cls === 'Completed' ? (f.status || 'Visited') : relDays(f.date)) + '</span></div></div>';
}
ACT.open = el => go('profile', { id: +el.dataset.id });
ACT.openfu = el => go('profile', { id: +el.dataset.id, tab: 'fu' });
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
function chipsHtml(items, sel, attr) { return items.map(c => '<button type="button" class="chip sm ' + (c === sel ? 'on' : '') + '" ' + attr + '="' + esc(c) + '">' + esc(c) + '</button>').join(''); }
function refresh() { render(true); }

/* ---------- in-app updates ---------- */
let UPDATE_AVAILABLE = false;
async function checkUpdate(manual) {
  try {
    const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) throw new Error('bad');
    const j = await r.json();
    UPDATE_AVAILABLE = j.build !== BUILD_ID;
    showUpdateBar();
    if (manual) toast(UPDATE_AVAILABLE ? 'Update available' : 'You are on the latest version');
    return UPDATE_AVAILABLE;
  } catch (e) { if (manual) toast('Could not check - are you online?'); return false; }
}
function showUpdateBar() {
  let b = $('#updbar');
  if (!UPDATE_AVAILABLE) { if (b) b.remove(); return; }
  if (b) return;
  b = document.createElement('div'); b.id = 'updbar'; b.className = 'updbar';
  b.innerHTML = '<span>New version available</span><button>Update now</button>';
  b.querySelector('button').onclick = applyUpdate;
  document.body.appendChild(b);
}
async function applyUpdate() {
  const bz = busy('Updating...');
  try {
    if ('serviceWorker' in navigator) for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
    if (window.caches) for (const k of await caches.keys()) await caches.delete(k);
    try { await fetch('index.html', { cache: 'reload' }); await fetch('./', { cache: 'reload' }); } catch (e) { /* offline fallback below */ }
  } catch (e) { /* ignore */ }
  location.reload();
}
