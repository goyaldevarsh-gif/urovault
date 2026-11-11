'use strict';
/* ===================== UroVault PWA - core: utils, icons, db, repo ===================== */
const APP_VERSION = '1.1.1';
const BUILD_ID = '__BUILD__';
const COPYRIGHT = '&copy; 2026 Dr. Devarsh Goyal. All rights reserved.';
const copyFoot = () => '<div class="small" style="text-align:center;margin:22px 0 4px;opacity:.85">' + COPYRIGHT + '<br>UroVault v' + APP_VERSION + '</div>';

const DX_OPTIONS = [
  { name: 'Ureterocele', icon: 'ureterocele', paired: true, group: 'Renal' },
  { name: 'Renal Mass', icon: 'renal', paired: true, group: 'Renal' },
  { name: 'Prostate CA', icon: 'prostate', paired: false, group: 'Prostate' },
  { name: 'Ca Bladder', icon: 'bladder', paired: false, group: 'Bladder' },
  { name: 'Ureteric Stone', icon: 'stone', paired: true, group: 'Renal' },
  { name: 'Renal Stone', icon: 'renal', paired: true, group: 'Renal' },
  { name: 'Adrenal Mass', icon: 'adrenal', paired: true, group: 'Other' },
  { name: 'PUJO', icon: 'pujo', paired: true, group: 'Renal' },
  { name: 'Other', icon: '', paired: false, group: 'Other' }
];
const LATERALITY = ['Right', 'Left', 'Bilateral'];
const INV_OPTIONS = ['RFT', 'CBC', 'Urine Analysis', 'Urine Culture', 'PSA', 'CT', 'MRI', 'DTPA', 'PET CT', 'Other'];
const INV_ICON = { 'RFT': 'flask', 'CBC': 'drop', 'Urine Analysis': 'drop', 'Urine Culture': 'flask', 'PSA': 'drop', 'CT': 'scan', 'MRI': 'scan', 'DTPA': 'activity', 'PET CT': 'scan', 'Other': 'file' };
const MEDIA_CATS = ['Clinical', 'Pre-op', 'Post-op', 'Follow-up', 'CT', 'MRI', 'Other'];
const PROCEDURES = ['TURBT', 'TURP', 'PCNL', 'URS + DJ stenting', 'RIRS', 'Radical nephrectomy', 'Pyeloplasty', 'Radical prostatectomy', 'Cystoscopy'];
const INTERVALS = ['1 week', '2 weeks', '1 month', '3 months', '6 months', '1 year'];
const STATUSES = ['Improving', 'Stable', 'Worsening'];
const FILTERS = ['All', 'Renal', 'Bladder', 'Prostate', 'Other'];
const FU_FILTERS = ['Due Today', 'Upcoming', 'Overdue', 'Completed'];

const invCat = n => (n === 'CT' ? 'CT' : n === 'MRI' ? 'MRI' : 'Other');
const dxGroup = n => (DX_OPTIONS.find(o => o.name === n) || { group: 'Other' }).group;
function matchesGroup(dxNames, g) {
  if (g === 'All') return true;
  if (!dxNames.length) return g === 'Other';
  return dxNames.some(n => dxGroup(n) === g);
}

/* ---------------- utils ---------------- */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const parseIso = s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmt = s => { if (!s) return '-'; const d = parseIso(s); return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); };
const fmtDT = s => { if (!s) return '-'; const d = new Date(s); let h = d.getHours(); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear() + ', ' + h + ':' + String(d.getMinutes()).padStart(2, '0') + ' ' + ap; };
const dayDiff = s => Math.round((parseIso(s) - today()) / 86400000);
function relDays(s) {
  const d = dayDiff(s);
  if (d === 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  if (d === -1) return '1 day overdue';
  return d < 0 ? (-d) + ' days overdue' : 'In ' + d + ' days';
}
function nextDateFor(label, from) {
  const y = from.getFullYear(), m = from.getMonth(), d = from.getDate();
  switch (label) {
    case '1 week': return new Date(y, m, d + 7);
    case '2 weeks': return new Date(y, m, d + 14);
    case '1 month': return new Date(y, m + 1, d);
    case '3 months': return new Date(y, m + 3, d);
    case '6 months': return new Date(y, m + 6, d);
    case '1 year': return new Date(y + 1, m, d);
  }
  return null;
}
const fmtDur = m => { m = Number(m); if (!m) return ''; const h = Math.floor(m / 60), r = m % 60; return (h ? h + ' h' : '') + (h && r ? ' ' : '') + (r ? r + ' min' : ''); };
const assistants = s => [s.assist1, s.assist2, s.assist3].filter(Boolean);
function greeting() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; }
const initials = n => { const p = String(n || '').trim().split(/\s+/).filter(Boolean); return !p.length ? '?' : p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase(); };
const uhidKey = u => String(u || '').trim().toUpperCase().replace(/\s+/g, '');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const nn = v => { v = v == null ? '' : String(v).trim(); return v ? v : null; };
const isImg = f => /^image\//.test(f.type || '') || /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(f.name || '');
function csvCell(v) { v = String(v == null ? '' : v); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }

