'use strict';
/* ===================== views: auth, home, patients, registration, diagnosis ===================== */

Views.splash = async () => ({
  html: '<div class="splash"><div class="lg">' + LOGO(true, 110) + '</div><h1>UroVault</h1><p>Your Urology Practice, Organised.</p>' +
    '<svg class="wave" viewBox="0 0 400 120" preserveAspectRatio="none"><path d="M0 60 C80 20 160 100 240 60 S360 30 400 55 L400 120 L0 120Z" fill="#0D9488" opacity=".25"/><path d="M0 80 C90 50 170 110 260 80 S360 60 400 78 L400 120 L0 120Z" fill="#0D9488" opacity=".35"/></svg></div>'
});

const iosTip = () => (IS_IOS && !IS_STANDALONE)
  ? '<div class="ios">' + ic('share', 20) + '<div><b>Install on iPhone</b><br>Tap the Share button in Safari, then <b>Add to Home Screen</b> so UroVault opens like an app.</div></div>' : '';

Views.onboarding = async () => ({
  html: '<div class="auth"><div class="in"><div class="logo" style="margin-top:10px">' + LOGO(false, 84) + '</div><h1 style="margin-top:10px">UroVault</h1><div class="sub2">Your Urology Practice, Organised.</div>' +
    '<div class="card feat"><div class="iconbox">' + ic('users', 22) + '</div><div><div class="t">Fast patient registration</div><div class="s">UHID-first, one-tap diagnosis</div></div></div>' +
    '<div class="card feat"><div class="iconbox">' + ic('camera', 22) + '</div><div><div class="t">Images, reports &amp; surgeries</div><div class="s">Everything for a patient in one place</div></div></div>' +
    '<div class="card feat"><div class="iconbox">' + ic('lock', 22) + '</div><div><div class="t">Private &amp; offline</div><div class="s">Data stays on this device</div></div></div>' +
    '<div style="height:10px"></div><button class="btn" data-act="start">Get Started</button>' + iosTip() + copyFoot() + '</div></div>',
  acts: { start: () => replace('signup') }
});

Views.signup = async () => ({
  html: '<div class="auth"><div class="in"><div class="logo">' + LOGO(false, 64) + '</div><h1 style="margin-top:8px">Create your account</h1><div class="sub2">Stored only on this device</div>' +
    '<label class="lbl" style="margin-top:0">Full name <i>*</i></label><input class="inp" id="sn" placeholder="Dr. Full Name" autocomplete="name">' +
    '<label class="lbl">Email or username <i>*</i></label><input class="inp" id="si" autocapitalize="none" autocomplete="username" placeholder="you@example.com">' +
    '<label class="lbl">Password <i>*</i></label><div class="pwrap"><input class="inp" id="sp" type="password" autocomplete="new-password" placeholder="At least 6 characters"><button type="button" data-act="eye">' + ic('eye', 20) + '</button></div>' +
    '<label class="lbl">Confirm password <i>*</i></label><input class="inp" id="sp2" type="password" autocomplete="new-password">' +
    '<div class="ferr" id="serr"></div><div style="height:18px"></div><button class="btn" data-act="create">Create Account</button>' +
    '<p class="small" style="text-align:center;margin-top:14px">There is no password recovery - your data lives only on this device. Keep regular backups.</p></div></div>',
  acts: {
    eye: el => { const i = $('#sp'); i.type = i.type === 'password' ? 'text' : 'password'; },
    create: async () => {
      const n = $('#sn').value.trim(), id = $('#si').value.trim(), pw = $('#sp').value, e = $('#serr');
      if (!n || !id) return e.textContent = 'Name and email/username are required';
      if (pw.length < 6) return e.textContent = 'Password must be at least 6 characters';
      if (pw !== $('#sp2').value) return e.textContent = 'Passwords do not match';
      await withBusy('Creating account...', async () => { await Auth.create(n, id, pw); await metaSet('lockOn', true); });
      SESSION.unlocked = true; setTab('home');
    }
  }
});

