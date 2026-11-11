'use strict';
/* ===================== Case series: Excel (.xlsx) export, built fully on-device ===================== */

/* ---- minimal XLSX writer (zip "store", no dependencies) ---- */
const _crcT = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = _crcT[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function zipStore(files) {
  const te = new TextEncoder(); const parts = []; const cen = []; let off = 0;
  const u16 = v => [v & 255, (v >> 8) & 255], u32 = v => [v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >>> 24) & 255];
  for (const f of files) {
    const name = te.encode(f.name), data = te.encode(f.data), crc = crc32(data);
    const lh = new Uint8Array([0x50, 0x4b, 3, 4, 20, 0, 0, 8, 0, 0, 0, 0, 0x21, 0, ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), 0, 0]);
    parts.push(lh, name, data);
    cen.push(new Uint8Array([0x50, 0x4b, 1, 2, 20, 0, 20, 0, 0, 8, 0, 0, 0, 0, 0x21, 0, ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ...u32(off)]), name);
    off += lh.length + name.length + data.length;
  }
  const cs = cen.reduce((a, b) => a + b.length, 0);
  const end = new Uint8Array([0x50, 0x4b, 5, 6, 0, 0, 0, 0, ...u16(files.length), ...u16(files.length), ...u32(cs), ...u32(off), 0, 0]);
  return new Blob([...parts, ...cen, end], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
const xe = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
const colName = i => { let s = ''; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
function sheetXml(rows, widths) {
  const nc = rows[0].length;
  let x = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>';
  for (let i = 0; i < nc; i++) x += '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + ((widths && widths[i]) || 16) + '" customWidth="1"/>';
  x += '</cols><sheetData>';
  rows.forEach((r, ri) => {
    x += '<row r="' + (ri + 1) + '">';
    r.forEach((v, ci) => {
      const ref = colName(ci) + (ri + 1), st = ri === 0 ? 1 : 2;
      if (v === null || v === undefined || v === '') x += '<c r="' + ref + '" s="' + st + '"/>';
      else if (typeof v === 'number' && isFinite(v)) x += '<c r="' + ref + '" s="' + st + '"><v>' + v + '</v></c>';
      else x += '<c r="' + ref + '" s="' + st + '" t="inlineStr"><is><t xml:space="preserve">' + xe(v) + '</t></is></c>';
    });
    x += '</row>';
  });
  return x + '</sheetData><autoFilter ref="A1:' + colName(nc - 1) + Math.max(1, rows.length) + '"/></worksheet>';
}
function buildXlsx(sheets) {
  const files = [
    { name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' + sheets.map((s, i) => '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('') + '</Types>' },
    { name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
    { name: 'xl/workbook.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' + sheets.map((s, i) => '<sheet name="' + xe(s.name) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>').join('') + '</sheets></workbook>' },
    { name: 'xl/_rels/workbook.xml.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + sheets.map((s, i) => '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>').join('') + '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
    { name: 'xl/styles.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0F2942"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFCBD5E1"/></left><right style="thin"><color rgb="FFCBD5E1"/></right><top style="thin"><color rgb="FFCBD5E1"/></top><bottom style="thin"><color rgb="FFCBD5E1"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>' }
  ];
  sheets.forEach((s, i) => files.push({ name: 'xl/worksheets/sheet' + (i + 1) + '.xml', data: sheetXml(s.rows, s.widths) }));
  return zipStore(files);
}

/* ---- case series data ---- */
const dfx = s => { if (!s) return ''; const d = parseIso(s); return String(d.getDate()).padStart(2, '0') + '-' + MONTHS[d.getMonth()] + '-' + d.getFullYear(); };
async function caseSeriesBook(patients, anon) {
  const [invAll, surAll, fuAll, noteAll, medAll] = await Promise.all(['investigations', 'surgeries', 'followups', 'notes', 'media'].map(dbAll));
  const by = (arr, id) => arr.filter(x => x.patientId === id);
  const ps = patients.slice().sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || '') || a.id - b.id);
  const idCols = anon ? ['Case #'] : ['Case #', 'UHID', 'Patient name'];
  const idv = (p, i) => anon ? ['C' + String(i + 1).padStart(2, '0')] : ['C' + String(i + 1).padStart(2, '0'), p.uhid, p.name];
  const idw = anon ? [9] : [9, 16, 22];
  const stdInv = INV_OPTIONS.filter(n => n !== 'Other');
  const main = [idCols.concat(['Age', 'Sex'], anon ? [] : ['Mobile'], ['Registered on', 'Chief complaints', 'Diagnosis', 'Laterality', 'Clinical notes'], stdInv, ['Other investigations', 'No. of surgeries', 'Name of surgery', 'Date of surgery', 'Duration (min)', 'Assistant 1', 'Assistant 2', 'Assistant 3', 'Indication', 'Operative findings', 'Operative notes', 'HPE', 'Post-op notes', 'No. of visits', 'Last visit date', 'Last status', 'Last visit notes', 'Next follow-up due', 'Follow-up course', 'Media items'])];
  const fuS = [idCols.concat(['Date', 'Type', 'Status', 'Notes', 'Next planned'])];
  const suS = [idCols.concat(['Date of surgery', 'Name of surgery', 'Duration (min)', 'Assistant 1', 'Assistant 2', 'Assistant 3', 'Indication', 'Operative findings', 'Operative notes', 'HPE', 'Post-op notes'])];
  const ivS = [idCols.concat(['Investigation', 'Date', 'Result / notes'])];
  ps.forEach((p, i) => {
    const id = idv(p, i);
    const invs = by(invAll, p.id).sort((a, b) => a.date.localeCompare(b.date));
    const sus = by(surAll, p.id).sort((a, b) => a.date.localeCompare(b.date));
    const fus = by(fuAll, p.id).sort((a, b) => a.date.localeCompare(b.date));
    const visits = fus.filter(f => f.completed), pend = fus.find(f => !f.completed), last = visits[visits.length - 1];
    const notes = by(noteAll, p.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const j = (arr, f) => arr.map(f).join('\n');
    const multi = sus.length > 1, one = (k) => multi ? j(sus, (s, n) => (n + 1) + ') ' + (s[k] || '-')) : (sus[0] ? sus[0][k] || '' : '');
    main.push(id.concat([p.age, p.sex], anon ? [] : [p.mobile || ''], [dfx((p.createdAt || '').slice(0, 10)), p.cc || '', (p.dx || []).map(d => d.name === 'Other' && p.addDx ? p.addDx : d.name).join(', '), (p.dx || []).filter(d => d.lat).map(d => d.name + ': ' + d.lat).join(', '), j(notes, n => dfx(n.createdAt.slice(0, 10)) + ': ' + n.note)],
      stdInv.map(n => j(invs.filter(x => x.name === n), x => dfx(x.date) + (x.notes ? ': ' + x.notes : ' (done)'))),
      [j(invs.filter(x => !stdInv.includes(x.name)), x => x.name + ' ' + dfx(x.date) + (x.notes ? ': ' + x.notes : '')), sus.length,
        multi ? j(sus, (s, n) => (n + 1) + ') ' + s.procedure) : (sus[0] ? sus[0].procedure : ''), multi ? j(sus, (s, n) => (n + 1) + ') ' + dfx(s.date)) : (sus[0] ? dfx(sus[0].date) : ''),
        multi ? j(sus, (s, n) => (n + 1) + ') ' + (s.duration || '-')) : (sus[0] && sus[0].duration ? sus[0].duration : ''), one('assist1'), one('assist2'), one('assist3'), one('indication'), one('findings'), one('notes'), one('hpe'), one('postop'),
        visits.length, last ? dfx(last.date) : '', last ? last.status || 'Not recorded' : '', last ? last.notes || '' : '', pend ? dfx(pend.date) : '',
        j(visits, f => dfx(f.date) + ' - ' + (f.status || 'status n/r') + (f.notes ? ' - ' + f.notes : '')), by(medAll, p.id).length]));
    visits.concat(pend ? [pend] : []).forEach(f => fuS.push(id.concat([dfx(f.date), f.completed ? 'Visit' : 'Scheduled', f.status || '', f.notes || '', f.nextDate ? dfx(f.nextDate) : ''])));
    sus.forEach(s => suS.push(id.concat([dfx(s.date), s.procedure, s.duration || '', s.assist1 || '', s.assist2 || '', s.assist3 || '', s.indication || '', s.findings || '', s.notes || '', s.hpe || '', s.postop || ''])));
    invs.forEach(x => ivS.push(id.concat([x.name, dfx(x.date), x.notes || ''])));
  });
  const lead = main[0].length;
  const mw = idw.concat([7, 9], anon ? [] : [14], [13, 34, 26, 16, 34], stdInv.map(() => 26), [30, 11, 24, 16, 13, 16, 16, 16, 28, 30, 34, 28, 28, 10, 14, 13, 32, 15, 44, 9]);
  return buildXlsx([
    { name: 'Case Series', rows: main, widths: mw }, { name: 'Surgeries', rows: suS, widths: idw.concat([14, 24, 13, 16, 16, 16, 28, 30, 34, 28, 28]) },
    { name: 'Follow-ups', rows: fuS, widths: idw.concat([14, 11, 13, 40, 14]) }, { name: 'Investigations', rows: ivS, widths: idw.concat([20, 14, 44]) }
  ]);
}

/* ---- case series view ---- */
const CS = { dx: new Set(), proc: new Set(), sex: 'Any', amin: '', amax: '', anon: true, demo: false };
Views.caseSeries = async () => {
  const [ps, sur] = await Promise.all([Repo.patients(), dbAll('surgeries')]);
  const realCount = ps.filter(p => !p.isDemo).length;
  if (!realCount && ps.length) CS.demo = true;
  const procs = [...new Set(sur.map(s => s.procedure))].sort();
  const procByPt = new Map(); sur.forEach(s => { (procByPt.get(s.patientId) || procByPt.set(s.patientId, new Set()).get(s.patientId)).add(s.procedure); });
  const match = () => ps.filter(p => {
    if (p.isDemo && !CS.demo) return false;
    if (CS.dx.size && !(p.dx || []).some(d => CS.dx.has(d.name))) return false;
    if (CS.proc.size && ![...(procByPt.get(p.id) || [])].some(x => CS.proc.has(x))) return false;
    if (CS.sex !== 'Any' && p.sex !== CS.sex) return false;
    if (CS.amin !== '' && p.age < Number(CS.amin)) return false;
    if (CS.amax !== '' && p.age > Number(CS.amax)) return false;
    return true;
  });
  const chipRow = (items, set, attr) => '<div class="chips wrapchips">' + items.map(c => '<button type="button" class="chip sm ' + (set.has(c) ? 'on' : '') + '" ' + attr + '="' + esc(c) + '">' + esc(c) + '</button>').join('') + '</div>';
  const sw = (id, on) => '<button class="sw ' + (on ? 'on' : '') + '" data-tg="' + id + '"></button>';
  return {
    html: hdr('Case Series') + wrapPage(
      '<div class="small" style="margin:2px 2px 4px">Pick filters, then export all matching cases to Excel - one row per case with every detail.</div>' +
      '<label class="lbl">Diagnosis</label>' + chipRow(DX_OPTIONS.map(o => o.name), CS.dx, 'data-dx') +
      (procs.length ? '<label class="lbl">Surgery done</label>' + chipRow(procs, CS.proc, 'data-pr') : '') +
      '<div class="two" style="grid-template-columns:1fr 1fr 1fr;gap:10px"><div><label class="lbl">Age from</label><input class="inp" id="amin" type="number" inputmode="numeric" value="' + esc(CS.amin) + '"></div><div><label class="lbl">Age to</label><input class="inp" id="amax" type="number" inputmode="numeric" value="' + esc(CS.amax) + '"></div><div><label class="lbl">Sex</label><select class="sel" id="sx">' + ['Any', 'Male', 'Female', 'Other'].map(s => '<option ' + (CS.sex === s ? 'selected' : '') + '>' + s + '</option>').join('') + '</select></div></div>' +
      '<div class="card mrow" style="margin-top:16px"><div class="grow"><div class="t">Anonymize</div><div class="s">Hides name, UHID, mobile. Cases become C01, C02...</div></div>' + sw('anon', CS.anon) + '</div>' +
      (ps.some(p => p.isDemo) ? '<div class="card mrow"><div class="grow"><div class="t">Include sample patients</div></div>' + sw('demo', CS.demo) + '</div>' : '') +
      '<div class="small" style="margin:6px 2px">Anonymize hides identifier fields only. Names typed inside notes are not removed - check before sharing.</div>', true) +
      '<div class="bar"><div class="in"><button class="btn" id="xbtn"></button></div></div>',
    acts: {},
    bind: root => {
      const upd = () => { const n = match().length; const b = $('#xbtn'); b.disabled = !n; b.innerHTML = ic('download', 20) + ' Export Excel (' + n + ' case' + (n === 1 ? '' : 's') + ')'; };
      const flip = (set, v, el) => { set.has(v) ? set.delete(v) : set.add(v); el.classList.toggle('on'); upd(); };
      root.addEventListener('click', e => {
        const d = e.target.closest('[data-dx]'); if (d) return flip(CS.dx, d.dataset.dx, d);
        const p = e.target.closest('[data-pr]'); if (p) return flip(CS.proc, p.dataset.pr, p);
        const t = e.target.closest('[data-tg]'); if (t) { CS[t.dataset.tg] = !CS[t.dataset.tg]; t.classList.toggle('on', CS[t.dataset.tg]); upd(); }
      });
      $('#amin').oninput = e => { CS.amin = e.target.value; upd(); }; $('#amax').oninput = e => { CS.amax = e.target.value; upd(); };
      $('#sx').onchange = e => { CS.sex = e.target.value; upd(); };
      $('#xbtn').onclick = async () => {
        const list = match(); if (!list.length) return;
        const blob = await withBusy('Building Excel...', () => caseSeriesBook(list, CS.anon));
        const r = await shareOrSave(blob, 'urovault-case-series-' + iso(today()) + '.xlsx');
        await Repo.audit('export', 'case-series'); if (r === 'downloaded') toast('Saved to downloads');
      };
      upd();
    }
  };
};
ACT.caseSeries = () => go('caseSeries');