/* ---------------- icons ---------------- */
const P = {
  home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  plusc: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>',
  cal: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  more: '<circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/><circle cx="5" cy="12" r="1.2"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  edit: '<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
  camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
  clip: '<path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  chev: '<polyline points="9 18 15 12 9 6"/>',
  left: '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
  right: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
  bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  share: '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>',
  activity: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
  bars: '<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>',
  sliders: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  clip2: '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>',
  flask: '<path d="M9 3h6M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2.2h12.4a1.5 1.5 0 0 0 1.3-2.2L14 9V3"/><line x1="7" y1="15" x2="17" y2="15"/>',
  drop: '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>',
  scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="4"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M12.5 7v6M9.5 10h6"/>',
  scalpel: '<path d="M3 21l7-7"/><path d="M10 14l8.5-8.5a2.1 2.1 0 0 1 3 3L13 17z"/>',
  list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
  alert: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
  hash: '<line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff: '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>',
  history: '<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>',
  note: '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>',
  zoomout: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/>',
  printer: '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  refresh: '<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>'
};
const U = {
  renal: '<path d="M30 6C20 2 8 10 8 24c0 11 6 18 14 18 6 0 7-5 5-9-2-4 1-8 5-9 4-1 5-7 3-11-1-2-3-4-5-6z"/><path d="M27 34c2 4 4 6 4 10"/>',
  bladder: '<path d="M10 20c0 12 6 22 14 22s14-10 14-22c-5 3-9 4-14 4s-9-1-14-4z"/><path d="M14 8c0 6 2 10 5 12M34 8c0 6-2 10-5 12"/><circle cx="24" cy="30" r="2.5"/>',
  prostate: '<path d="M8 14c0-6 8-8 16-4 8-4 16-2 16 4 0 12-8 22-16 26C16 36 8 26 8 14z"/><path d="M24 10v30"/>',
  stone: '<path d="M12 6c0 8 6 10 6 18s8 8 8 16"/><circle cx="30" cy="14" r="4.5"/><circle cx="36" cy="30" r="3"/><circle cx="14" cy="36" r="3"/>',
  adrenal: '<path d="M32 18c-6-3-18 0-20 12-1 8 4 14 12 14 7 0 10-6 8-10-1-3 0-5 2-7 1-3 0-7-2-9z"/><path d="M8 14c3-6 9-10 15-9 3 1 2 5-1 8-4 3-9 4-14 1z"/>',
  pujo: '<path d="M14 6C8 6 4 12 4 20c0 8 4 12 9 12 4 0 5-3 3-6-2-3 0-6 2-7 3-2 3-6 1-9-1-2-3-4-5-4z"/><path d="M34 6c6 0 10 6 10 14 0 8-4 12-9 12-4 0-5-3-3-6 2-3 0-6-2-7-3-2-3-6-1-9 1-2 3-4 5-4z"/><path d="M14 32v10M34 32v10"/>',
  ureterocele: '<path d="M24 4v18"/><path d="M24 22c-7 0-11 5-11 11s5 10 11 10 11-4 11-10-4-11-11-11z"/><path d="M24 30v6"/>'
};
const ic = (n, s) => '<svg class="ic" width="' + (s || 20) + '" height="' + (s || 20) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (P[n] || '') + '</svg>';
const uic = (n, s) => '<svg class="ic" width="' + (s || 26) + '" height="' + (s || 26) + '" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">' + (U[n] || '') + '</svg>';
const dxIc = (name, s) => { const o = DX_OPTIONS.find(x => x.name === name); return o && o.icon ? uic(o.icon, s) : ic('more', s || 24); };
const LOGO = (light, s) => '<svg width="' + s + '" height="' + s + '" viewBox="0 0 120 120" fill="none"><g stroke="' + (light ? '#fff' : '#0F2942') + '" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"><path d="M46 16C32 8 12 18 12 42c0 16 8 28 20 28 9 0 11-8 8-14-3-6 1-12 7-14 6-2 8-10 4-16-1-2-3-4-5-6z"/><path d="M74 16c14-8 34 2 34 26 0 16-8 28-20 28-9 0-11-8-8-14 3-6-1-12-7-14-6-2-8-10-4-16 1-2 3-4 5-6z"/><path d="M46 64c2 12 8 18 14 24 6-6 12-12 14-24"/><path d="M60 88v8"/><circle cx="60" cy="103" r="7"/></g><g stroke="#0D9488" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M25 30l10 10-10 10"/><path d="M95 30L85 40l10 10"/></g></svg>';

