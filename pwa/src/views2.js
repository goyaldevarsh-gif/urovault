'use strict';
/* ===================== views: patient profile, forms ===================== */

const TABS = [['overview', 'Overview'], ['media', 'Media'], ['inv', 'Investigations'], ['surgery', 'Surgery'], ['fu', 'Follow-up']];

Views.profile = async (params) => {
  const pid = params.id;
  const p = await Repo.patient(pid);
  if (!p) return { html: hdr('Patient') + wrapPage(emptyBox('alert', 'Patient not found', 'This record may have been deleted.')) };
  let tab = params.tab || 'overview';
  let mcat = 'All';
  const dx = (p.dx || []);

  const head = '<div class="wrap" style="padding-top:14px"><div class="card"><div class="phead"><div class="avatar lg">' + esc(initials(p.name)) + '</div><div style="flex:1;min-width:0">' +
    '<div class="t-name" style="font-size:17px;white-space:normal">' + esc(p.name) + (p.isDemo ? ' <span class="pill grey">Demo</span>' : '') + '</div>' +
    '<div style="font-size:19px;font-weight:700;color:var(--link);letter-spacing:.5px;overflow-wrap:anywhere">' + esc(p.uhid) + '</div>' +
    '<div class="t-sub">' + p.age + ' yrs &middot; ' + esc(p.sex) + '</div></div>' +
    (p.mobile ? '<a class="iconbox" href="tel:' + esc(p.mobile) + '" aria-label="Call" style="background:var(--btn);color:#fff">' + ic('phone', 20) + '</a>' : '') + '</div>' +
    (dx.length ? '<div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:6px">' + dx.map(d => '<span class="pill">' + esc(dxLabel(d, p)) + '</span>').join('') + '</div>' : '') + '</div></div>';

  const tabsHtml = () => '<div class="in">' + TABS.map(t => '<button class="tab ' + (t[0] === tab ? 'on' : '') + '" data-act="ptab" data-t="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>';

  /* ---- content builders ---- */
  async function overview() {
    const [fus, notes, tl] = await Promise.all([Repo.fus(pid), Repo.notes(pid), Repo.timeline(pid)]);
    const pend = fus.find(f => !f.completed);
    const dxCards = dx.length ? dx.map(d => '<div class="card tile" style="margin-bottom:8px"><div class="iconbox">' + dxIc(d.name, 26) + '</div><div class="grow"><div class="t-name">' + esc(d.name === 'Other' && p.addDx ? p.addDx : d.name) + '</div><div class="t-sub">' + (d.lat ? esc(d.lat) : 'Laterality not specified') + '</div></div></div>').join('') :
      '<div class="card" style="text-align:center"><div class="small" style="margin-bottom:10px">No diagnosis selected yet</div><button class="btn sm" style="width:auto;padding:0 22px" data-act="editDx">Select diagnosis</button></div>';
    return '<div class="qa" style="margin-top:14px"><button data-act="addInv"><div class="iconbox">' + ic('flask', 22) + '</div>Investigation</button><button data-act="addMedia"><div class="iconbox">' + ic('camera', 22) + '</div>Add Media</button><button data-act="visit"><div class="iconbox">' + ic('clip2', 22) + '</div>Record Visit</button></div>' +
      '<div class="sec"><h2>Chief Complaints</h2></div><div class="card pre">' + esc(p.cc || 'Not recorded') + '</div>' +
      '<div class="sec"><h2>Diagnosis</h2>' + (dx.length ? '<button data-act="editDx">Change</button>' : '') + '</div>' + dxCards +
      guideKinds(p).map(k => '<div class="card tap" data-act="openGuide" data-pid="' + pid + '" data-k="' + k + '" style="display:flex;align-items:center;gap:12px;margin-top:8px;border-color:var(--teal)"><div class="iconbox">' + ic('book', 22) + '</div><div class="grow"><div class="t-name">EAU Guidance - ' + GUIDE[k].name + '</div><div class="t-sub">' + esc((p.clin && p.clin[k] && p.clin[k].badge) || 'Answer a few questions for risk group and next steps') + '</div></div>' + ic('chev', 18) + '</div>').join('') +
      '<div class="sec"><h2>Next Follow-up</h2></div>' + (pend ? '<div class="card tap" data-act="ptab" data-t="fu" style="display:flex;align-items:center;gap:12px">' + ic('cal', 22) + '<div style="flex:1"><div class="big-date">' + fmt(pend.date) + '</div></div><span class="pill ' + (dayDiff(pend.date) < 0 ? 'red' : dayDiff(pend.date) === 0 ? 'amber' : '') + '">' + esc(relDays(pend.date)) + '</span></div>' : '<div class="card small" style="text-align:center">None scheduled</div>') +
      '<div class="sec"><h2>Clinical Notes</h2><button data-act="addNote">+ Add note</button></div>' +
      (notes.length ? notes.map(n => '<div class="card"><div class="pre">' + esc(n.note) + '</div><div style="display:flex;align-items:center;margin-top:8px"><span class="small" style="flex:1">' + fmtDT(n.createdAt) + '</span><button class="linkbtn" style="color:var(--redd)" data-act="delNote" data-id="' + n.id + '">Delete</button></div></div>').join('') : '<div class="card small" style="text-align:center">No notes</div>') +
      '<div class="sec"><h2>Timeline</h2></div><div class="tl">' + tl.slice().reverse().map(e => '<div class="ev ' + (e.type === 'sched' ? 'hollow' : e.type === 'surgery' ? 'red' : e.type === 'fu' ? 'green' : '') + '"><div class="card tap" data-act="ptab" data-t="' + e.tab + '" style="margin:0;padding:12px 14px"><div style="display:flex;gap:8px"><b style="flex:1">' + esc(e.title) + '</b><span class="small">' + fmt(e.date) + '</span></div>' + (e.sub ? '<div class="small" style="margin-top:2px">' + esc(e.sub) + '</div>' : '') + '</div></div>').join('') + '</div>' +
      '<div class="small" style="text-align:center;margin-top:18px">Registered ' + fmt((p.createdAt || '').slice(0, 10)) + '</div>';
  }
  let mediaCache = [];
  async function mediaTab() {
    mediaCache = await Repo.media(pid);
    const counts = c => c === 'All' ? mediaCache.length : mediaCache.filter(m => m.category === c).length;
    const shown = mcat === 'All' ? mediaCache : mediaCache.filter(m => m.category === mcat);
    return '<div class="chips" id="mc" style="padding:12px 0 6px">' + ['All'].concat(MEDIA_CATS).map(c => '<button class="chip sm ' + (c === mcat ? 'on' : '') + '" data-act="mcat" data-c="' + c + '">' + c + '<span class="c">' + counts(c) + '</span></button>').join('') + '</div>' +
      (shown.length ? '<div class="mgrid" style="margin-top:6px">' + shown.map(m => '<button class="mi ' + (m.thumb ? '' : 'file') + '" data-act="openMedia" data-id="' + m.id + '">' + (m.thumb ? '<img alt="" src="' + m.thumb + '">' : ic('file', 28) + '<span>' + esc((m.name || '').slice(0, 18)) + '</span>') + '<div class="cap">' + esc(m.category) + ' &middot; ' + fmt(m.takenAt).slice(0, -5) + '</div></button>').join('') + '</div>' :
        emptyBox('image', mcat === 'All' ? 'No media yet' : 'No ' + mcat + ' items', 'Add clinical photos, scans or documents.'));
  }
  async function invTab() {
    const [invs, media] = await Promise.all([Repo.invs(pid), Repo.media(pid)]);
    const done = new Set(invs.map(i => i.name));
    return '<div class="sec"><h2>Checklist</h2><span class="small">' + [...done].filter(n => INV_OPTIONS.includes(n)).length + ' / ' + INV_OPTIONS.length + '</span></div>' +
      '<div class="card" style="padding:4px 14px">' + INV_OPTIONS.map(n => '<div class="irow" data-act="addInvN" data-n="' + esc(n) + '" style="cursor:pointer;align-items:center"><span class="chk ' + (done.has(n) ? 'on' : '') + '">' + (done.has(n) ? ic('check', 14) : '') + '</span><div style="flex:1;font-weight:600">' + esc(n) + '</div><span class="small">' + (done.has(n) ? invs.filter(i => i.name === n).length + ' recorded' : 'Add') + '</span>' + ic('chev', 16) + '</div>').join('') + '</div>' +
      '<div class="sec"><h2>Recorded</h2></div>' + (invs.length ? invs.map(i => {
        const att = media.filter(m => m.refType === 'investigation' && m.refId === i.id);
        return '<div class="card"><div style="display:flex;align-items:center;gap:12px;cursor:pointer" data-act="editInv" data-id="' + i.id + '"><div class="iconbox">' + ic(INV_ICON[i.name] || 'file', 22) + '</div><div style="flex:1;min-width:0"><div class="t-name">' + esc(i.name) + '</div><div class="t-sub">' + fmt(i.date) + '</div></div>' + ic('edit', 18) + '</div>' +
          (i.notes ? '<div class="pre small" style="margin-top:8px;color:var(--navy)">' + esc(i.notes) + '</div>' : '') +
          (att.length ? '<div class="thumbs">' + att.map((m, k) => '<button class="th ' + (m.thumb ? '' : 'file') + '" data-act="openAtt" data-ref="' + i.id + '" data-k="' + k + '">' + (m.thumb ? '<img alt="" src="' + m.thumb + '">' : ic('file', 22)) + '</button>').join('') + '</div>' : '') + '</div>';
      }).join('') : '<div class="card small" style="text-align:center">Nothing recorded. Tap a test above.</div>');
  }
  async function surgeryTab() {
    const [ss, media] = await Promise.all([Repo.surgeries(pid), Repo.media(pid)]);
    return (ss.length ? ss.map(s => {
      const att = media.filter(m => m.refType === 'surgery' && m.refId === s.id);
      return '<div class="card tap" data-act="editSurg" data-id="' + s.id + '"><div style="display:flex;gap:10px;align-items:center"><div class="iconbox">' + ic('scalpel', 22) + '</div><div style="flex:1;min-width:0"><div class="t-name" style="white-space:normal">' + esc(s.procedure) + '</div><div class="t-sub">' + fmt(s.date) + '</div></div>' + ic('chev', 18) + '</div>' +
        (s.indication ? '<div class="small" style="margin-top:8px;color:var(--navy)">' + esc(s.indication) + '</div>' : '') +
        '<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">' + (s.duration ? '<span class="pill grey">' + fmtDur(s.duration) + '</span>' : '') + (assistants(s).length ? '<span class="pill grey">Asst: ' + esc(assistants(s).join(', ')) + '</span>' : '') + (s.hpe ? '<span class="pill">HPE</span>' : '') + (s.postop ? '<span class="pill grey">Post-op notes</span>' : '') + (att.length ? '<span class="pill grey">' + att.length + ' attachment' + (att.length > 1 ? 's' : '') + '</span>' : '') + '</div></div>';
    }).join('') : emptyBox('scalpel', 'No surgeries recorded', 'Add the procedure, findings and histopathology.'));
  }
  async function fuTab() {
    const fus = await Repo.fus(pid);
    const pend = fus.find(f => !f.completed), hist = fus.filter(f => f.completed);
    return '<div class="sec"><h2>Next Follow-up</h2></div>' + (pend ?
      '<div class="card"><div style="display:flex;align-items:center;gap:10px"><div class="big-date" style="flex:1">' + fmt(pend.date) + '</div><span class="pill ' + (dayDiff(pend.date) < 0 ? 'red' : dayDiff(pend.date) === 0 ? 'amber' : '') + '">' + esc(relDays(pend.date)) + '</span></div>' +
      '<div class="row" style="margin-top:12px"><button class="btn sm" data-act="visit">Record visit</button><button class="btn o sm" data-act="chgDate">Change date</button></div>' +
      '<div style="text-align:center;margin-top:8px"><button class="linkbtn" style="color:var(--redd)" data-act="cancelFu" data-id="' + pend.id + '">Cancel follow-up</button></div></div>' :
      '<div class="card"><div class="small" style="margin-bottom:10px">None scheduled. Schedule after:</div><div class="chips wrapchips">' + INTERVALS.map(i => '<button class="chip sm" data-act="quickSched" data-i="' + i + '">' + i + '</button>').join('') + '</div>' +
      '<div style="margin-top:12px"><button class="btn sm" data-act="visit">Record a visit now</button></div></div>') +
      '<div class="sec"><h2>Visit History</h2></div>' + (hist.length ? hist.map(f => '<div class="card tap" data-act="editVisit" data-id="' + f.id + '"><div style="display:flex;align-items:center;gap:8px"><b style="flex:1">' + fmt(f.date) + '</b>' +
        (f.status ? '<span class="pill ' + (f.status === 'Improving' ? 'green' : f.status === 'Worsening' ? 'red' : 'amber') + '">' + f.status + '</span>' : '<span class="pill grey">Status not recorded</span>') + '</div>' +
        (f.notes ? '<div class="pre small" style="margin-top:6px;color:var(--navy)">' + esc(f.notes) + '</div>' : '') + (f.nextDate ? '<div class="small" style="margin-top:6px">Next planned: ' + fmt(f.nextDate) + '</div>' : '') + '</div>').join('') : '<div class="card small" style="text-align:center">No visits recorded yet</div>');
  }
  const barFor = () => tab === 'media' ? '<div class="bar"><div class="in"><button class="btn" data-act="addMedia">' + ic('plus', 20) + ' Add Photo or File</button></div></div>' :
    tab === 'surgery' ? '<div class="bar"><div class="in"><button class="btn" data-act="addSurg">' + ic('plus', 20) + ' Add Surgery</button></div></div>' :
    tab === 'fu' ? '<div class="bar"><div class="in"><button class="btn" data-act="visit">' + ic('clip2', 20) + ' Record Visit</button></div></div>' : '';
  async function fill() {
    const c = $('#tabc'); if (!c) return;
    const html = tab === 'overview' ? await overview() : tab === 'media' ? await mediaTab() : tab === 'inv' ? await invTab() : tab === 'surgery' ? await surgeryTab() : await fuTab();
    c.innerHTML = html; $('#tabbar').innerHTML = barFor();
    const tw = $('#tabw'); if (tw) tw.innerHTML = tabsHtml();
    c.parentElement.classList.toggle('nobar', !barFor());
  }
  const attGroup = async (ref, k, type) => {
    const media = (await Repo.media(pid)).filter(m => m.refType === type && m.refId === ref);
    openViewer(media, k, fill);
  };

  const acts = {
    ptab: el => { tab = el.dataset.t; window.scrollTo(0, 0); fill(); },
    mcat: el => { mcat = el.dataset.c; fill(); },
    menu: () => sheet('<h3>' + esc(p.name) + '</h3><div style="height:8px"></div>' +
      [['editP', 'edit', 'Edit patient details'], ['editDx', 'sliders', 'Change diagnosis'], ['summary', 'printer', 'Print / share summary'], ['delP', 'trash', 'Delete patient']].map(r => '<div class="mrow" data-m="' + r[0] + '" style="padding:14px 4px;border-bottom:1px solid var(--bd);' + (r[0] === 'delP' ? 'color:var(--redd)' : '') + '">' + ic(r[1], 20) + '<div class="grow t">' + r[2] + '</div></div>').join(''),
      (s, close) => { s.onclick = async e => { const m = e.target.closest('[data-m]'); if (!m) return; close(); await acts[m.dataset.m](); }; }),
    editP: () => go('addPatient', { id: pid }),
    editDx: () => go('dx', { pid }),
    summary: () => go('summary', { id: pid }),
    addNote: () => sheet('<h3>Clinical note</h3><textarea class="ta" id="nt" placeholder="Write a note" style="margin-top:10px"></textarea><div style="height:14px"></div><button class="btn" id="ns">Save note</button>', (s, close) => {
      setTimeout(() => $('#nt', s).focus(), 200);
      $('#ns', s).onclick = async () => { const v = $('#nt', s).value; if (!v.trim()) return toast('Write something first'); await Repo.addNote(pid, v); close(); fill(); };
    }),
    delNote: async el => { if (await confirmDlg('Delete note?', 'This cannot be undone.', 'Delete', true)) { await Repo.delNote(+el.dataset.id); fill(); } },
    /* media */
    openMedia: el => { const shown = mcat === 'All' ? mediaCache : mediaCache.filter(m => m.category === mcat); openViewer(shown, shown.findIndex(m => m.id === +el.dataset.id), fill); },
    addMedia: () => mediaSheet(pid, fill),
    openAtt: el => attGroup(+el.dataset.ref, +el.dataset.k, 'investigation'),
    /* investigations */
    addInv: () => { tab = 'inv'; fill(); window.scrollTo(0, 0); },
    addInvN: el => invSheet(pid, { name: el.dataset.n }, fill),
    editInv: async el => invSheet(pid, { rec: await dbGet('investigations', +el.dataset.id) }, fill),
    /* surgery */
    addSurg: () => go('surgeryForm', { pid }),
    editSurg: el => go('surgeryForm', { pid, id: +el.dataset.id }),
    /* follow-ups */
    visit: () => go('visitForm', { pid }),
    editVisit: el => go('visitForm', { pid, id: +el.dataset.id }),
    quickSched: async el => { await Repo.schedule(pid, iso(nextDateFor(el.dataset.i, today()))); toast('Follow-up scheduled'); fill(); },
    chgDate: async () => {
      const pend = (await Repo.fus(pid)).find(f => !f.completed);
      sheet('<h3>Change follow-up date</h3><input class="inp" type="date" id="cd" style="margin-top:12px" value="' + (pend ? pend.date : iso(today())) + '"><div class="chips wrapchips" style="margin-top:12px">' + INTERVALS.map(i => '<button class="chip sm" data-i="' + i + '">' + i + '</button>').join('') + '</div><div style="height:16px"></div><button class="btn" id="cs">Save</button>', (s, close) => {
        s.addEventListener('click', e => { const c = e.target.closest('[data-i]'); if (c) $('#cd', s).value = iso(nextDateFor(c.dataset.i, today())); });
        $('#cs', s).onclick = async () => { const v = $('#cd', s).value; if (!v) return toast('Pick a date'); await Repo.schedule(pid, v); close(); toast('Follow-up updated'); fill(); };
      });
    },
    cancelFu: async el => { if (await confirmDlg('Cancel follow-up?', 'The scheduled follow-up will be removed.', 'Remove', true)) { await Repo.delFu(+el.dataset.id); fill(); } }
  };
  /* delete patient: return to the list */
  acts.delP = async () => {
    if (!await confirmDlg('Delete patient?', 'This permanently deletes ' + p.name + ' with all investigations, media, surgeries and follow-ups.', 'Delete', true)) return;
    await withBusy('Deleting...', () => Repo.deletePatient(pid));
    toast('Patient deleted');
    if (STACK.length > 1) back(); else setTab('patients');
  };
  return {
    html: hdr('Patient', { right: '<button class="ib" data-act="menu" aria-label="Menu">' + ic('more', 22) + '</button>' }) + head + '<div class="tabs" id="tabw" style="margin-top:14px">' + tabsHtml() + '</div>' +
      '<div class="wrap page"><div id="tabc"></div></div><div id="tabbar"></div>',
    acts, bind: () => fill()
  };
};

/* ---------------- add media sheet ---------------- */
function mediaSheet(pid, done) {
  let cat = null;
  sheet('<h3>Add media</h3><div class="small">Photos are resized to save space. Files are stored as they are.</div>' +
    attachHtml('mattach', 'Pick images or documents') +
    '<div class="lbl">Category <i>*</i></div><div class="chips wrapchips" id="mcats">' + chipsHtml(MEDIA_CATS, null, 'data-c') + '</div>' +
    '<div class="lbl">Date</div><input class="inp" type="date" id="mdate" value="' + iso(today()) + '">' +
    '<div class="lbl">Caption</div><input class="inp" id="mcap" placeholder="Optional">' +
    '<div style="height:16px"></div><button class="btn" id="msave">Save</button>', (s, close) => {
    const st = bindAttach($('#mattach', s));
    $('#mcats', s).onclick = e => { const c = e.target.closest('[data-c]'); if (!c) return; cat = c.dataset.c; $$('#mcats .chip', s).forEach(x => x.classList.toggle('on', x === c)); };
    $('#msave', s).onclick = async () => {
      if (!st.files.length) return toast('Add at least one photo or file');
      if (!cat) return toast('Choose a category');
      await withBusy('Saving...', () => saveStaged(st, { pid, category: cat, caption: $('#mcap', s).value, takenAt: $('#mdate', s).value || iso(today()) }));
      close(); toast('Saved'); done();
    };
  });
}

/* ---------------- investigation sheet ---------------- */
async function invSheet(pid, o, done) {
  const rec = o.rec || null;
  const name0 = rec ? rec.name : o.name;
  const existing = rec ? (await Repo.media(pid)).filter(m => m.refType === 'investigation' && m.refId === rec.id) : [];
  sheet('<h3>' + (rec ? 'Edit ' : 'Add ') + esc(name0) + '</h3>' +
    (name0 === 'Other' && !rec ? '<div class="lbl">Test name <i>*</i></div><input class="inp" id="iname" placeholder="e.g. Uroflowmetry">' : '') +
    '<div class="lbl">Date <i>*</i></div><input class="inp" type="date" id="idate" value="' + (rec ? rec.date : iso(today())) + '">' +
    '<div class="lbl">Result / notes</div><textarea class="ta" id="inotes" style="min-height:90px" placeholder="Key values, impression">' + esc(rec ? rec.notes || '' : '') + '</textarea>' +
    (existing.length ? '<div class="lbl">Attached</div><div class="thumbs" id="iex">' + existing.map((m, k) => '<div class="th ' + (m.thumb ? '' : 'file') + '">' + (m.thumb ? '<img alt="" src="' + m.thumb + '">' : ic('file', 22)) + '<button class="x red" data-del="' + m.id + '">' + ic('x', 12) + '</button></div>').join('') + '</div>' : '') +
    attachHtml('iattach', 'Attach report / images') + '<div style="height:16px"></div><button class="btn" id="isave">Save</button>' +
    (rec ? '<div style="height:10px"></div><button class="btn o" style="color:var(--redd);border-color:var(--red)" id="idel">Delete this record</button>' : ''), (s, close) => {
    const st = bindAttach($('#iattach', s));
    const ex = $('#iex', s);
    if (ex) ex.onclick = async e => { const b = e.target.closest('[data-del]'); if (!b) return; if (await confirmDlg('Remove attachment?', 'This cannot be undone.', 'Remove', true)) { const m = existing.find(x => x.id === +b.dataset.del); await Repo.delMedia(m); b.parentElement.remove(); } };
    $('#isave', s).onclick = async () => {
      const name = rec ? rec.name : (name0 === 'Other' ? ($('#iname', s).value.trim() || '') : name0);
      const date = $('#idate', s).value;
      if (!name) return toast('Enter the test name');
      if (!date) return toast('Pick a date');
      await withBusy('Saving...', async () => {
        let id = rec ? rec.id : null;
        if (rec) await Repo.updInv(rec.id, date, $('#inotes', s).value); else id = await Repo.addInv(pid, name, date, $('#inotes', s).value);
        await saveStaged(st, { pid, category: invCat(name), takenAt: date, refType: 'investigation', refId: id, caption: name });
      });
      close(); toast('Saved'); done();
    };
    const d = $('#idel', s);
    if (d) d.onclick = async () => { if (await confirmDlg('Delete ' + rec.name + '?', 'The record and its attachments will be deleted.', 'Delete', true)) { await Repo.delInv(rec.id); close(); done(); } };
  });
}

/* ---------------- surgery form ---------------- */
Views.surgeryForm = async ({ pid, id }) => {
  const s = id ? await dbGet('surgeries', id) : null;
  const pt = await Repo.patient(pid);
  const v = s || {};
  const media = s ? (await Repo.media(pid)).filter(m => m.refType === 'surgery' && m.refId === s.id) : [];
  let cat = null;
  const ta = (k, l, ph) => '<label class="lbl">' + l + '</label><textarea class="ta" id="' + k + '" style="min-height:84px" placeholder="' + ph + '">' + esc(v[k] || '') + '</textarea>';
  return {
    html: hdr(s ? 'Edit Surgery' : 'Add Surgery') + wrapPage(
      '<div class="card tile" style="margin:0 0 4px"><div class="avatar">' + esc(initials(pt.name)) + '</div><div class="grow"><div class="t-name">' + esc(pt.name) + '</div><div class="t-sub"><b>' + esc(pt.uhid) + '</b></div></div></div>' +
      '<label class="lbl" style="margin-top:4px">Procedure <i>*</i></label><div class="chips wrapchips" id="procs">' + PROCEDURES.map(x => '<button type="button" class="chip sm ' + (v.procedure === x ? 'on' : '') + '" data-p="' + esc(x) + '">' + esc(x) + '</button>').join('') + '</div>' +
      '<input class="inp" id="proc" style="margin-top:10px" placeholder="Procedure name (type or pick above)" value="' + esc(v.procedure || '') + '">' +
      '<label class="lbl">Date <i>*</i></label><input class="inp" type="date" id="sdate" value="' + (v.date || iso(today())) + '">' +
      '<label class="lbl">Duration of surgery (minutes)</label><input class="inp" id="duration" type="number" inputmode="numeric" min="0" max="1440" placeholder="e.g. 90" value="' + esc(v.duration || '') + '"><div class="small" id="durl" style="margin-top:5px">' + esc(fmtDur(v.duration)) + '</div>' +
      '<label class="lbl">Assistants</label>' + [1, 2, 3].map(n => '<input class="inp" id="assist' + n + '" style="margin-bottom:8px" placeholder="Assistant ' + n + '" value="' + esc(v['assist' + n] || '') + '">').join('') +
      ta('indication', 'Indication', 'Why was it done?') + ta('findings', 'Operative findings', 'Findings') + ta('notes', 'Operative notes', 'Technique, complications') +
      ta('hpe', 'Histopathology (HPE)', 'Report summary') + ta('postop', 'Post-op notes', 'Recovery, catheter, discharge') +
      (media.length ? '<div class="lbl">Attached</div><div class="thumbs" id="sex">' + media.map(m => '<div class="th ' + (m.thumb ? '' : 'file') + '">' + (m.thumb ? '<img alt="" src="' + m.thumb + '">' : ic('file', 22)) + '<button class="x red" data-del="' + m.id + '">' + ic('x', 12) + '</button></div>').join('') + '</div>' : '') +
      attachHtml('sattach', 'Photos / reports') + '<div class="lbl" style="margin-top:12px">Label new attachments as</div><div class="chips wrapchips" id="scats">' + chipsHtml(['Pre-op', 'Post-op', 'Other'], null, 'data-c') + '</div>' +
      (s ? '<div style="height:22px"></div><button class="btn o" style="color:var(--redd);border-color:var(--red)" data-act="del">Delete surgery</button>' : ''), true) +
      '<div class="bar"><div class="in"><button class="btn" data-act="save">Save Surgery</button></div></div>',
    acts: {
      save: async () => {
        const proc = $('#proc').value.trim(), date = $('#sdate').value;
        if (!proc) return toast('Procedure is required');
        if (!date) return toast('Date is required');
        const st = Views._sst;
        await withBusy('Saving...', async () => {
          const sid = await Repo.saveSurgery({ id: s ? s.id : undefined, createdAt: s ? s.createdAt : undefined, patientId: pid, procedure: proc, date, duration: $('#duration').value, assist1: $('#assist1').value, assist2: $('#assist2').value, assist3: $('#assist3').value, indication: $('#indication').value, findings: $('#findings').value, notes: $('#notes').value, hpe: $('#hpe').value, postop: $('#postop').value });
          await saveStaged(st, { pid, category: cat || 'Other', takenAt: date, refType: 'surgery', refId: sid, caption: proc });
        });
        toast('Surgery saved'); back();
      },
      del: async () => { if (await confirmDlg('Delete surgery?', 'The record and its attachments will be deleted.', 'Delete', true)) { await Repo.delSurgery(s.id); back(); } }
    },
    bind: root => {
      Views._sst = bindAttach($('#sattach'));
      $('#duration').oninput = e => { $('#durl').textContent = fmtDur(e.target.value); };
      $('#procs').onclick = e => { const b = e.target.closest('[data-p]'); if (!b) return; $('#proc').value = b.dataset.p; $$('#procs .chip').forEach(x => x.classList.toggle('on', x === b)); };
    }
  };
};

/* ---------------- visit / follow-up form ---------------- */
Views.visitForm = async ({ pid, id }) => {
  const f = id ? await dbGet('followups', id) : null;
  const pend = !f ? (await Repo.fus(pid)).find(x => !x.completed) : null;
  const date0 = f ? f.date : iso(today());
  let status = f ? f.status : null;
  let next = f ? f.nextDate : null, label = null;
  const media = f ? (await Repo.media(pid)).filter(m => m.refType === 'followup' && m.refId === f.id) : [];
  return {
    html: hdr(f ? 'Edit Visit' : 'Record Visit') + wrapPage(
      (pend ? '<div class="banner">' + ic('cal', 16) + ' Scheduled for ' + fmt(pend.date) + '. Saving replaces it.</div>' : '') +
      '<label class="lbl" style="margin-top:6px">Visit date <i>*</i></label><input class="inp" type="date" id="vdate" value="' + date0 + '">' +
      '<label class="lbl">Clinical status</label><div class="seg" id="vstat">' + STATUSES.map(s => '<button type="button" data-s="' + s + '" class="' + (status === s ? 'on' : '') + '">' + s + '</button>').join('') + '</div><div class="small" style="margin-top:5px">Left blank if not assessed.</div>' +
      '<label class="lbl">Notes</label><textarea class="ta" id="vnotes" placeholder="Symptoms, examination, plan">' + esc(f ? f.notes || '' : '') + '</textarea>' +
      '<label class="lbl">Next follow-up</label><div class="chips wrapchips" id="vint">' + chipsHtml(INTERVALS.concat(['None']), f ? (f.nextDate ? null : 'None') : null, 'data-i') + '</div>' +
      '<input class="inp" type="date" id="vnext" style="margin-top:10px" value="' + (next || '') + '"><div class="small" id="vnl" style="margin-top:5px">' + (next ? 'Next: ' + fmt(next) : 'Pick an interval or a date') + '</div>' +
      (media.length ? '<div class="lbl">Attached</div><div class="thumbs" id="vex">' + media.map(m => '<div class="th ' + (m.thumb ? '' : 'file') + '">' + (m.thumb ? '<img alt="" src="' + m.thumb + '">' : ic('file', 22)) + '<button class="x red" data-del="' + m.id + '">' + ic('x', 12) + '</button></div>').join('') + '</div>' : '') +
      attachHtml('vattach', 'Photos / reports') +
      (f ? '<div style="height:22px"></div><button class="btn o" style="color:var(--redd);border-color:var(--red)" data-act="del">Delete visit</button>' : ''), true) +
      '<div class="bar"><div class="in"><button class="btn" data-act="save">Save Visit</button></div></div>',
    acts: {
      save: async () => {
        const date = $('#vdate').value; if (!date) return toast('Visit date is required');
        const nx = $('#vnext').value || null;
        if (nx && nx < date) return toast('Next follow-up cannot be before the visit');
        await withBusy('Saving...', async () => {
          const vid = await Repo.saveVisit({ pid, existingId: id, date, notes: $('#vnotes').value, status, nextDate: nx });
          await saveStaged(Views._vst, { pid, category: 'Follow-up', takenAt: date, refType: 'followup', refId: vid });
        });
        toast('Visit saved'); back();
      },
      del: async () => { if (await confirmDlg('Delete this visit?', 'The record and its attachments will be deleted.', 'Delete', true)) { await Repo.delFu(f.id); back(); } }
    },
    bind: root => {
      Views._vst = bindAttach($('#vattach'));
      $('#vstat').onclick = e => { const b = e.target.closest('[data-s]'); if (!b) return; status = status === b.dataset.s ? null : b.dataset.s; $$('#vstat button').forEach(x => x.classList.toggle('on', x.dataset.s === status)); };
      const setNext = (d, lbl) => { $('#vnext').value = d || ''; $('#vnl').textContent = d ? 'Next: ' + fmt(d) : 'No next follow-up'; $$('#vint .chip').forEach(x => x.classList.toggle('on', x.dataset.i === lbl)); };
      $('#vint').onclick = e => {
        const c = e.target.closest('[data-i]'); if (!c) return;
        const base = $('#vdate').value ? parseIso($('#vdate').value) : today();
        if (c.dataset.i === 'None') setNext(null, 'None'); else setNext(iso(nextDateFor(c.dataset.i, base)), c.dataset.i);
      };
      $('#vnext').onchange = () => setNext($('#vnext').value, null);
      const ex = $('#vex');
      if (ex) ex.onclick = async e => { const b = e.target.closest('[data-del]'); if (!b) return; if (await confirmDlg('Remove attachment?', 'This cannot be undone.', 'Remove', true)) { await Repo.delMedia(media.find(x => x.id === +b.dataset.del)); b.parentElement.remove(); } };
    }
  };
};

/* ---------------- log book (all surgeries) ---------------- */
const LSTATE = { q: '' };
async function logRows() {
  const l = await Repo.allSurgeries(); const q = LSTATE.q.trim().toLowerCase();
  return q ? l.filter(s => [s.procedure, s.pname, s.uhid, ...assistants(s)].some(x => x && String(x).toLowerCase().includes(q))) : l;
}
const logCard = s => '<div class="card tap" data-act="editLog" data-pid="' + s.patientId + '" data-id="' + s.id + '"><div style="display:flex;gap:10px;align-items:center"><div class="iconbox">' + ic('scalpel', 22) + '</div><div style="flex:1;min-width:0"><div class="t-name" style="white-space:normal">' + esc(s.procedure) + '</div><div class="t-sub" style="white-space:normal"><b>' + esc(s.pname) + '</b><br>' + esc(s.uhid) + '</div></div><div style="text-align:right"><div class="small"><b style="color:var(--navy)">' + fmt(s.date) + '</b></div>' + (s.duration ? '<div class="small">' + fmtDur(s.duration) + '</div>' : '') + '</div></div>' +
  (assistants(s).length ? '<div class="small" style="margin-top:8px;color:var(--navy)">Assistants: ' + esc(assistants(s).join(', ')) + '</div>' : '') + '</div>';
Views.allSurgeries = async () => {
  const all = await Repo.allSurgeries(); const l = await logRows();
  const tot = all.reduce((a, s) => a + (s.duration || 0), 0);
  return {
    html: hdr('Log Book', { right: '<button class="ib" data-act="csv" aria-label="Export">' + ic('download', 22) + '</button>' }) +
      '<div class="wrap"><div class="sticky-search"><div class="sch">' + ic('search', 20) + '<input class="inp" id="lq" type="search" placeholder="Search procedure, patient, UHID, assistant" value="' + esc(LSTATE.q) + '"></div></div></div>' +
      wrapPage('<div class="small" id="lcnt" style="margin:2px 2px 8px">' + l.length + ' of ' + all.length + ' surgeries' + (tot ? ' &middot; ' + fmtDur(tot) + ' operating time' : '') + '</div><div id="llist">' + (l.length ? l.map(logCard).join('') : emptyBox('scalpel', all.length ? 'No matches' : 'Log book is empty', all.length ? 'Try a different search.' : 'Tap the button below to log a surgery.')) + '</div>', true) +
      '<div class="bar"><div class="in"><button class="btn" data-act="addLog">' + ic('plus', 20) + ' Add Surgery Entry</button></div></div>',
    acts: {
      editLog: el => go('surgeryForm', { pid: +el.dataset.pid, id: +el.dataset.id }),
      csv: async () => { const f = await csvExport('surg'); const r = await shareOrSave(f.blob, f.name); if (r === 'downloaded') toast('Saved to downloads'); await Repo.audit('export', 'csv'); },
      addLog: async () => {
        const ps = (await Repo.patients()).sort((a, b) => a.name.localeCompare(b.name));
        if (!ps.length) return toast('Register a patient first');
        sheet('<h3>Select patient</h3><div class="sch" style="margin:10px 0"><input class="inp" id="pq" placeholder="Search name or UHID" style="padding-left:14px"></div><div id="pl"></div>', (s, close) => {
          const draw = () => { const q = $('#pq', s).value.trim().toLowerCase(); $('#pl', s).innerHTML = ps.filter(p => !q || p.name.toLowerCase().includes(q) || p.uhid.toLowerCase().includes(q)).slice(0, 40).map(p => '<div class="mrow" data-p="' + p.id + '" style="padding:12px 4px;border-bottom:1px solid var(--bd)"><div class="avatar" style="width:38px;height:38px;font-size:13px">' + esc(initials(p.name)) + '</div><div class="grow"><div class="t">' + esc(p.name) + '</div><div class="s">' + esc(p.uhid) + '</div></div></div>').join('') || '<div class="small" style="padding:14px;text-align:center">No match</div>'; };
          draw(); $('#pq', s).oninput = draw;
          $('#pl', s).onclick = e => { const r = e.target.closest('[data-p]'); if (r) { close(); go('surgeryForm', { pid: +r.dataset.p }); } };
        });
      }
    },
    bind: () => {
      $('#lq').oninput = debounce(async e => { LSTATE.q = e.target.value; const l2 = await logRows(); $('#llist').innerHTML = l2.length ? l2.map(logCard).join('') : emptyBox('scalpel', 'No matches', 'Try a different search.'); $('#lcnt').textContent = l2.length + ' of ' + all.length + ' surgeries'; }, 150);
    }
  };
};

/* ---------------- printable summary ---------------- */
Views.summary = async ({ id }) => {
  const p = await Repo.patient(id);
  const [invs, ss, fus, notes] = await Promise.all([Repo.invs(id), Repo.surgeries(id), Repo.fus(id), Repo.notes(id)]);
  const a = await Auth.acct();
  const kv = (k, v) => v ? '<div class="kv"><span>' + k + '</span><span>' + esc(v) + '</span></div>' : '';
  return {
    html: hdr('Summary', { right: '<button class="ib noprint" data-act="print" aria-label="Print">' + ic('printer', 22) + '</button>' }) + wrapPage(
      '<div class="card"><h2 style="margin:0 0 4px">' + esc(p.name) + '</h2>' + kv('UHID', p.uhid) + kv('Age / Sex', p.age + ' yrs / ' + p.sex) + kv('Mobile', p.mobile) + kv('Diagnosis', (p.dx || []).map(d => dxLabel(d, p)).join(', ')) + kv('Chief complaints', p.cc) + '</div>' +
      '<div class="sec"><h2>Investigations</h2></div><div class="card">' + (invs.length ? invs.map(i => kv(fmt(i.date) + ' - ' + i.name, i.notes || 'Done')).join('') : '<span class="small">None recorded</span>') + '</div>' +
      '<div class="sec"><h2>Surgeries</h2></div>' + (ss.length ? ss.map(s => '<div class="card"><b>' + esc(s.procedure) + '</b> <span class="small">' + fmt(s.date) + '</span>' + kv('Duration', fmtDur(s.duration)) + kv('Assistants', assistants(s).join(', ')) + kv('Indication', s.indication) + kv('Findings', s.findings) + kv('Operative notes', s.notes) + kv('HPE', s.hpe) + kv('Post-op', s.postop) + '</div>').join('') : '<div class="card small">None recorded</div>') +
      '<div class="sec"><h2>Follow-up history</h2></div><div class="card">' + (fus.length ? fus.map(f => kv(fmt(f.date) + (f.completed ? '' : ' (scheduled)'), [f.status, f.notes].filter(Boolean).join(' - ') || (f.completed ? 'Visit' : ''))).join('') : '<span class="small">None</span>') + '</div>' +
      (notes.length ? '<div class="sec"><h2>Notes</h2></div><div class="card">' + notes.map(n => kv(fmt(n.createdAt.slice(0, 10)), n.note)).join('') + '</div>' : '') +
      '<div class="small" style="text-align:center;margin-top:16px">Generated ' + fmtDT(new Date().toISOString()) + ' &middot; Dr. ' + esc(a.name.replace(/^dr\.?\s*/i, '')) + ' &middot; UroVault</div>'),
    acts: { print: () => window.print() }
  };
};