Views.login = async () => {
  const a = await Auth.acct();
  return {
    html: '<div class="auth"><div class="in"><div class="logo" style="margin-top:20px">' + LOGO(false, 84) + '</div><h1 style="margin-top:10px">Welcome back</h1><div class="sub2">' + esc(a.name) + '</div>' +
      '<label class="lbl" style="margin-top:0">Email or username</label><input class="inp" id="li" autocapitalize="none" autocomplete="username" value="' + esc(a.id) + '">' +
      '<label class="lbl">Password</label><div class="pwrap"><input class="inp" id="lp" type="password" autocomplete="current-password"><button type="button" data-act="eye">' + ic('eye', 20) + '</button></div>' +
      '<div class="ferr" id="lerr"></div><div style="height:18px"></div><button class="btn" data-act="unlock">Unlock</button>' +
      '<div style="text-align:center;margin-top:16px"><button class="linkbtn" data-act="forgot">Forgot password?</button></div>' + copyFoot() + '</div></div>',
    acts: {
      eye: () => { const i = $('#lp'); i.type = i.type === 'password' ? 'text' : 'password'; },
      unlock: async () => {
        const pw = $('#lp').value;
        const ok = await withBusy('Checking...', () => Auth.verify($('#li').value, pw));
        if (!ok) { $('#lerr').textContent = 'Incorrect email/username or password'; return; }
        SESSION.unlocked = true; setTab(CUR_TAB === 'login' ? 'home' : (CUR_TAB || 'home'));
      },
      forgot: async () => {
        if (!await confirmDlg('Reset UroVault?', 'There is no way to recover a forgotten password. You can erase everything on this device and start fresh, then restore from a backup file.', 'Erase everything', true)) return;
        await Repo.eraseAll(); toast('All data erased'); STACK = [{ view: 'onboarding' }]; render();
      }
    },
    bind: () => { $('#lp').addEventListener('keydown', e => { if (e.key === 'Enter') $('[data-act=unlock]').click(); }); }
  };
};

function lockNow() { if (!SESSION.unlocked) return; SESSION.unlocked = false; STACK = [{ view: 'login' }]; render(); }

/* ---------------- home ---------------- */
Views.home = async () => {
  const [a, c, pend, ps, lastBk] = await Promise.all([Auth.acct(), Repo.counts(), Repo.pending(), Repo.patients(), metaGet('lastBackup')]);
  const t = iso(today());
  const due = pend.filter(f => f.date <= t).slice(0, 5);
  const recent = ps.slice().sort((x, y) => (y.updatedAt || '').localeCompare(x.updatedAt || '')).slice(0, 5);
  const first = a.name.replace(/^dr\.?\s*/i, '').split(' ')[0];
  const bkDays = lastBk ? Math.round((Date.now() - new Date(lastBk)) / 86400000) : null;
  const needBk = ps.length > 0 && (bkDays === null || bkDays >= 7);
  const stat = (act, icn, n, l) => '<button class="stat" data-act="' + act + '">' + ic(icn, 20) + '<div class="n">' + n + '</div><div class="l">' + l + '</div></button>';
  return {
    html: '<div class="dhead"><div class="in"><div class="top"><div class="brand">UroVault</div>' +
      '<button class="ib" data-act="searchP" aria-label="Search">' + ic('search', 22) + '</button>' +
      '<button class="ib" data-act="tab" data-v="followups" aria-label="Follow-ups">' + ic('bell', 22) + (c.due ? '<span class="dot">' + c.due + '</span>' : '') + '</button></div>' +
      '<div class="greet">' + greeting() + ',<br>Dr. ' + esc(first) + '</div>' +
      '<div class="stats">' + stat('tab" data-v="patients', 'users', c.patients, 'Patients') + stat('tab" data-v="followups', 'bell', c.due, 'Follow-ups Due') + stat('allSurg', 'book', c.surgeries, 'Log Book') + '</div></div></div>' +
      wrapPage(
        (needBk ? '<div class="card tap" data-act="goBackup" style="background:var(--ambert);border-color:#FCD34D;display:flex;gap:12px;align-items:center;margin-top:16px">' + ic('alert', 22) + '<div style="flex:1"><b>Back up your data</b><div class="small" style="color:var(--amberd)">' + (bkDays === null ? 'No backup yet. Safari can clear website data.' : 'Last backup ' + bkDays + ' days ago.') + '</div></div>' + ic('chev', 18) + '</div>' : '') +
        '<div class="sec" style="margin-top:20px"><h2>Quick Actions</h2></div><div class="qa">' +
        '<button data-act="newPatient"><div class="iconbox">' + ic('plus', 22) + '</div>New Patient</button>' +
        '<button data-act="allSurg"><div class="iconbox">' + ic('book', 22) + '</div>Log Book</button>' +
        '<button data-act="tab" data-v="followups"><div class="iconbox">' + ic('cal', 22) + '</div>Follow-ups</button></div>' +
        '<div class="sec"><h2>Follow-ups Due</h2><button data-act="tab" data-v="followups">View all</button></div>' +
        (due.length ? due.map(fuTile).join('') : '<div class="card small" style="text-align:center;padding:22px">Nothing due. You are all caught up.</div>') +
        '<div class="sec"><h2>Recent Patients</h2><button data-act="tab" data-v="patients">View all</button></div>' +
        (recent.length ? recent.map(ptile).join('') : emptyBox('users', 'No patients yet', 'Register your first patient to get started.', '<button class="btn" data-act="newPatient">Register Patient</button>')), true) + navbar('home'),
    acts: {
      searchP: () => { PSTATE.focus = true; setTab('patients'); },
      allSurg: () => go('allSurgeries'),
      goBackup: () => go('backup')
    }
  };
};