/* ---------------- IndexedDB ---------------- */
const STORES = ['patients', 'investigations', 'surgeries', 'followups', 'notes', 'media', 'blobs', 'audit', 'meta'];
let _db = null;
function dbOpen() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('urovault', 1);
    r.onupgradeneeded = () => {
      const d = r.result;
      const p = d.createObjectStore('patients', { keyPath: 'id', autoIncrement: true });
      p.createIndex('uhidKey', 'uhidKey', { unique: true });
      ['investigations', 'surgeries', 'followups', 'notes', 'media'].forEach(n => d.createObjectStore(n, { keyPath: 'id', autoIncrement: true }).createIndex('patientId', 'patientId'));
      d.createObjectStore('blobs', { keyPath: 'id' });
      d.createObjectStore('audit', { keyPath: 'id', autoIncrement: true });
      d.createObjectStore('meta', { keyPath: 'key' });
    };
    r.onsuccess = () => { _db = r.result; res(_db); };
    r.onerror = () => rej(r.error);
  });
}
const rq = q => new Promise((res, rej) => { q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
const store = (n, m) => _db.transaction(n, m || 'readonly').objectStore(n);
const dbAll = n => rq(store(n).getAll());
const dbGet = (n, id) => rq(store(n).get(id));
const dbPut = (n, o) => rq(store(n, 'readwrite').put(o));
const dbDel = (n, id) => rq(store(n, 'readwrite').delete(id));
const dbBy = (n, pid) => rq(store(n).index('patientId').getAll(pid));
const dbClear = n => rq(store(n, 'readwrite').clear());
const metaGet = async k => { const r = await dbGet('meta', k); return r ? r.value : null; };
const metaSet = (k, v) => dbPut('meta', { key: k, value: v });

/* ---------------- images ---------------- */
function loadImage(file) {
  return new Promise((res, rej) => {
    const u = URL.createObjectURL(file), i = new Image();
    i.onload = () => res({ i, u });
    i.onerror = () => { URL.revokeObjectURL(u); rej(new Error('Could not read this image')); };
    i.src = u;
  });
}
function drawJpeg(img, maxDim, q) {
  const s = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(img.naturalWidth * s));
  c.height = Math.max(1, Math.round(img.naturalHeight * s));
  const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
  x.drawImage(img, 0, 0, c.width, c.height);
  return c;
}
const canvasBlob = (c, q) => new Promise(r => c.toBlob(r, 'image/jpeg', q));
/** Resize to <=2000px JPEG (saves storage) + 320px thumbnail data-URL. */
async function processImage(file) {
  const { i, u } = await loadImage(file);
  try {
    const big = drawJpeg(i, 2000);
    const blob = await canvasBlob(big, 0.85);
    const thumb = drawJpeg(i, 320).toDataURL('image/jpeg', 0.7);
    return { blob, thumb };
  } finally { URL.revokeObjectURL(u); }
}
const _urls = new Map();
async function blobUrl(id) {
  if (_urls.has(id)) return _urls.get(id);
  const b = await dbGet('blobs', id);
  if (!b) return '';
  const u = URL.createObjectURL(b.blob);
  _urls.set(id, u);
  return u;
}
function freeUrl(id) { if (_urls.has(id)) { URL.revokeObjectURL(_urls.get(id)); _urls.delete(id); } }
function blobToB64(blob) {
  return new Promise((res, rej) => { const f = new FileReader(); f.onload = () => res(String(f.result).split(',')[1] || ''); f.onerror = () => rej(f.error); f.readAsDataURL(blob); });
}
function b64ToBlob(b64, type) {
  const bin = atob(b64), len = bin.length, arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: type || 'application/octet-stream' });
}

