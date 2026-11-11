'use strict';
/* ===================== views: More, settings, backup, boot ===================== */

const mrow = (act, icn, t, s, extra) => '<div class="card mrow" data-act="' + act + '" style="padding:14px 16px">' + '<div class="iconbox">' + ic(icn, 20) + '</div><div class="grow"><div class="t">' + t + '</div>' + (s ? '<div class="s">' + s + '</div>' : '') + '</div>' + (extra || ic('chev', 18)) + '</div>';

Views.more = async () => {
  const a = await Auth.acct();
  return {
    html: hdr('More', { back: false }) + wrapPage(
      '<div class="card phead" data-act="doctor" style="cursor:pointer"><div class="avatar lg">' + esc(initials(a.name.replace(/^dr\.?\s*/i, ''))) + '</div><div style="flex:1;min-width:0"><div class="t-name" style="font-size:17px">' + esc(a.name) + '</div><div class="t-sub">' + esc(a.id) + '</div></div>' + ic('chev', 18) + '</div>' +
      '<div style="height:6px"></div>' +
      mrow('logbook', 'book', 'Log Book', 'All surgeries, duration, assistants') + mrow('caseSeries', 'file', 'Case Series (Excel)', 'Export cases for presentations') + mrow('stats', 'bars', 'Statistics', 'Practice overview') + mrow('reports', 'download', 'Reports &amp; Export', 'CSV files, printable lists') +
      mrow('backup', 'shield', 'Backup &amp; Restore', 'Keep your data safe') + mrow('settings', 'sliders', 'Settings', 'Lock, sample data, storage') +
      mrow('privacy', 'lock', 'Privacy &amp; Security', 'How your data is handled') + mrow('help', 'help', 'Help &amp; About', 'Version ' + APP_VERSION) + mrow('upd', 'refresh', UPDATE_AVAILABLE ? 'Update available' : 'Check for updates', UPDATE_AVAILABLE ? 'Tap to install the new version' : 'You are on v' + APP_VERSION) +
      '<div style="height:8px"></div><button class="btn o" data-act="lock">' + ic('lock', 18) + ' Lock now</button>' + copyFoot(), true) + navbar('more'),
    acts: {
      doctor: () => go('doctor'), caseSeries: () => go('caseSeries'), logbook: () => go('allSurgeries'), stats: () => go('stats'), reports: () => go('reports'), backup: () => go('backup'),
      settings: () => go('settings'), privacy: () => go('privacy'), help: () => go('help'), lock: () => lockNow(), upd: async () => { if (UPDATE_AVAILABLE || await checkUpdate(true)) { if (await confirmDlg('Install update?', 'The app will reload. Your data stays safe.', 'Update')) applyUpdate(); } }
    }
  };
};

Views.doctor = async () => {
  const a = await Auth.acct();
  return {
    html: hdr('Doctor Profile') + wrapPage('<div style="text-align:center;margin:10px 0 6px"><div class="avatar lg" style="margin:0 auto;width:74px;height:74px;font-size:24px">' + esc(initials(a.name.replace(/^dr\.?\s*/i, ''))) + '</div></div>' +
      '<label class="lbl">Full name</label><input class="inp" id="dn" value="' + esc(a.name) + '"><label class="lbl">Login ID</label><input class="inp" value="' + esc(a.id) + '" disabled>' +
      '<div style="height:18px"></div><button class="btn" data-act="save">Save</button>'),
    acts: { save: async () => { const n = $('#dn').value.trim(); if (!n) return toast('Name is required'); await Auth.setName(n); toast('Saved'); back(); } }
  };
};

Views.stats = async () => {
  const [c, dx] = await Promise.all([Repo.counts(), Repo.dxStats()]);
  const max = dx.length ? dx[0][1] : 1;
  const box = (n, l, i) => '<div class="card" style="margin:0;text-align:center;padding:14px 6px"><div style="color:var(--teal)">' + ic(i, 22) + '</div><div style="font-size:24px;font-weight:700">' + n + '</div><div class="small">' + l + '</div></div>';
  return {
    html: hdr('Statistics') + wrapPage('<div class="qa" style="gap:10px">' + box(c.patients, 'Patients', 'users') + box(c.surgeries, 'Surgeries', 'scalpel') + box(c.investigations, 'Investigations', 'flask') + box(c.media, 'Media items', 'image') + box(c.seen, 'Visits recorded', 'clip2') + box(c.due, 'Follow-ups due', 'bell') + '</div>' +
      '<div class="sec"><h2>Diagnoses</h2></div><div class="card bars">' + (dx.length ? dx.map(d => '<div class="br"><div class="nm">' + esc(d[0]) + '</div><div class="tr"><i style="width:' + Math.round(d[1] / max * 100) + '%"></i></div><b>' + d[1] + '</b></div>').join('') : '<div class="small" style="text-align:center;padding:10px">No diagnoses recorded yet</div>') + '</div>')
  };
};