/* ---------------- patients list ---------------- */
const PSTATE = { q: '', f: 'All', focus: false };
Views.patients = async () => {
  const all = (await Repo.patients()).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  const list = () => {
    const q = PSTATE.q.trim().toLowerCase();
    return all.filter(p => matchesGroup((p.dx || []).map(d => d.name), PSTATE.f) &&
      (!q || [p.name, p.uhid, p.mobile, p.cc, p.addDx, ...(p.dx || []).map(d => d.name)].some(x => x && String(x).toLowerCase().includes(q))));
  };
  const body = () => { const l = list(); return l.length ? l.map(ptile).join('') : (all.length ? emptyBox('search', 'No matches', 'Try a different search or filter.') : emptyBox('users', 'No patients yet', 'Tap + to register your first patient.')); };
  return {
    html: hdr('Patients', { back: false }) +
      '<div class="wrap"><div class="sticky-search"><div class="sch">' + ic('search', 20) + '<input class="inp" id="q" type="search" placeholder="Search name, UHID, diagnosis" value="' + esc(PSTATE.q) + '"></div></div></div>' +
      '<div class="chips" id="pf" style="max-width:640px;margin:0 auto">' + FILTERS.map(f => '<button class="chip ' + (PSTATE.f === f ? 'on' : '') + '" data-f="' + f + '">' + f + '</button>').join('') + '</div>' +
      wrapPage('<div class="small" id="pcount" style="margin:2px 2px 8px">' + list().length + ' of ' + all.length + ' patients</div><div id="plist">' + body() + '</div>', true) + navbar('patients'),
    bind: root => {
      const upd = () => { $('#plist').innerHTML = body(); $('#pcount').textContent = list().length + ' of ' + all.length + ' patients'; };
      $('#q').oninput = debounce(e => { PSTATE.q = e.target.value; upd(); }, 120);
      $('#pf').onclick = e => { const b = e.target.closest('[data-f]'); if (!b) return; PSTATE.f = b.dataset.f; $$('#pf .chip').forEach(x => x.classList.toggle('on', x === b)); upd(); };
      if (PSTATE.focus) { PSTATE.focus = false; $('#q').focus(); }
    }
  };
};