/* ---------------- repository ---------------- */
const Repo = {
  async audit(action, entity, entityId, patientId) {
    try { await dbPut('audit', { ts: new Date().toISOString(), action, entity, entityId: entityId || null, patientId: patientId || null }); } catch (e) { /* never block a save on logging */ }
  },
  /* ---- patients ---- */
  patients: () => dbAll('patients'),
  patient: id => dbGet('patients', id),
  async uhidTaken(uhid, exceptId) {
    const k = uhidKey(uhid);
    if (!k) return null;
    const p = await rq(store('patients').index('uhidKey').get(k));
    return p && p.id !== exceptId ? p : null;
  },
  async savePatient(p) {
    const now = new Date().toISOString();
    const rec = Object.assign({}, p, { uhid: p.uhid.trim(), uhidKey: uhidKey(p.uhid), name: p.name.trim(), updatedAt: now });
    if (!rec.id) { rec.createdAt = now; rec.dx = rec.dx || []; delete rec.id; }
    const id = await dbPut('patients', rec);
    await Repo.audit(p.id ? 'update' : 'create', 'patient', id, id);
    return id;
  },
  async touch(pid) { const p = await dbGet('patients', pid); if (p) { p.updatedAt = new Date().toISOString(); await dbPut('patients', p); } },
  async setDx(pid, dx, addDx) {
    const p = await dbGet('patients', pid);
    p.dx = dx; p.addDx = nn(addDx); p.updatedAt = new Date().toISOString();
    await dbPut('patients', p);
    await Repo.audit('update', 'diagnosis', null, pid);
  },
  async deletePatient(id) {
    for (const n of ['investigations', 'surgeries', 'followups', 'notes']) for (const r of await dbBy(n, id)) await dbDel(n, r.id);
    for (const m of await dbBy('media', id)) { freeUrl(m.id); await dbDel('blobs', m.id); await dbDel('media', m.id); }
    await dbDel('patients', id);
    await Repo.audit('delete', 'patient', id);
  },
  /* ---- investigations ---- */
  async invs(pid) { return (await dbBy('investigations', pid)).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id); },
  async addInv(pid, name, date, notes) {
    const id = await dbPut('investigations', { patientId: pid, name, date, notes: nn(notes), createdAt: new Date().toISOString() });
    await Repo.touch(pid); await Repo.audit('create', 'investigation', id, pid); return id;
  },
  async updInv(id, date, notes) {
    const r = await dbGet('investigations', id); r.date = date; r.notes = nn(notes);
    await dbPut('investigations', r); await Repo.audit('update', 'investigation', id, r.patientId);
  },
  async delInv(id) { await Repo.delRefMedia('investigation', id); await dbDel('investigations', id); await Repo.audit('delete', 'investigation', id); },
  /* ---- media ---- */
  async media(pid) { return (await dbBy('media', pid)).sort((a, b) => b.takenAt.localeCompare(a.takenAt) || b.id - a.id); },
  async addMedia(o) {
    const f = o.file;
    let blob = f, thumb = null, kind = 'file';
    if (isImg(f)) { const r = await processImage(f); blob = r.blob; thumb = r.thumb; kind = 'image'; }
    const id = await dbPut('media', {
      patientId: o.pid, kind, category: o.category || 'Other', caption: nn(o.caption), takenAt: o.takenAt || iso(today()),
      refType: o.refType || null, refId: o.refId || null, name: f.name || 'file', mime: blob.type || f.type || '', thumb, createdAt: new Date().toISOString()
    });
    await dbPut('blobs', { id, blob });
    await Repo.touch(o.pid); await Repo.audit('create', 'media', id, o.pid);
    return id;
  },
  async updMedia(id, category, caption) { const m = await dbGet('media', id); m.category = category; m.caption = nn(caption); await dbPut('media', m); await Repo.audit('update', 'media', id, m.patientId); },
  async delMedia(m) { freeUrl(m.id); await dbDel('blobs', m.id); await dbDel('media', m.id); await Repo.audit('delete', 'media', m.id, m.patientId); },
  async delRefMedia(refType, refId) {
    for (const m of await dbAll('media')) if (m.refType === refType && m.refId === refId) { freeUrl(m.id); await dbDel('blobs', m.id); await dbDel('media', m.id); }
  },
  /* ---- surgeries ---- */
  async surgeries(pid) { return (await dbBy('surgeries', pid)).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id); },
  async allSurgeries() {
    const ps = new Map((await dbAll('patients')).map(p => [p.id, p]));
    return (await dbAll('surgeries')).filter(s => ps.has(s.patientId)).map(s => Object.assign({}, s, { pname: ps.get(s.patientId).name, uhid: ps.get(s.patientId).uhid })).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  },
  async saveSurgery(s) {
    const rec = Object.assign({}, s);
    ['indication', 'notes', 'findings', 'hpe', 'postop', 'assist1', 'assist2', 'assist3'].forEach(k => { rec[k] = nn(rec[k]); });
    rec.duration = rec.duration ? Math.max(0, Math.round(Number(rec.duration))) || null : null;
    rec.procedure = rec.procedure.trim();
    if (!rec.id) { rec.createdAt = new Date().toISOString(); delete rec.id; }
    const id = await dbPut('surgeries', rec);
    await Repo.touch(rec.patientId); await Repo.audit(s.id ? 'update' : 'create', 'surgery', id, rec.patientId);
    return id;
  },
  async delSurgery(id) { await Repo.delRefMedia('surgery', id); await dbDel('surgeries', id); await Repo.audit('delete', 'surgery', id); },
  /* ---- follow-ups ---- */
  async fus(pid) { return (await dbBy('followups', pid)).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id); },
  async allFus() {
    const ps = new Map((await dbAll('patients')).map(p => [p.id, p]));
    return (await dbAll('followups')).filter(f => ps.has(f.patientId)).map(f => { const p = ps.get(f.patientId); return Object.assign({}, f, { pname: p.name, uhid: p.uhid, dx: p.dx && p.dx[0] ? p.dx[0].name : null }); });
  },
  fuClass(f) {
    if (f.completed) return 'Completed';
    const d = dayDiff(f.date);
    return d === 0 ? 'Due Today' : d > 0 ? 'Upcoming' : 'Overdue';
  },
  async fuList(filter) {
    const all = (await Repo.allFus()).filter(f => Repo.fuClass(f) === filter);
    return all.sort((a, b) => filter === 'Completed' ? b.date.localeCompare(a.date) || b.id - a.id : a.date.localeCompare(b.date));
  },
  async fuCounts() { const c = { 'Due Today': 0, 'Upcoming': 0, 'Overdue': 0, 'Completed': 0 }; (await Repo.allFus()).forEach(f => { c[Repo.fuClass(f)]++; }); return c; },
  async pending(limit) { const l = (await Repo.allFus()).filter(f => !f.completed).sort((a, b) => a.date.localeCompare(b.date)); return limit ? l.slice(0, limit) : l; },
  /** Records a visit. One active "next follow-up" per patient: a new visit replaces any pending one. */
  async saveVisit(o) {
    let editingCompleted = false, id = o.existingId;
    if (id) { const ex = await dbGet('followups', id); editingCompleted = !!(ex && ex.completed); }
    const base = { patientId: o.pid, date: o.date, notes: nn(o.notes), status: o.status || null, completed: true, nextDate: o.nextDate || null };
    if (id) { const ex = await dbGet('followups', id); id = await dbPut('followups', Object.assign({}, ex, base)); }
    else id = await dbPut('followups', Object.assign({ createdAt: new Date().toISOString() }, base));
    if (!editingCompleted) {
      for (const f of await dbBy('followups', o.pid)) if (!f.completed && f.id !== id) await dbDel('followups', f.id);
      if (o.nextDate) await dbPut('followups', { patientId: o.pid, date: o.nextDate, notes: null, status: null, completed: false, nextDate: null, createdAt: new Date().toISOString() });
    }
    await Repo.touch(o.pid); await Repo.audit(o.existingId ? 'update' : 'create', 'followup', id, o.pid);
    return id;
  },
  async schedule(pid, date) {
    for (const f of await dbBy('followups', pid)) if (!f.completed) await dbDel('followups', f.id);
    const id = await dbPut('followups', { patientId: pid, date, notes: null, status: null, completed: false, nextDate: null, createdAt: new Date().toISOString() });
    await Repo.audit('create', 'followup', id, pid);
  },
  async delFu(id) { await Repo.delRefMedia('followup', id); await dbDel('followups', id); await Repo.audit('delete', 'followup', id); },
  /* ---- notes ---- */
  async notes(pid) { return (await dbBy('notes', pid)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); },
  async addNote(pid, text) { const id = await dbPut('notes', { patientId: pid, note: text.trim(), createdAt: new Date().toISOString() }); await Repo.touch(pid); await Repo.audit('create', 'note', id, pid); },
  async delNote(id) { await dbDel('notes', id); await Repo.audit('delete', 'note', id); },
  /* ---- timeline ---- */
  async timeline(pid) {
    const p = await dbGet('patients', pid); if (!p) return [];
    const ev = [{ date: (p.createdAt || iso(today())).slice(0, 10), title: 'Initial visit', sub: p.cc || '', type: 'visit', tab: 'overview' }];
    (await Repo.invs(pid)).forEach(i => ev.push({ date: i.date, title: i.name, sub: i.notes || 'Investigation', type: 'inv', tab: 'inv' }));
    (await Repo.surgeries(pid)).forEach(s => ev.push({ date: s.date, title: 'Surgery - ' + s.procedure, sub: s.indication || '', type: 'surgery', tab: 'surgery' }));
    (await Repo.fus(pid)).forEach(f => ev.push(f.completed ? { date: f.date, title: 'Follow-up', sub: f.notes || f.status || '', type: 'fu', tab: 'fu' } : { date: f.date, title: 'Follow-up scheduled', sub: relDays(f.date), type: 'sched', tab: 'fu' }));
    return ev.sort((a, b) => a.date.localeCompare(b.date));
  },
  /* ---- stats ---- */
  async counts() {
    const [p, s, i, m, f] = await Promise.all([dbAll('patients'), dbAll('surgeries'), dbAll('investigations'), dbAll('media'), dbAll('followups')]);
    const t = iso(today());
    return { patients: p.length, surgeries: s.length, investigations: i.length, media: m.length, seen: f.filter(x => x.completed).length, due: f.filter(x => !x.completed && x.date <= t).length };
  },
  async dxStats() {
    const m = {};
    (await dbAll('patients')).forEach(p => (p.dx || []).forEach(d => { m[d.name] = (m[d.name] || 0) + 1; }));
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  },
  async auditLog() { return (await dbAll('audit')).sort((a, b) => b.id - a.id).slice(0, 200); },
  /* ---- demo ---- */
  async hasDemo() { return (await dbAll('patients')).some(p => p.isDemo); },
  async loadDemo() {
    if (await Repo.hasDemo()) return;
    const d = n => iso(new Date(today().getFullYear(), today().getMonth(), today().getDate() + n));
    const mk = async (uhid, name, age, sex, cc, dx) => Repo.savePatient({ uhid, name, age, sex, cc, mobile: null, addDx: null, isDemo: true, dx });
    const a = await mk('DEMO/2026/001', 'Demo Patient A', 58, 'Male', 'Hematuria for 2 weeks', [{ name: 'Ca Bladder' }]);
    await Repo.addInv(a, 'RFT', d(-20)); await Repo.addInv(a, 'CBC', d(-20)); await Repo.addInv(a, 'CT', d(-19), 'Sample entry');
    await Repo.saveSurgery({ patientId: a, procedure: 'TURBT', date: d(-14), duration: 55, assist1: 'Dr. Sample A', assist2: 'Dr. Sample B', indication: 'Ca bladder - diagnostic and therapeutic', notes: 'Sample operative note.', hpe: 'Sample HPE entry' });
    await Repo.saveVisit({ pid: a, date: d(-3), notes: 'Sample follow-up note.', status: 'Stable', nextDate: d(0) });
    const b = await mk('DEMO/2026/002', 'Demo Patient B', 46, 'Male', 'Right flank pain for 1 month', [{ name: 'Renal Stone', lat: 'Right' }]);
    await Repo.addInv(b, 'Urine Analysis', d(-5)); await Repo.schedule(b, d(6));
    const c = await mk('DEMO/2026/003', 'Demo Patient C', 62, 'Male', 'Poor stream, nocturia', [{ name: 'Prostate CA' }]);
    await Repo.addInv(c, 'PSA', d(-8)); await Repo.schedule(c, d(-4));
    const e = await mk('DEMO/2026/004', 'Demo Patient D', 34, 'Female', 'Left loin pain', [{ name: 'PUJO', lat: 'Left' }]);
    await Repo.addInv(e, 'DTPA', d(-2)); await Repo.schedule(e, d(21));
  },
  async clearDemo() { for (const p of await dbAll('patients')) if (p.isDemo) await Repo.deletePatient(p.id); },
  /* ---- backup (JSON, images as base64) ---- */
  async buildBackup(onProgress) {
    const parts = ['{"app":"UroVault","version":1,"exportedAt":' + JSON.stringify(new Date().toISOString()) + ','];
    for (const n of ['patients', 'investigations', 'surgeries', 'followups', 'notes', 'media', 'audit']) parts.push(JSON.stringify(n) + ':' + JSON.stringify(await dbAll(n)) + ',');
    parts.push('"blobs":[');
    const blobs = await dbAll('blobs');
    let first = true, k = 0;
    for (const b of blobs) {
      parts.push((first ? '' : ',') + JSON.stringify({ id: b.id, type: b.blob.type, data: await blobToB64(b.blob) }));
      first = false; k++;
      if (onProgress) onProgress(k, blobs.length);
    }
    parts.push(']}');
    return new Blob(parts, { type: 'application/json' });
  },
  async restoreBackup(text) {
    const j = JSON.parse(text);
    if (j.app !== 'UroVault' || !j.patients) throw new Error('This file is not a UroVault backup');
    for (const n of ['patients', 'investigations', 'surgeries', 'followups', 'notes', 'media', 'blobs', 'audit']) await dbClear(n);
    _urls.forEach(u => URL.revokeObjectURL(u)); _urls.clear();
    for (const n of ['patients', 'investigations', 'surgeries', 'followups', 'notes', 'media', 'audit']) for (const r of (j[n] || [])) await dbPut(n, r);
    for (const b of (j.blobs || [])) await dbPut('blobs', { id: b.id, blob: b64ToBlob(b.data, b.type) });
    await Repo.audit('restore', 'backup');
  },
  async eraseAll() { for (const n of STORES) await dbClear(n); _urls.clear(); }
};

/* ---------------- auth (local account, PBKDF2) ---------------- */
const enc = new TextEncoder();
const bytesToB64 = a => btoa(String.fromCharCode(...a));
const b64ToBytes = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function pbk(pw, salt) {
  const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' }, key, 256));
}
const Auth = {
  has: async () => !!(await metaGet('acct')),
  async create(name, id, pw) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    await metaSet('acct', { name: name.trim(), id: id.trim().toLowerCase(), salt: bytesToB64(salt), hash: bytesToB64(await pbk(pw, salt)) });
  },
  async verify(id, pw) {
    const a = await metaGet('acct'); if (!a || a.id !== id.trim().toLowerCase()) return false;
    return bytesToB64(await pbk(pw, b64ToBytes(a.salt))) === a.hash;
  },
  async setPassword(pw) { const a = await metaGet('acct'); const salt = crypto.getRandomValues(new Uint8Array(16)); a.salt = bytesToB64(salt); a.hash = bytesToB64(await pbk(pw, salt)); await metaSet('acct', a); },
  acct: () => metaGet('acct'),
  async setName(n) { const a = await metaGet('acct'); a.name = n.trim(); await metaSet('acct', a); }
};