/* ---- reports / CSV ---- */
async function csvExport(kind) {
  const ps = await Repo.patients(); const byId = new Map(ps.map(p => [p.id, p]));
  let rows, name;
  if (kind === 'patients') {
    name = 'urovault-patients'; rows = [['UHID', 'Name', 'Age', 'Sex', 'Mobile', 'Chief complaints', 'Diagnosis', 'Registered']];
    ps.forEach(p => rows.push([p.uhid, p.name, p.age, p.sex, p.mobile || '', p.cc || '', (p.dx || []).map(d => dxLabel(d, p)).join('; '), (p.createdAt || '').slice(0, 10)]));
  } else if (kind === 'fu') {
    name = 'urovault-followups'; rows = [['UHID', 'Name', 'Date', 'Type', 'Status', 'Notes', 'Next planned']];
    (await Repo.allFus()).sort((a, b) => a.date.localeCompare(b.date)).forEach(f => rows.push([f.uhid, f.pname, f.date, f.completed ? 'Visit' : 'Scheduled', f.status || '', f.notes || '', f.nextDate || '']));
  } else {
    name = 'urovault-surgeries'; rows = [['UHID', 'Patient name', 'Date of surgery', 'Duration (min)', 'Name of surgery', 'Assistant 1', 'Assistant 2', 'Assistant 3', 'Indication', 'Findings', 'Operative notes', 'HPE', 'Post-op']];
    (await Repo.allSurgeries()).forEach(s => rows.push([s.uhid, s.pname, s.date, s.duration || '', s.procedure, s.assist1 || '', s.assist2 || '', s.assist3 || '', s.indication || '', s.findings || '', s.notes || '', s.hpe || '', s.postop || '']));
  }
  return { blob: new Blob(['﻿' + rows.map(r => r.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv' }), name: name + '-' + iso(today()) + '.csv' };
}
Views.reports = async () => ({
  html: hdr('Reports & Export') + wrapPage('<div class="small" style="margin:2px 2px 10px">CSV files open in Excel, Numbers or Sheets. They contain patient identifiers - share carefully.</div>' +
    mrow('caseSeries', 'file', 'Case series (Excel)', 'One row per case, all details') + mrow('csv_patients', 'users', 'Patient list (CSV)') + mrow('csv_fu', 'cal', 'Follow-ups (CSV)') + mrow('csv_surg', 'scalpel', 'Log book (CSV)') + mrow('printList', 'printer', 'Print patient list', 'Opens the print dialog / save as PDF')),
  acts: {
    csv_patients: async () => { const f = await csvExport('patients'); const r = await shareOrSave(f.blob, f.name); if (r === 'downloaded') toast('Saved to downloads'); await Repo.audit('export', 'csv'); },
    csv_fu: async () => { const f = await csvExport('fu'); const r = await shareOrSave(f.blob, f.name); if (r === 'downloaded') toast('Saved to downloads'); await Repo.audit('export', 'csv'); },
    csv_surg: async () => { const f = await csvExport('surg'); const r = await shareOrSave(f.blob, f.name); if (r === 'downloaded') toast('Saved to downloads'); await Repo.audit('export', 'csv'); },
    caseSeries: () => go('caseSeries'),
    printList: () => go('printList')
  }
});
Views.printList = async () => {
  const ps = (await Repo.patients()).sort((a, b) => a.name.localeCompare(b.name));
  return {
    html: hdr('Patient List', { right: '<button class="ib noprint" data-act="print">' + ic('printer', 22) + '</button>' }) + wrapPage('<div class="card" style="padding:4px 14px">' + (ps.length ? ps.map(p => '<div class="kv"><span><b style="color:var(--navy)">' + esc(p.name) + '</b><br>' + esc(p.uhid) + ' &middot; ' + p.age + 'y ' + esc(p.sex[0]) + '</span><span>' + esc((p.dx || []).map(d => dxLabel(d, p)).join(', ') || '-') + '</span></div>').join('') : '<div class="small" style="padding:14px;text-align:center">No patients</div>') + '</div><div class="small" style="text-align:center;margin-top:12px">' + ps.length + ' patients &middot; ' + fmt(iso(today())) + '</div>'),
    acts: { print: () => window.print() }
  };
};

/* ---- backup / restore ---- */
let _bk = null; // prepared backup {blob,name}

function askPass(title, confirm, allowPlain) {
  return new Promise(res => {
    sheet('<h3>' + title + '</h3><div class="small" style="margin-bottom:8px">' + (confirm ? 'This passphrase encrypts the backup file. <b>If you forget it, the backup cannot be opened by anyone, including me.</b> Write it down somewhere safe.' : 'Enter the passphrase used when this backup was created.') + '</div><label class="lbl">Passphrase</label><input class="inp" type="password" id="pp1" autocomplete="off">' + (confirm ? '<label class="lbl">Confirm passphrase</label><input class="inp" type="password" id="pp2" autocomplete="off">' : '') + '<div class="ferr" id="ppe"></div><div style="height:12px"></div><button class="btn" id="ppok">Continue</button>' + (allowPlain ? '<button class="btn o" style="margin-top:8px" id="ppno">Save without encryption</button>' : '') + '<button class="linkbtn" style="display:block;margin:12px auto 0" id="ppx">Cancel</button>', (s, close) => {
      let done = false; const mo = new MutationObserver(() => { if (!document.body.contains(s)) fin(null); }); const fin = v => { if (done) return; done = true; mo.disconnect(); close(); res(v); };
      mo.observe(document.body, { childList: true });
      $('#ppx', s).onclick = () => fin(null);
      if (allowPlain) $('#ppno', s).onclick = () => fin('');
      $('#ppok', s).onclick = () => {
        const a = $('#pp1', s).value, e = $('#ppe', s);
        if (a.length < 8) return e.textContent = 'Use at least 8 characters';
        if (confirm && a !== $('#pp2', s).value) return e.textContent = 'Passphrases do not match';
        fin(a);
      };
    });
  });
}

Views.backup = async () => {
  const [last, c] = await Promise.all([metaGet('lastBackup'), Repo.counts()]);
  return {
    html: hdr('Backup & Restore') + wrapPage(
      '<div class="card"><div class="kv"><span>Patients</span><span>' + c.patients + '</span></div><div class="kv"><span>Media items</span><span>' + c.media + '</span></div><div class="kv"><span>Last backup</span><span>' + (last ? fmtDT(last) : 'Never') + '</span></div></div>' +
      '<div class="card" style="background:var(--ambert);border-color:#FCD34D;display:flex;gap:10px">' + ic('alert', 20) + '<div class="small" style="color:var(--amberd)"><b>Your data lives only in this browser.</b> If Safari storage is cleared or the app is deleted, it is gone. Back up regularly and keep the file safe (it is not encrypted).</div></div>' +
      '<div class="sec"><h2>Export backup</h2></div><div id="bkbox"><button class="btn" data-act="prep">' + ic('download', 20) + ' Create backup file</button></div>' +
      '<div class="sec"><h2>Restore</h2></div><div class="small" style="margin-bottom:8px">Restoring replaces everything currently on this device.</div><button class="btn o" data-act="restore">' + ic('upload', 18) + ' Choose backup file</button>'),
    acts: {
      prep: async () => {
        const pass = await askPass('Protect this backup', true, true);
        if (pass === null) return;
        const b = busy('Preparing backup...');
        try {
          let blob = await Repo.buildBackup((k, n) => b.set('Packing images ' + k + ' / ' + n));
          if (pass) { b.set('Encrypting...'); blob = await encryptBlob(blob, pass); }
          _bk = { blob, name: 'urovault-backup-' + iso(today()) + (pass ? '.uvb' : '.json') };
        } catch (e) { b.done(); return alertDlg('Backup failed', e.message); }
        b.done();
        $('#bkbox').innerHTML = '<div class="card tap" style="display:flex;gap:10px;align-items:center;background:var(--greent);border-color:#6EE7B7">' + ic('check', 22) + '<div><b>Backup ready</b><div class="small">' + (_bk.blob.size / 1048576).toFixed(1) + ' MB</div></div></div><button class="btn" data-act="saveBk">' + ic('share', 20) + ' Save / Share backup</button>';
      },
      saveBk: async () => {
        if (!_bk) return;
        const r = await shareOrSave(_bk.blob, _bk.name);
        if (r !== 'cancelled') { await metaSet('lastBackup', new Date().toISOString()); await Repo.audit('export', 'backup'); toast(r === 'shared' ? 'Backup shared' : 'Backup saved to downloads'); }
      },
      restore: async () => {
        const fs = await pickFiles({ accept: '' }); if (!fs.length) return;
        const enc = await isEncryptedBackup(fs[0]); let src = fs[0];
        if (enc) { const pw = await askPass('Backup passphrase', false, false); if (pw === null) return; const bz = busy('Decrypting...'); try { src = await decryptBlob(fs[0], pw); } catch (e) { bz.done(); return alertDlg('Cannot open backup', e.message); } bz.done(); }
        if (!await confirmDlg('Replace all data?', 'Everything on this device will be replaced with the backup (' + fs[0].name + ').', 'Restore', true)) return;
        const b = busy('Restoring...');
        try { await Repo.restoreBackup(await src.text()); b.done(); toast('Restore complete'); setTab('home'); }
        catch (e) { b.done(); alertDlg('Restore failed', e.message || 'Invalid file'); }
      }
    }
  };
};

/* ---- settings ---- */
ACT.copySql = async () => { try { await navigator.clipboard.writeText(SY_SQL); toast('SQL copied'); } catch (e) { alertDlg('Copy failed', 'Long-press the text below and copy it manually.'); } };
function syCard() {
  const c = SY.cfg;
  if (c && c.on) {
    const pend = Object.keys(SY.q).length;
    return '<div class="card"><div class="kv"><span>Status</span><span style="color:' + (SY.err ? 'var(--redd)' : 'var(--greend)') + '">' + (SY.err ? 'Error' : 'Connected') + '</span></div><div class="kv"><span>Account</span><span>' + esc(c.email) + '</span></div><div class="kv"><span>Last sync</span><span>' + (c.last ? fmtDT(c.last) : 'Not yet') + '</span></div><div class="kv"><span>Waiting to upload</span><span>' + pend + '</span></div>' + (SY.err ? '<div class="small" style="color:var(--redd);margin-top:6px">' + esc(SY.err) + '</div>' : '') + '</div><div style="height:10px"></div><button class="btn" data-act="syNow">' + ic('refresh', 18) + ' Sync now</button><button class="btn o" style="margin-top:8px;color:var(--redd)" data-act="syOff">Disconnect cloud sync</button><div class="small" style="margin-top:8px">End-to-end encrypted. Syncs automatically while the app is open.</div>';
  }
  return '<div class="card"><div class="small" style="margin-bottom:8px">Auto-backup of all patients and photos to your own Supabase project, <b>encrypted on this phone</b> with your sync passphrase. Setup steps are in Help &amp; About.</div><button class="btn" data-act="syOn">' + ic('upload', 18) + ' Set up cloud sync</button></div>';
}

Views.settings = async () => {
  const [lockOn, demo, est, persisted, aiKey, aiModel, aiProv0] = await Promise.all([metaGet('lockOn'), Repo.hasDemo(), (navigator.storage && navigator.storage.estimate ? navigator.storage.estimate() : Promise.resolve(null)), (navigator.storage && navigator.storage.persisted ? navigator.storage.persisted() : Promise.resolve(false)), metaGet('aiKey'), metaGet('aiModel'), metaGet('aiProv')]);
  const aiProv = aiProv0 || 'gemini';
  const on = lockOn !== false;
  return {
    html: hdr('Settings') + wrapPage(
      '<div class="card mrow"><div class="iconbox">' + ic('lock', 20) + '</div><div class="grow"><div class="t">Require password</div><div class="s">Asked on open and after 2 min away</div></div><button class="sw ' + (on ? 'on' : '') + '" data-act="lockTog" aria-label="Toggle"></button></div>' +
      mrow('chpw', 'edit', 'Change password') +
      '<div class="sec"><h2>Cloud sync</h2></div>' + syCard() +
      '<div class="sec"><h2>App update</h2></div><div class="card"><div class="kv"><span>Installed version</span><span>v' + APP_VERSION + '</span></div><div class="kv"><span>Status</span><span>' + (UPDATE_AVAILABLE ? 'Update available' : 'Not checked / up to date') + '</span></div></div><div style="height:10px"></div><button class="btn" data-act="updCheck">' + ic('refresh', 18) + ' Check &amp; update to latest</button><div class="small" style="margin-top:8px">Always loads the newest version, even if the update banner did not appear. Your patient data stays safe.</div>' +
      '<div class="sec"><h2>AI assistant (optional)</h2></div><div class="card"><div class="small" style="margin-bottom:8px">Used only for "Review with AI" in EAU Guidance. Your key is stored on this device only. Patient identity is never sent.</div><label class="lbl">Provider</label><div class="chips wrapchips" id="aip"><button type="button" class="chip sm ' + (aiProv === 'gemini' ? 'on' : '') + '" data-act="aiProv" data-p="gemini">Google Gemini (free tier)</button><button type="button" class="chip sm ' + (aiProv === 'anthropic' ? 'on' : '') + '" data-act="aiProv" data-p="anthropic">Anthropic</button></div><label class="lbl">API key</label><input class="inp" type="password" id="aik" placeholder="Paste API key" value="' + esc(aiKey || '') + '" autocomplete="off"><label class="lbl">Model</label><input class="inp" id="aim" value="' + esc((aiModel && aiModel !== 'gemini-2.5-flash' ? aiModel : '') || (aiProv === 'gemini' ? 'gemini-3.8-flash' : 'claude-sonnet-5-5')) + '"><div style="height:10px"></div><button class="btn sm" data-act="aiSave">Save</button><button class="btn o sm" style="margin-top:8px" data-act="aiTest">Test key &amp; list models</button><div id="aiTr" class="small" style="margin-top:8px"></div></div>' +
      '<div class="sec"><h2>Sample data</h2></div>' + (demo ? mrow('clearDemo', 'trash', 'Remove sample patients', 'Deletes the 4 demo records') : mrow('loadDemo', 'plusc', 'Load sample patients', 'Four fictional patients to explore the app')) +
      '<div class="sec"><h2>Storage</h2></div><div class="card"><div class="kv"><span>Used</span><span>' + (est ? (est.usage / 1048576).toFixed(1) + ' MB' : 'n/a') + '</span></div><div class="kv"><span>Protected from eviction</span><span>' + (persisted ? 'Yes' : 'Not guaranteed') + '</span></div></div>' +
      '<div class="sec"><h2>Danger zone</h2></div><button class="btn o" style="color:var(--redd);border-color:var(--red)" data-act="erase">' + ic('trash', 18) + ' Erase all data</button>'),
    acts: {
      aiProv: async el => { await metaSet('aiProv', el.dataset.p); await metaSet('aiModel', ''); refresh(); },
      syNow: async () => { await syncNow(true); refresh(); },
      syOff: async () => { if (!await confirmDlg('Disconnect cloud sync?', 'Data already in the cloud stays there. This device stops syncing.', 'Disconnect', true)) return; await syDisconnect(); refresh(); },
      syOn: () => sheet('<h3>Cloud sync setup</h3><label class="lbl">Supabase project URL</label><input class="inp" id="sy1" placeholder="https://xxxx.supabase.co" autocapitalize="off" autocorrect="off"><label class="lbl">Supabase anon (public) key</label><input class="inp" id="sy2" autocapitalize="off" autocorrect="off"><label class="lbl">Cloud account email</label><input class="inp" id="sy3" type="email" autocapitalize="off"><label class="lbl">Cloud account password</label><input class="inp" id="sy4" type="password"><label class="lbl">Sync passphrase (encrypts your data)</label><input class="inp" id="sy5" type="password" placeholder="At least 8 characters"><div class="small" style="margin-top:6px"><b>Do not lose the sync passphrase.</b> Without it nobody can decrypt the cloud copy. On a new phone you enter the same details.</div><div class="ferr" id="sye"></div><div style="height:12px"></div><button class="btn" id="syg">Connect</button>', (s, close) => {
        $('#syg', s).onclick = async () => {
          const f = { url: $('#sy1', s).value, anon: $('#sy2', s).value, email: $('#sy3', s).value, pw: $('#sy4', s).value, pass: $('#sy5', s).value }, e = $('#sye', s);
          if (!/^https:\/\//.test(f.url) || !f.anon.trim() || !f.email.trim() || f.pw.length < 6) return e.textContent = 'Fill URL, key, email and a password (6+ chars)';
          if (f.pass.length < 8) return e.textContent = 'Sync passphrase needs 8+ characters';
          let st;
          try { st = await withBusy('Connecting...', () => syConnect(f)); } catch (x) { SY.cfg = null; SY.key = null; return e.textContent = x.message || 'Failed'; }
          close();
          let mode = 'push';
          if (st.hasRemote && st.hasLocal) { if (!await confirmDlg('Cloud already has data', 'This device also has data. Use the cloud copy and REPLACE what is on this phone? (Take a backup first if unsure.)', 'Use cloud data', true)) { SY.cfg = null; SY.key = null; return; } mode = 'pull'; }
          else if (st.hasRemote) mode = 'pull';
          await withBusy(mode === 'pull' ? 'Downloading from cloud...' : 'Uploading to cloud...', () => syEnable(mode));
          toast('Cloud sync is on'); refresh();
        };
      }),
      aiTest: async () => {
        const key = $('#aik').value.trim(); if (!key) return toast('Paste the key first');
        const el = $('#aiTr'); el.textContent = 'Testing...';
        try {
          const r = await aiTest(aiProv, key, $('#aim').value.trim());
          el.innerHTML = 'Key works (' + (r.ms / 1000).toFixed(1) + ' s).' + (r.models.length ? ' Tap a model to use it:<div class="chips wrapchips" style="margin-top:8px">' + r.models.slice(0, 30).map(n => '<button type="button" class="chip sm" data-act="aiPick" data-m="' + esc(n) + '">' + esc(n) + '</button>').join('') + '</div>' : ' ' + esc(r.note || ''));
        } catch (e) { el.textContent = 'Failed: ' + (e.message || e); }
      },
      aiPick: async el => { $('#aim').value = el.dataset.m; await metaSet('aiKey', $('#aik').value.trim()); await metaSet('aiModel', el.dataset.m); toast('Model set: ' + el.dataset.m); },
      aiSave: async () => { await metaSet('aiKey', $('#aik').value.trim()); await metaSet('aiModel', $('#aim').value.trim()); toast('Saved'); },
      updCheck: async () => { await checkUpdate(false); applyUpdate(); },
      lockTog: async () => { await metaSet('lockOn', !on); refresh(); },
      chpw: () => sheet('<h3>Change password</h3><label class="lbl">Current password</label><input class="inp" type="password" id="cp0"><label class="lbl">New password</label><input class="inp" type="password" id="cp1" placeholder="At least 6 characters"><label class="lbl">Confirm new password</label><input class="inp" type="password" id="cp2"><div class="ferr" id="cpe"></div><div style="height:14px"></div><button class="btn" id="cps">Update</button>', (s, close) => {
        $('#cps', s).onclick = async () => {
          const a = await Auth.acct(); const e = $('#cpe', s);
          if (!await Auth.verify(a.id, $('#cp0', s).value)) return e.textContent = 'Current password is incorrect';
          if ($('#cp1', s).value.length < 6) return e.textContent = 'New password must be at least 6 characters';
          if ($('#cp1', s).value !== $('#cp2', s).value) return e.textContent = 'Passwords do not match';
          await withBusy('Updating...', () => Auth.setPassword($('#cp1', s).value)); close(); toast('Password changed');
        };
      }),
      loadDemo: async () => { await withBusy('Loading...', () => Repo.loadDemo()); toast('Sample patients added'); refresh(); },
      clearDemo: async () => { await withBusy('Removing...', () => Repo.clearDemo()); toast('Sample patients removed'); refresh(); },
      erase: async () => {
        if (!await confirmDlg('Erase all data?', 'All patients, images and your account will be permanently deleted from this device. Make sure you have a backup.', 'Continue', true)) return;
        if (!await confirmDlg('Are you absolutely sure?', 'This cannot be undone.', 'Erase everything', true)) return;
        await withBusy('Erasing...', () => Repo.eraseAll()); SESSION.unlocked = false; STACK = [{ view: 'onboarding' }]; render();
      }
    }
  };
};

Views.privacy = async () => {
  const log = await Repo.auditLog();
  return {
    html: hdr('Privacy & Security') + wrapPage(
      '<div class="card"><div class="kv"><span>Where is data stored?</span><span>On this device only</span></div><div class="kv"><span>Servers / cloud</span><span>None</span></div><div class="kv"><span>Third-party sharing</span><span>None</span></div><div class="kv"><span>Analytics / tracking</span><span>None</span></div><div class="kv"><span>Password</span><span>Salted PBKDF2</span></div></div>' +
      '<div class="card small" style="color:var(--navy)">Patient records and images never leave your phone unless you export or share a file yourself. The app works fully offline once installed. The lock screen protects access in the app; backup files are <b>not</b> encrypted, so store them somewhere safe.</div>' +
      '<div class="sec"><h2>Audit log</h2><span class="small">Latest ' + log.length + '</span></div><div class="card" style="padding:4px 14px">' +
      (log.length ? log.slice(0, 60).map(l => '<div class="kv"><span>' + esc(l.action) + ' &middot; ' + esc(l.entity) + (l.patientId ? ' #' + l.patientId : '') + '</span><span class="small">' + fmtDT(l.ts) + '</span></div>').join('') : '<div class="small" style="padding:14px;text-align:center">No activity yet</div>') + '</div>' +
      '<div class="small" style="text-align:center;margin-top:8px">The log stores actions and record numbers only - no patient details.</div>')
  };
};

Views.help = async () => ({
  html: hdr('Help & About') + wrapPage(
    '<div style="text-align:center;margin:8px 0 16px">' + LOGO(false, 72) + '<h2 style="margin:8px 0 2px">UroVault</h2><div class="small">Version ' + APP_VERSION + ' &middot; Your Urology Practice, Organised.</div><div class="small" style="margin-top:6px">' + COPYRIGHT + '</div></div>' +
    '<div class="card"><b>Install on iPhone</b><div class="small" style="color:var(--navy);margin-top:6px">Open this page in Safari, tap Share, then <b>Add to Home Screen</b>. Open it from the icon afterwards.</div></div>' +
    '<div class="card"><b>Getting updates</b><div class="small" style="color:var(--navy);margin-top:6px">After a new version is published, fully close the app and reopen it twice. Your data is kept.</div></div>' +
    '<div class="card"><b>Registering quickly</b><div class="small" style="color:var(--navy);margin-top:6px">Tap the + button, enter UHID, name, age, sex and complaints, then pick the diagnosis with one tap. Everything else can be added later from the patient profile.</div></div>' +
    '<div class="card"><b>Cloud sync setup (one time)</b><div class="small" style="color:var(--navy);margin-top:6px;line-height:1.55">1. Make a free project at supabase.com.<br>2. Open <b>SQL Editor</b>, paste the SQL (button below) and press Run.<br>3. <b>Authentication &rarr; Sign In / Providers &rarr; Email</b>: turn OFF "Confirm email".<br>4. <b>Project Settings &rarr; API</b>: copy the Project URL and the <b>anon public</b> key (never the service_role key).<br>5. Settings &rarr; Cloud sync &rarr; Set up. Choose any email and password for the cloud account, and a sync passphrase.</div><div style="height:10px"></div><button class="btn o" data-act="copySql">Copy setup SQL</button></div>' +
    '<div class="card"><b>Keep backups</b><div class="small" style="color:var(--navy);margin-top:6px">Browsers can clear site data. Use More &rarr; Backup &amp; Restore at least weekly and keep the file in iCloud Drive or on your computer.</div></div>')
});

/* ===================== boot ===================== */
async function start() {
  try { await dbOpen(); } catch (e) { app.innerHTML = '<div class="auth"><div class="in"><h1>Storage unavailable</h1><p class="sub2">UroVault could not open its local database. Private browsing mode blocks this - open the app in a normal Safari tab or from the Home Screen.</p></div></div>'; return; }
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* ignore */ }
  try { await syLoad(); } catch (e) { /* sync is optional */ }
  STACK = [{ view: 'splash' }]; render();
  const has = await Auth.has();
  const lockOn = (await metaGet('lockOn')) !== false;
  await sleep(1100);
  if (!has) STACK = [{ view: 'onboarding' }];
  else if (lockOn) STACK = [{ view: 'login' }];
  else { SESSION.unlocked = true; STACK = [{ view: 'home' }]; }
  render();
  setTimeout(() => checkUpdate(false), 2500);
  setInterval(() => checkUpdate(false), 30 * 60 * 1000);
  document.addEventListener('visibilitychange', async () => {
    if (!document.hidden) checkUpdate(false);
    if (document.hidden) SESSION.hiddenAt = Date.now();
    else if (SESSION.unlocked && SESSION.hiddenAt && Date.now() - SESSION.hiddenAt > 120000 && (await metaGet('lockOn')) !== false) lockNow();
  });
}
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => { /* offline support is optional */ }); });
}
start();