/* ---------------- add / edit patient ---------------- */
Views.addPatient = async ({ id }) => {
  const ex = id ? await Repo.patient(id) : null;
  let draft = null;
  if (!ex) { draft = await metaGet('draft'); if (draft && !(draft.uhid || draft.name || draft.cc)) draft = null; }
  const v = ex || draft || {};
  return {
    html: hdr(ex ? 'Edit Patient' : 'New Patient') +
      wrapPage((draft ? '<div class="banner">' + ic('history', 16) + ' Draft restored <button data-act="discard">Discard</button></div>' : '') +
        '<label class="lbl" style="margin-top:6px">UHID <i>*</i></label><input class="inp uhid" id="uhid" autocapitalize="characters" autocomplete="off" placeholder="e.g. 2026/00123" value="' + esc(v.uhid || '') + '"><div id="dup"></div>' +
        '<label class="lbl">Patient name <i>*</i></label><input class="inp" id="name" autocomplete="off" placeholder="Full name" value="' + esc(v.name || '') + '">' +
        '<div class="two"><div><label class="lbl">Age <i>*</i></label><input class="inp" id="age" type="number" inputmode="numeric" min="0" max="120" placeholder="Yrs" value="' + esc(v.age == null ? '' : v.age) + '"></div>' +
        '<div><label class="lbl">Sex <i>*</i></label><div class="seg" id="sex">' + ['Male', 'Female', 'Other'].map(s => '<button type="button" data-s="' + s + '" class="' + (v.sex === s ? 'on' : '') + '">' + s + '</button>').join('') + '</div></div></div>' +
        '<label class="lbl">Chief complaints <i>*</i></label><textarea class="ta" id="cc" placeholder="Presenting complaints, duration">' + esc(v.cc || '') + '</textarea>' +
        '<label class="lbl">Mobile (optional)</label><input class="inp" id="mobile" type="tel" inputmode="tel" placeholder="For quick call" value="' + esc(v.mobile || '') + '">', true) +
      '<div class="bar"><div class="in"><button class="btn" data-act="save">' + (ex ? 'Save Changes' : 'Save &amp; Continue') + '</button></div></div>',
    acts: {
      discard: async () => { await metaSet('draft', null); replace('addPatient', {}); },
      save: async () => {
        const f = { uhid: $('#uhid').value.trim(), name: $('#name').value.trim(), age: $('#age').value.trim(), cc: $('#cc').value.trim() };
        const sex = (($('#sex .on') || {}).dataset || {}).s;
        let bad = false;
        const mark = (sel, cond) => { const el = $(sel); el.classList.toggle('err', !cond); if (!cond) bad = true; };
        mark('#uhid', !!f.uhid); mark('#name', !!f.name); mark('#cc', !!f.cc);
        const ageN = Number(f.age); mark('#age', f.age !== '' && Number.isInteger(ageN) && ageN >= 0 && ageN <= 120);
        $('#sex').classList.toggle('err', !sex); if (!sex) bad = true;
        if (bad) { toast('Please fill the highlighted fields'); const e = $('.err'); e && e.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
        const dup = await Repo.uhidTaken(f.uhid, id);
        if (dup) { toast('UHID already exists'); return; }
        try {
          const pid = await Repo.savePatient(Object.assign({}, ex || { dx: [], addDx: null }, { id: id, uhid: f.uhid, name: f.name, age: ageN, sex, cc: f.cc, mobile: nn($('#mobile').value) }));
          if (!ex) { await metaSet('draft', null); replace('dx', { pid, isNew: true }); }
          else { toast('Saved'); back(); }
        } catch (e) { toast(/Constraint/i.test(String(e && e.name)) ? 'UHID already exists' : 'Could not save: ' + (e && e.message)); }
      }
    },
    bind: root => {
      $('#sex').onclick = e => { const b = e.target.closest('[data-s]'); if (!b) return; $$('#sex button').forEach(x => x.classList.toggle('on', x === b)); $('#sex').classList.remove('err'); saveDraft(); };
      const chk = debounce(async () => {
        if (!$('#uhid')) return; const v2 = $('#uhid').value; const d = v2.trim() ? await Repo.uhidTaken(v2, id) : null;
        $('#uhid').classList.toggle('err', !!d);
        $('#dup').innerHTML = d ? '<div class="dup">' + ic('alert', 18) + '<span>UHID already registered to <b>' + esc(d.name) + '</b></span><button data-act="openDup" data-id="' + d.id + '">Open</button></div>' : '';
      }, 250);
      const saveDraft = debounce(async () => {
        if (id || !$('#uhid')) return;
        await metaSet('draft', { uhid: $('#uhid').value, name: $('#name').value, age: $('#age').value, cc: $('#cc').value, mobile: $('#mobile').value, sex: (($('#sex .on') || {}).dataset || {}).s || null });
      }, 400);
      root.addEventListener('input', e => { e.target.classList.remove('err'); if (e.target.id === 'uhid') chk(); saveDraft(); });
      if (v.uhid) chk();
      if (!ex && !v.uhid) setTimeout(() => { const u = $('#uhid'); u && u.focus(); }, 250);
    }
  };
};
ACT.openDup = el => replace('profile', { id: +el.dataset.id });

/* ---------------- diagnosis selection ---------------- */
Views.dx = async ({ pid, isNew }) => {
  const p = await Repo.patient(pid);
  const sel = new Map((p.dx || []).map(d => [d.name, d.lat || null]));
  let other = p.addDx || '';
  const grid = () => '<div class="two" style="grid-template-columns:1fr 1fr;gap:10px">' + DX_OPTIONS.map(o =>
    '<div class="card dxcard ' + (sel.has(o.name) ? 'sel' : '') + '" data-act="toggle" data-n="' + esc(o.name) + '" style="margin:0;padding:12px"><div class="iconbox">' + dxIc(o.name, 26) + '</div><div class="nm" style="font-size:14px">' + esc(o.name) + '</div>' +
    (sel.has(o.name) ? '<span class="chk r on" style="width:22px;height:22px">' + ic('check', 14) + '</span>' : '') + '</div>').join('') + '</div>';
  const subs = () => {
    let h = '';
    DX_OPTIONS.forEach(o => {
      if (!sel.has(o.name)) return;
      if (o.paired) h += '<div class="card" style="margin-top:10px"><b>' + esc(o.name) + '</b> <span class="small">- laterality</span><div class="seg" style="margin-top:8px" data-lat="' + esc(o.name) + '">' + LATERALITY.map(l => '<button type="button" data-l="' + l + '" class="' + (sel.get(o.name) === l ? 'on' : '') + '">' + l + '</button>').join('') + '</div></div>';
      if (o.name === 'Other') h += '<div class="card" style="margin-top:10px"><b>Other diagnosis</b><input class="inp" id="oth" style="margin-top:8px" placeholder="Specify diagnosis" value="' + esc(other) + '"></div>';
    });
    return h;
  };
  return {
    html: hdr('Diagnosis') + wrapPage('<div class="phead" style="margin-bottom:6px"><div class="avatar">' + esc(initials(p.name)) + '</div><div><div class="t-name">' + esc(p.name) + '</div><div class="t-sub"><b>' + esc(p.uhid) + '</b></div></div></div>' +
      '<div class="small" style="margin:10px 2px 12px">Tap to select. You can choose more than one.</div><div id="dxg">' + grid() + '</div><div id="dxs">' + subs() + '</div>', true) +
      '<div class="bar"><div class="in"><div class="row">' + (isNew ? '<button class="btn o" style="height:52px" data-act="skip">Skip</button>' : '') + '<button class="btn" data-act="save">Save</button></div></div></div>',
    acts: {
      toggle: el => { const n = el.dataset.n; if (sel.has(n)) sel.delete(n); else sel.set(n, null); $('#dxg').innerHTML = grid(); $('#dxs').innerHTML = subs(); },
      skip: () => replace('profile', { id: pid }),
      save: async () => {
        const o = $('#oth'); if (o) other = o.value.trim();
        const dx = [...sel.entries()].map(([name, lat]) => lat ? { name, lat } : { name });
        await Repo.setDx(pid, dx, sel.has('Other') ? other : null);
        if (isNew) replace('profile', { id: pid }); else { toast('Diagnosis saved'); back(); }
      }
    },
    bind: root => {
      root.addEventListener('click', e => {
        const b = e.target.closest('[data-l]'); if (!b) return;
        const n = b.parentElement.dataset.lat; sel.set(n, sel.get(n) === b.dataset.l ? null : b.dataset.l);
        $$('button', b.parentElement).forEach(x => x.classList.toggle('on', x === b && sel.get(n) === b.dataset.l));
      });
    }
  };
};

/* ---------------- follow-ups tab ---------------- */
const FSTATE = { f: 'Due Today' };
Views.followups = async () => {
  const counts = await Repo.fuCounts();
  let first = counts[FSTATE.f] === 0 && FSTATE.f === 'Due Today' && counts.Overdue ? 'Overdue' : FSTATE.f;
  FSTATE.f = first;
  const items = await Repo.fuList(FSTATE.f);
  const body = items.length ? items.map(fuTile).join('') : emptyBox('cal', 'Nothing here', FSTATE.f === 'Completed' ? 'Recorded visits will appear here.' : 'No follow-ups in this list.');
  return {
    html: hdr('Follow-ups', { back: false }) + '<div style="height:12px"></div><div class="chips" id="ff" style="max-width:640px;margin:0 auto">' +
      FU_FILTERS.map(f => '<button class="chip ' + (FSTATE.f === f ? 'on' : '') + '" data-f="' + f + '">' + f + '<span class="c">' + counts[f] + '</span></button>').join('') + '</div>' + wrapPage('<div id="fl">' + body + '</div>', true) + navbar('followups'),
    bind: () => {
      $('#ff').onclick = async e => {
        const b = e.target.closest('[data-f]'); if (!b) return; FSTATE.f = b.dataset.f; $$('#ff .chip').forEach(x => x.classList.toggle('on', x === b));
        const l = await Repo.fuList(FSTATE.f); $('#fl').innerHTML = l.length ? l.map(fuTile).join('') : emptyBox('cal', 'Nothing here', FSTATE.f === 'Completed' ? 'Recorded visits will appear here.' : 'No follow-ups in this list.');
      };
    }
  };
};
