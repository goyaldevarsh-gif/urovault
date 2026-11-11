'use strict';
/* ===================== EAU Guideline Assistant (rules-based smart questionnaire) =====================
   Source: EAU Guidelines 2026 - NMIBC (Mar 2026), Muscle-invasive & Metastatic Bladder Cancer (Mar 2026),
   Prostate Cancer (limited update Mar 2026). Recommendations are paraphrased, with section + strength tags.
   Decision support only - always verify against the full guideline. Nothing leaves the device. */

const EAU_VER = 'EAU Guidelines 2026 (NMIBC, MIBC/metastatic: Mar 2026; Prostate: limited update Mar 2026)';
const nmSt = a => ['Ta', 'T1', 'CIS only'].includes(a.stage);
const nmPap = a => a.stage === 'Ta' || a.stage === 'T1';
const metB = a => a.m === 'M1';
const miSt = a => ['T2', 'T3', 'T4a'].includes(a.stage) && !metB(a);
const miPre = a => miSt(a) && a.phase === 'Before treatment';
const miPost = a => miSt(a) && a.phase === 'After cystectomy';

const GF = {
  bladder: [
    { id: 'stage', l: 'Stage (clinical / pathological)', o: ['Ta', 'T1', 'CIS only', 'T2', 'T3', 'T4a', 'T4b'] },
    { id: 'n', l: 'Nodes', o: ['N0', 'N+', 'Not assessed'] },
    { id: 'm', l: 'Metastasis', o: ['M0', 'M1', 'Not assessed'] },
    { id: 'setting', l: 'Disease setting', o: ['Primary', 'Recurrent'], show: nmSt },
    { id: 'sys', l: 'Grading system used', o: ['WHO 2004/2016', 'WHO 1973'], show: nmSt },
    { id: 'grade', l: 'Grade', o: a => a.sys === 'WHO 1973' ? ['G1', 'G2', 'G3'] : ['LG', 'HG'], show: a => nmSt(a) && !!a.sys && a.stage !== 'CIS only' },
    { id: 'cis', l: 'Concomitant CIS', o: ['No', 'Yes', 'Not reported'], show: a => nmPap(a) },
    { id: 'size', l: 'Largest tumour', o: ['3 cm or less', 'Over 3 cm'], show: nmPap },
    { id: 'focal', l: 'Number of tumours', o: ['Single', 'Multiple'], show: nmPap },
    { id: 'lvi', l: 'Lymphovascular invasion', o: ['No', 'Yes', 'Not reported'], show: nmSt },
    { id: 'variant', l: 'Aggressive variant histology', o: ['No', 'Yes', 'Not reported'], show: nmSt },
    { id: 'pu', l: 'CIS in prostatic urethra', o: ['No', 'Yes', 'Not assessed'], show: nmSt },
    { id: 'dm', l: 'Detrusor muscle in specimen', o: ['Present', 'Absent', 'Not reported'], show: nmSt },
    { id: 'comp', l: 'TURBT completeness', o: ['Complete', 'Incomplete', 'Doubtful'], show: nmSt },
    { id: 'bcg', l: 'BCG status', o: ['BCG-naive', 'BCG-exposed', 'BCG-relapsing', 'BCG-unresponsive'], show: nmSt },
    { id: 'phase', l: 'Treatment phase', o: ['Before treatment', 'After cystectomy'], show: miSt },
    { id: 'multi', l: 'Tumour pattern', o: ['Solitary, unifocal', 'Multifocal'], show: miPre },
    { id: 'hydro', l: 'Hydronephrosis', o: ['None', 'Unilateral', 'Bilateral'], show: miPre },
    { id: 'xcis', l: 'Extensive / multifocal CIS', o: ['No', 'Yes'], show: miPre },
    { id: 'bfun', l: 'Baseline bladder function', o: ['Good', 'Poor'], show: miPre },
    { id: 'urethra', l: 'Invasive tumour in urethra / at urethral dissection level', o: ['No', 'Yes'], show: miPre },
    { id: 'pt', l: 'Pathological T', o: ['pT2 or less', 'pT3', 'pT4'], show: miPost },
    { id: 'pn', l: 'Pathological N', o: ['pN0', 'pN+'], show: miPost },
    { id: 'margin', l: 'Surgical margins', o: ['Negative', 'Positive'], show: miPost },
    { id: 'nac', l: 'Neoadjuvant systemic therapy given', o: ['Yes', 'No'], show: miPost },
    { id: 'cisok', l: 'Eligible for / accepts adjuvant cisplatin', o: ['Yes', 'No (ineligible or declined)'], show: miPost },
    { id: 'gfr', l: 'eGFR (mL/min)', t: 'n', show: a => miSt(a) || metB(a) },
    { id: 'ecog', l: 'ECOG performance status', o: ['0', '1', '2', '3', '4'], show: a => miSt(a) || metB(a) },
    { id: 'line', l: 'Treatment line', o: ['First-line', 'After EV + CPI', 'After platinum +/- CPI', 'After EV, CPI and platinum'], show: metB },
    { id: 'ev', l: 'Enfortumab vedotin (EV)', o: ['Available / suitable', 'Unavailable / contraindicated'], show: metB },
    { id: 'cpi', l: 'Checkpoint inhibitor (CPI)', o: ['Suitable', 'Contraindicated'], show: metB },
    { id: 'pdl1', l: 'PD-L1 high expression', o: ['Yes', 'No', 'Unknown'], show: metB },
    { id: 'fgfr', l: 'Actionable FGFR alteration', o: ['Yes', 'No', 'Unknown'], show: metB },
    { id: 'her2', l: 'HER2 IHC', o: ['3+', '2+', '0-1+', 'Not tested'], show: metB }
  ],
  prostate: [
    { id: 'psa', l: 'PSA (ng/mL)', t: 'n' },
    { id: 'gg', l: 'ISUP grade group (biopsy)', o: ['1', '2', '3', '4', '5'] },
    { id: 'ct', l: 'Clinical T (DRE based)', o: ['cT1-2', 'cT3-4', 'Not assessed'] },
    { id: 'cn', l: 'Nodes (imaging)', o: ['cN0', 'cN1', 'Not assessed'] },
    { id: 'm', l: 'Metastasis (imaging)', o: ['M0', 'M1', 'Not assessed'] },
    { id: 'le', l: 'Life expectancy', o: ['Under 10 years', 'Over 10 years', 'Not assessed'], show: a => a.m !== 'M1' },
    { id: 'asfav', l: 'Low disease extent for AS (<10% pattern 4, <=3 positive cores, <=50% core involvement, <=cT2a, low extent on imaging)', o: ['Yes', 'No', 'Unknown'], show: a => a.gg === '2' && a.m !== 'M1' },
    { id: 'vol', l: 'Disease volume (CHAARTED)', o: ['Low volume', 'High volume', 'Unknown'], show: a => a.m === 'M1' },
    { id: 'doc', l: 'Fitness for docetaxel', o: ['Fit', 'Not fit'], show: a => a.m === 'M1' },
    { id: 'hrr', l: 'HRR testing (somatic / germline)', o: ['Done', 'Not done'], show: a => a.m === 'M1' }
  ]
};

const R = (t, tag) => ({ t, tag });
const S = (h, rows) => ({ h, rows });

/* ---------------- bladder ---------------- */
function nmibcRisk(a, age) {
  const miss = [];
  if (!a.setting) miss.push('Disease setting');
  const cisOnly = a.stage === 'CIS only';
  if (!cisOnly) { if (!a.sys) miss.push('Grading system'); else if (!a.grade) miss.push('Grade'); if (!a.cis || a.cis === 'Not reported') miss.push('Concomitant CIS'); if (!a.size) miss.push('Tumour size'); if (!a.focal) miss.push('Number of tumours'); }
  const over = a.lvi === 'Yes' || a.variant === 'Yes' || a.pu === 'Yes';
  const cis = cisOnly || a.cis === 'Yes';
  const g = a.grade, hg = g === 'HG' || g === 'G3', lg = g === 'LG' || g === 'G1';
  const rf = (age > 70 ? 1 : 0) + (a.size === 'Over 3 cm' ? 1 : 0) + (a.focal === 'Multiple' ? 1 : 0);
  let rg = null, hgInt = false;
  if (over) rg = 'Very high';
  else if (cisOnly) rg = 'High';
  else if (miss.length) rg = null;
  else if (cis) {
    if (a.stage === 'Ta' && hg && rf === 3) rg = 'Very high';
    else if (a.stage === 'T1' && g === 'G2' && rf >= 2) rg = 'Very high';
    else if (a.stage === 'T1' && hg && rf >= 1) rg = 'Very high';
    else rg = 'High';
  } else if (a.stage === 'T1' && hg) rg = rf === 3 ? 'Very high' : 'High';
  else if (((a.stage === 'Ta' && (g === 'LG' || g === 'G2')) || (a.stage === 'T1' && g === 'G1')) && rf === 3) rg = 'High';
  else if (((a.stage === 'Ta' && hg) || (a.stage === 'T1' && g === 'LG')) && rf >= 2) rg = 'High';
  else if (a.stage === 'T1' && g === 'G2' && rf >= 1) rg = 'High';
  else if (lg && ((rf === 0) || (a.stage === 'Ta' && rf <= 1))) rg = 'Low';
  else { rg = 'Intermediate'; hgInt = hg; }
  if (rg === 'Low' && a.setting === 'Recurrent') rg = 'Intermediate';
  return { rg, miss, rf, hgInt, cisOnly };
}
function bladderAssess(a, p) {
  const age = Number(p.age) || 0, out = { title: 'Bladder cancer', badge: null, secs: [], miss: [] };
  if (!a.stage) { out.miss.push('Stage'); return out; }
  if (a.m === 'M1') {
    out.badge = 'Metastatic (M1)';
    if (!a.gfr) out.miss.push('eGFR'); if (!a.ecog) out.miss.push('ECOG PS');
    const gfr = Number(a.gfr), ps = a.ecog === undefined ? null : Number(a.ecog);
    const combo = gfr > 30 && ps !== null && ps <= 2, cisE = gfr > 50 && combo;
    const rows = [R('Discuss in a multidisciplinary team.', 'MIBC §6.1')];
    const L = a.line || 'First-line';
    if (L === 'First-line') {
      if (a.gfr && a.ecog) rows.push(R('Combination-therapy eligibility from your inputs: ' + (combo ? 'eligible (PS 0-2, eGFR >30)' : 'NOT eligible') + '; cisplatin-eligible (eGFR >50): ' + (cisE ? 'yes' : 'no') + '.', 'MIBC Fig 9.2'));
      if (combo) {
        if (a.ev !== 'Unavailable / contraindicated') rows.push(R('Enfortumab vedotin plus pembrolizumab.', 'Strong - MIBC §9.11'));
        else if (a.cpi === 'Contraindicated') rows.push(R('Platinum (cisplatin or carboplatin) plus gemcitabine.', 'Strong - MIBC §9.11'));
        else { rows.push(R('If EV is not an option: platinum plus gemcitabine, then avelumab maintenance if at least stable disease.', 'Strong - MIBC §9.11')); if (cisE) rows.push(R('Alternatively, if cisplatin-eligible: cisplatin/gemcitabine plus nivolumab.', 'Strong - MIBC §9.11')); }
      } else if (a.gfr && a.ecog) rows.push(R('Not eligible for combination therapy: single-agent pembrolizumab or atezolizumab if PD-L1 expression is high' + (a.pdl1 === 'Yes' ? ' (reported high).' : a.pdl1 === 'No' ? ' (reported NOT high - consider best supportive care / trial).' : ' (PD-L1 status needed).'), 'Weak - MIBC §9.11'));
    } else if (L === 'After EV + CPI') {
      rows.push(R('Platinum-containing combination (cisplatin or carboplatin plus gemcitabine).', 'Weak - MIBC §9.11'));
      if (a.fgfr === 'Yes') rows.push(R('Erdafitinib for actionable FGFR alteration.', 'Strong - MIBC §9.11'));
      rows.push(R('Single-agent chemotherapy (docetaxel, paclitaxel, vinflunine).', 'Weak - MIBC §9.11'));
    } else if (L === 'After platinum +/- CPI') {
      rows.push(R('Enfortumab vedotin.', 'Strong - MIBC §9.11'));
      if (a.fgfr === 'Yes') rows.push(R('Erdafitinib for actionable FGFR alteration with prior CPI.', 'Strong - MIBC §9.11'));
      rows.push(R('If no prior CPI: pembrolizumab.', 'Strong - MIBC §9.11'));
      rows.push(R('Consider single-agent chemotherapy (docetaxel, paclitaxel, vinflunine).', 'Weak - MIBC §9.11'));
    } else {
      if (a.her2 === '3+') rows.push(R('Trastuzumab deruxtecan for HER2 IHC 3+.', 'Weak - MIBC §9.11')); else if (a.her2 === '2+') rows.push(R('Consider trastuzumab deruxtecan for HER2 IHC 2+.', 'Weak - MIBC §9.11')); else if (!a.her2 || a.her2 === 'Not tested') out.miss.push('HER2 IHC');
      if (a.fgfr === 'Yes') rows.push(R('Erdafitinib for actionable FGFR alteration.', 'Strong - MIBC §9.11'));
      rows.push(R('Clinical trial; consider best supportive care alone if not a candidate for more cancer-specific therapy.', 'Strong - MIBC §9.11'));
    }
    out.secs.push(S('Systemic therapy (' + L + ')', rows));
    return out;
  }
  if (a.stage === 'T4b') { out.badge = 'T4b'; out.secs.push(S('Locally advanced', [R('Beyond the T2-T4a N0M0 pathway: discuss in a multidisciplinary team and review the guideline sections on locally advanced / node-positive and metastatic disease. Palliative cystectomy can be offered for symptomatic locally advanced tumours not controlled by less invasive methods.', 'MIBC §6.7 (Weak)')])); if (!a.m) out.miss.push('Metastasis status'); return out; }
  if (nmSt(a)) {
    if (!a.m || a.m === 'Not assessed') out.miss.push('Metastasis status (not assessed)');
    const r = nmibcRisk(a, age); out.miss = out.miss.concat(r.miss);
    if (r.rg) out.badge = 'EAU NMIBC risk: ' + r.rg;
    const tk = [R('Whole urothelium inspection; en-bloc or fractional resection; avoid excess cauterisation; biopsy abnormal-looking urothelium; separately labelled specimens.', 'Strong - NMIBC §5.15')];
    tk.push(R('Report must state location, grade, stage, LVI, UC subtype, presence of CIS and detrusor muscle.', 'Strong - NMIBC §5.15'));
    const need2 = a.stage === 'T1' || a.comp === 'Incomplete' || a.comp === 'Doubtful' || (a.dm === 'Absent' && !((a.stage === 'Ta' && (a.grade === 'LG' || a.grade === 'G1')) || a.stage === 'CIS only'));
    const unk2 = !a.comp || !a.dm;
    tk.push(R(need2 ? 'Second TURBT is indicated from your inputs (T1, incomplete/doubtful resection, or no detrusor muscle outside Ta LG/G1 and primary CIS). Do it within 2-6 weeks and include the primary tumour site.' : (unk2 ? 'Second TURBT: enter completeness and detrusor muscle status to confirm whether it is needed.' : 'Second TURBT not indicated by the entered data.'), 'Strong / Weak (timing) - NMIBC §5.15'));
    if (a.stage === 'T1' || a.stage === 'CIS only') tk.push(R('Consider prostatic urethral biopsy if bladder-neck tumour or suspected CIS/T1 and not already sampled.', 'Weak - NMIBC §5.15'));
    out.secs.push(S('TURBT and pathology', tk));
    if (r.rg) {
      const tx = { 'Low': [R('One immediate post-TURBT intravesical chemotherapy instillation.', 'Strong - NMIBC §7.11')], 'Intermediate': [R('Intravesical chemotherapy is a reasonable first-line option in most patients; one-year full-dose BCG (induction + 3-weekly at 3, 6, 12 months) is an alternative. Choose by individual recurrence/progression risk and side effects.', 'Strong - NMIBC §7.11'), R('Small papillary recurrence >1 year after previous TURBT: one immediate chemotherapy instillation.', 'Strong - NMIBC §7.11')], 'High': [R('Full-dose intravesical BCG for 1-3 years, but discuss immediate radical cystectomy.', 'Strong - NMIBC §7.11')], 'Very high': [R('Offer radical cystectomy, or full-dose BCG for 1-3 years especially if the patient declines or is unfit for cystectomy.', 'Strong - NMIBC §7.11')] }[r.rg];
      out.secs.push(S('Adjuvant treatment (' + r.rg + ' risk)', tx.concat(r.hgInt ? [R('Intermediate-risk HG/G3 subgroup: follow up as high risk.', 'NMIBC §8.2')] : [])));
      const f = { 'Low': 'Cystoscopy at 3 months, then at 12 months, then yearly. Total 5 years. No routine cytology; imaging not systematic.', 'Intermediate': 'Cystoscopy at 3 months, then every 6 months for 2 years, then yearly. Total 10 years. No routine cytology; imaging not systematic.', 'High': 'Cystoscopy + cytology every 3 months for 2 years, then every 6 months up to 5 years, then yearly lifelong. CT urography yearly (CT annually to 5 years, then every 2 years to 10 years).', 'Very high': 'Cystoscopy + cytology every 3 months for 2 years, then every 6 months up to 5 years, then yearly lifelong. CT urography yearly (CT annually to 5 years, then every 2 years to 10 years).' }[r.rg];
      out.secs.push(S('Follow-up schedule', [R(f, 'NMIBC Table 8.2 (Weak)'), R('First cystoscopy at 3 months applies to all TaT1/CIS patients.', 'NMIBC §8'), R('Positive cytology with no visible bladder tumour: mapping or PDD-guided biopsies, upper-tract imaging and prostatic urethral biopsy.', 'Strong - NMIBC §8.2')]));
    } else out.secs.push(S('Risk group', [R('Risk group cannot be assigned yet. Answer: ' + r.miss.join(', ') + '.', 'NMIBC Table 6.2')]));
    if (r.rf !== undefined && r.rg) out.note = 'Additional risk factors counted: ' + r.rf + ' of 3 (age >70 from the record, tumour >3 cm, multiple tumours).';
    if (a.bcg && a.bcg !== 'BCG-naive') {
      const b = { 'BCG-unresponsive': 'Radical cystectomy; or clinical trial; or other bladder-preserving strategies if ineligible for / refusing cystectomy.', 'BCG-relapsing': 'Radical cystectomy or repeat BCG course, individualised; or clinical trial / other bladder-preserving options.', 'BCG-exposed': 'Repeat BCG course or radical cystectomy, individualised; or clinical trial.' }[a.bcg];
      out.secs.push(S('After BCG', [R(b, 'NMIBC Table 7.5')]));
    }
    out.secs.push(S('General', [R('Counsel on smoking cessation (structured perioperative programmes improve quit rates).', 'NMIBC §7.1'), R('Radical cystectomy is also indicated for very-high-risk and BCG-refractory/relapsing/unresponsive NMIBC and extensive papillary disease uncontrolled by TURBT + intravesical therapy.', 'MIBC §6.7.1.c')]));
    return out;
  }
  /* muscle invasive T2-T4a N0M0 */
  out.badge = 'MIBC ' + a.stage + (a.n === 'N+' ? ' N+' : '');
  if (!a.n || a.n === 'Not assessed') out.miss.push('Node status'); if (!a.m || a.m === 'Not assessed') out.miss.push('Metastasis status');
  if (a.n === 'N+') out.secs.push(S('Note', [R('Pathway below is for cT2-T4a N0-1 M0. Node-positive disease needs multidisciplinary discussion.', 'MIBC §6.1')]));
  out.secs.push(S('Staging', [R('CT chest, abdomen and pelvis including CT urography with dedicated urothelial phases.', 'Strong - MIBC §5.6.6'), R('If MRI is used for local staging, do it before TURBT; MRI can assess response to systemic therapy.', 'Strong / Weak - MIBC §5.6.6'), R('Discuss every MIBC patient in a multidisciplinary team; discuss both bladder preservation and cystectomy.', 'MIBC §6.1')]));
  if (a.phase === 'After cystectomy') {
    const rows = [];
    const hi = a.pt === 'pT3' || a.pt === 'pT4' || a.pn === 'pN+';
    if (!a.nac) out.miss.push('Neoadjuvant therapy given?'); if (!a.pt) out.miss.push('pT'); if (!a.pn) out.miss.push('pN');
    if (hi && a.nac === 'No') rows.push(R('Adjuvant cisplatin-based combination chemotherapy for pT3/4 and/or pN+ if no neoadjuvant systemic therapy was given.', 'Strong - MIBC §6.5.2'));
    if ((hi || a.nac === 'Yes') && a.cisok && a.cisok !== 'Yes') rows.push(R('High-risk disease (>= ypT2N0 after NAC, or pT3/4 and/or pN+) and not eligible for / declined cisplatin: adjuvant nivolumab (EMA approval only for PD-L1 tumour cell expression >= 1%).', 'Strong - MIBC §6.5.2'));
    if (a.pt === 'pT3' || a.pt === 'pT4' || a.pn === 'pN+' || a.margin === 'Positive') rows.push(R('Adjuvant radiotherapy to cystectomy bed and pelvic nodes can be offered for pT3b-4, positive nodes or positive margins - improves locoregional relapse-free survival, not overall survival.', 'Weak - MIBC §6.6.2'));
    if (!rows.length && a.pt && a.pn) rows.push(R('No adjuvant systemic recommendation triggered by the entered pathology.', 'MIBC §6.5.2'));
    out.secs.push(S('Adjuvant therapy', rows));
    out.secs.push(S('Post-operative', [R('Pharmacological VTE prophylaxis (e.g. LMWH) from day 1 for at least 4 weeks.', 'Strong - MIBC §6.7')]));
    return out;
  }
  const g = Number(a.gfr), has = !!a.gfr;
  const rows = [];
  if (!has) { out.miss.push('eGFR'); rows.push(R('Enter eGFR to select the perioperative systemic option.', 'MIBC §6.5')); }
  else if (g >= 40) { rows.push(R('Perioperative cisplatin/gemcitabine plus durvalumab for cisplatin-eligible patients (eGFR >= 40 allowed) who can receive immunotherapy.', 'Strong - MIBC §6.5.1')); rows.push(R('Alternative: neoadjuvant cisplatin-based combination chemotherapy.', 'Strong - MIBC §6.5.1')); }
  else rows.push(R('Cisplatin-ineligible (eGFR < 40): perioperative enfortumab vedotin plus pembrolizumab. Do not give carboplatin-based neoadjuvant chemotherapy.', 'Strong - MIBC §6.5.1'));
  out.secs.push(S('Perioperative systemic therapy (cT2-T4a N0-1 M0)', rows));
  const tmtOk = a.stage !== 'T4a' && a.stage !== 'T3' && a.multi === 'Solitary, unifocal' && a.xcis === 'No' && (a.hydro === 'None' || a.hydro === 'Unilateral') && a.bfun === 'Good';
  const tmtAns = a.multi && a.xcis && a.hydro && a.bfun;
  out.secs.push(S('Definitive local treatment', [
    R('Radical cystectomy with standard (not extended) lymph node dissection, or bladder-preserving trimodality therapy (TMT) for eligible patients - both are preferred over radiotherapy alone.', 'Strong - MIBC §6.7, §6.8'),
    R(tmtAns ? (tmtOk ? 'TMT profile fits: solitary unifocal tumour, no extensive CIS, no/unilateral hydronephrosis, good bladder function. Stage T3a at most - confirm substaging.' : 'TMT profile is less favourable from your inputs (best suited: solitary unifocal cT2-T3a, no extensive CIS, no/unilateral hydronephrosis, good bladder function). Consider it mainly if unfit/unwilling for cystectomy.') : 'Enter tumour pattern, CIS, hydronephrosis and bladder function to check TMT suitability.', 'MIBC §6.8.1'),
    R('Do not delay radical cystectomy beyond 3 months unless neoadjuvant chemotherapy is given.', 'Strong - MIBC §6.7.4'),
    R('If TMT is chosen, lifelong bladder monitoring after treatment is essential. Salvage cystectomy for non-responders / muscle-invasive recurrence.', 'Strong - MIBC §6.8, §6.7.1.c')]));
  out.secs.push(S('Cystectomy planning', [
    R('Open vs robotic: choose centres and surgeons by experience, not technique; inform the patient about pros and cons.', 'Strong - MIBC §6.7.4'),
    R('Hospital volume: at least 20 radical cystectomies per year.', 'Strong - MIBC §6.7.9'),
    R('No preoperative bowel preparation; use fast-track pathways; LMWH from day 1 for at least 4 weeks.', 'Strong - MIBC §6.7'),
    a.urethra === 'Yes' ? R('Invasive tumour in the urethra / at the urethral dissection level: do NOT offer an orthotopic neobladder.', 'Strong - MIBC §6.7.5') : R('Orthotopic neobladder only if no invasive urethral tumour at the level of dissection; sexual-preserving techniques only for motivated, eligible male patients with organ-confined disease.', 'Strong - MIBC §6.7.2, §6.7.5'),
    R('Do not offer preoperative radiotherapy.', 'Strong - MIBC §6.6.1')]));
  return out;
}

/* ---------------- prostate ---------------- */
function pcaRisk(a) {
  const miss = [];
  if (a.psa === undefined || a.psa === '') miss.push('PSA'); if (!a.gg) miss.push('ISUP grade group'); if (!a.ct || a.ct === 'Not assessed') miss.push('Clinical T'); if (!a.m || a.m === 'Not assessed') miss.push('Metastasis status'); if (!a.cn || a.cn === 'Not assessed') miss.push('Node status');
  const psa = Number(a.psa), gg = Number(a.gg);
  let rg = null, la = false;
  if (a.m === 'M1') return { rg: 'Metastatic', miss: miss.filter(x => x === 'PSA'), la };
  if (a.psa === undefined || a.psa === '' || !a.gg || !a.ct || a.ct === 'Not assessed') return { rg: null, miss, la };
  if (a.ct === 'cT3-4' || a.cn === 'cN1') { rg = 'High'; la = true; }
  else if (gg >= 4 || psa > 20) rg = 'High';
  else if (gg === 3 || (gg === 2 && psa >= 10)) rg = 'Unfavourable intermediate';
  else if (gg === 2 || (gg === 1 && psa >= 10)) rg = 'Favourable intermediate';
  else rg = 'Low';
  return { rg, miss, la };
}
function prostateAssess(a, p) {
  const r = pcaRisk(a), out = { title: 'Prostate cancer', badge: null, secs: [], miss: r.miss.slice() };
  if (!r.rg) { out.secs.push(S('Risk group', [R('EAU risk group cannot be assigned yet. Answer: ' + r.miss.join(', ') + '.', 'PCa Table 4.3')])); return out; }
  out.badge = r.rg === 'Metastatic' ? 'Metastatic (M1)' : 'EAU risk: ' + r.rg + (r.la ? ' (locally advanced)' : '');
  const le = a.le;
  if (r.rg === 'Metastatic') {
    const rows = [R('Discuss in a multidisciplinary team.', 'Strong - PCa §6.6.8'), R('Immediate ADT for symptomatic M1 disease. Short-term older-generation AR antagonist with the first LHRH agonist to reduce flare. LHRH antagonist or orchiectomy if impending complications (cord compression, outlet obstruction). No AR-antagonist monotherapy.', 'Strong / Weak - PCa §6.6.8'),
      R('Do not give ADT alone as first presentation if fit for combination therapy with at least 1 year life expectancy: add abiraterone + prednisone, apalutamide, enzalutamide or rezvilutamide (darolutamide: weak).', 'Strong - PCa §6.6.8')];
    if (a.doc === 'Fit') rows.push(R('Docetaxel only in combination with ADT plus abiraterone or darolutamide (triplet).', 'Strong - PCa §6.6.8')); else if (!a.doc) out.miss.push('Docetaxel fitness');
    if (a.vol === 'Low volume') rows.push(R('Low-volume (CHAARTED) first-presentation M1: add prostate radiotherapy (up to 72 Gy equivalent) to ADT.', 'Strong - PCa §6.6.8')); else if (!a.vol || a.vol === 'Unknown') out.miss.push('Disease volume');
    rows.push(R(a.hrr === 'Done' ? 'HRR result available: niraparib can be added to ADT + abiraterone if aberration present (M1).' : 'Test for somatic or germline HRR aberrations (niraparib + abiraterone option).', 'Weak - PCa §6.6.8'));
    rows.push(R('No ADT plus surgery for M1 outside trials; metastasis-directed therapy only within trials / prospective cohorts.', 'Strong - PCa §6.6.8'));
    out.secs.push(S('First-line hormone-sensitive metastatic', rows));
    out.secs.push(S('Supportive care', [R('Assess osteoporosis risk and do DEXA when starting long-term ADT; bone protection with calcium/vitamin D; treat painful bone metastases early (radiotherapy, analgesia).', 'Strong - PCa §6.6.8'), R('Spinal cord compression: immediate high-dose corticosteroids, assess for surgery +/- radiation; radiation alone if surgery unsuitable.', 'Strong - PCa §6.6.8')]));
    return out;
  }
  const st = { 'Low': 'Do not use additional imaging for staging.', 'Favourable intermediate': 'Do not use additional imaging for staging.', 'Unfavourable intermediate': 'PSMA PET/CT if available (weak), otherwise at least cross-sectional abdominopelvic imaging plus bone scan.', 'High': 'Metastatic screening with PSMA PET/CT if available, or at least cross-sectional abdominopelvic imaging plus bone scan.' }[r.rg];
  out.secs.push(S('Staging', [R(st, (r.rg === 'Low' || r.rg === 'Favourable intermediate' ? 'Strong' : r.rg === 'High' ? 'Strong' : 'Weak') + ' - PCa §5.8.5'), R('Pre-biopsy MRI can be used for local staging information.', 'Weak - PCa §5.8.5')]));
  const rows = [];
  if (!le || le === 'Not assessed') out.miss.push('Life expectancy');
  const short = le === 'Under 10 years';
  if (r.rg === 'Low') {
    rows.push(R(short ? 'Life expectancy under 10 years: watchful waiting.' : 'Life expectancy over 10 years: active surveillance.', 'Strong - PCa §6.3.1.d'));
    rows.push(R('Whole-gland or focal therapy would be overtreatment outside a trial; do not use ADT monotherapy in asymptomatic localised disease.', 'PCa §6.3.1.c'));
  } else if (r.rg === 'High' && !r.la) {
    if (short) rows.push(R('Asymptomatic with life expectancy under 10 years: watchful waiting.', 'Strong - PCa §6.3.3.c'));
    rows.push(R('Radical prostatectomy in selected patients; if lymph node dissection is done, perform extended PLND. No frozen section of nodes to decide whether to abandon RP.', 'Strong - PCa §6.3.3.c'));
    rows.push(R('Radiotherapy: IMRT/VMAT + IGRT 76-78 Gy (or 60 Gy/20 fx, 70 Gy/28 fx) with long-term ADT for 2-3 years; focal boost to the MRI-defined dominant lesion (strong); brachytherapy boost in good urinary function (weak).', 'Strong - PCa §6.3.3.c'));
    rows.push(R('Do not offer whole-gland or focal therapy. ADT monotherapy only if unwilling/unable to have local treatment and PSA doubling time <12 months with PSA >50 or poorly differentiated tumour.', 'Strong - PCa §6.3.3.c'));
  } else if (r.rg === 'High' && r.la) {
    rows.push(R('Locally advanced / cN1: best outcomes come from local treatment combined with systemic treatment if the patient is fit for both (radiotherapy with long-term ADT is the established backbone; review the cN1M0 section for current options).', 'PCa §6.3.4'));
    rows.push(R('If suspicious nodes are found during RP in a cN0 patient, do not abandon the procedure and do not use frozen section.', 'PCa §6.3.4.a'));
  } else {
    if (short) rows.push(R('Asymptomatic with life expectancy under 10 years: watchful waiting.', 'Strong - PCa §6.3.2.f'));
    if (a.gg === '2') rows.push(R(a.asfav === 'Yes' ? 'ISUP GG2 with low disease extent: active surveillance can be offered to selected patients, accepting a possible increased risk of metastatic progression.' : a.asfav === 'No' ? 'ISUP GG2 without low disease extent: active surveillance not suitable on these criteria.' : 'ISUP GG2: active surveillance only for selected patients with low disease extent (answer the AS question).', 'Weak - PCa §6.3.2.f'));
    if (a.gg === '3') rows.push(R('ISUP GG3 must be excluded from active surveillance protocols.', 'Strong - PCa §6.3.2.f'));
    rows.push(R('Radical prostatectomy if life expectancy over 10 years; nerve-sparing when extracapsular risk on that side is low.', 'Strong - PCa §6.3.2.f'));
    rows.push(R('Radiotherapy: IMRT/VMAT + IGRT 76-78 Gy (or 60 Gy/20 fx, 70 Gy/28 fx) with short-term ADT for 4-6 months; weak options: focal boost, SBRT 36.25 Gy/5 fx or 42.7 Gy/7 fx (favourable intermediate).', 'Strong / Weak - PCa §6.3.2.f'));
    rows.push(R(r.rg === 'Favourable intermediate' ? 'LDR brachytherapy for good urinary function and NCCN-favourable intermediate-risk disease.' : 'LDR or HDR brachytherapy boost with IMRT/VMAT + short-term ADT in good urinary function (unfavourable intermediate).', (r.rg === 'Favourable intermediate' ? 'Strong' : 'Weak') + ' - PCa §6.3.2.f'));
    rows.push(R('Whole-gland or focal ablation only within trials/registries; no ADT monotherapy for asymptomatic men unable to have local treatment.', 'PCa §6.3.2.f'));
  }
  out.secs.push(S('Management (all recommendations assume conventional imaging)', rows));
  return out;
}

const GUIDE = {
  bladder: { name: 'Bladder cancer', fn: bladderAssess, src: 'NMIBC · MIBC/metastatic', dx: 'Ca Bladder' },
  prostate: { name: 'Prostate cancer', fn: prostateAssess, src: 'Prostate cancer', dx: 'Prostate CA' }
};
const guideKinds = p => Object.keys(GUIDE).filter(k => (p.dx || []).some(d => d.name === GUIDE[k].dx));
function guideSummary(p, k) {
  const c = p.clin && p.clin[k]; if (!c) return { risk: '', inputs: '' };
  return { risk: c.badge || '', inputs: Object.entries(c.a || {}).filter(([, v]) => v !== '' && v != null).map(([x, v]) => x + ': ' + v).join('; ') };
}


/* ---------------- optional AI review (opt-in, de-identified, user's own API key) ---------------- */
function aiPayload(p, kind, a, r) {
  const band = Math.floor((Number(p.age) || 0) / 10) * 10;
  const lines = ['Specialty: urology (' + GUIDE[kind].name + ')', 'Patient: ' + (band ? band + 's' : 'age n/a') + ', ' + (p.sex || 'sex n/a'), '', 'Entered clinical data:'];
  Object.entries(a).forEach(([k, v]) => { const f = GF[kind].find(x => x.id === k); lines.push('- ' + (f ? f.l : k) + ': ' + v); });
  lines.push('', 'Rule-based EAU 2026 assessment: ' + (r.badge || 'not assignable yet'));
  r.secs.forEach(s => { lines.push(s.h + ':'); s.rows.forEach(x => lines.push('  - ' + x.t)); });
  if (r.miss.length) lines.push('Missing data: ' + [...new Set(r.miss)].join(', '));
  return lines.join('\n');
}
async function aiReview(text, key, model, prov) {
  const sys = 'You are a urology decision-support assistant for a resident doctor. You get de-identified clinical inputs and a rule-based EAU 2026 summary. Reply in concise English with three short headed lists: (1) Possible inconsistencies or data-entry doubts, (2) Missing information that could change management, (3) Questions to ask or investigations to consider. Base advice only on established EAU guideline principles, do not invent recommendations or numbers, say when unsure. The final decision rests with the treating doctor.';
  if (prov === 'gemini') {
    const m = (!model || model === 'gemini-2.5-flash') ? 'gemini-3.8-flash' : model;
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(m) + ':generateContent', { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify({ systemInstruction: { parts: [{ text: sys }] }, contents: [{ role: 'user', parts: [{ text }] }], generationConfig: { maxOutputTokens: 1200 } }) });
    const j = await r.json();
    if (!r.ok) throw new Error((j.error && j.error.message) || ('HTTP ' + r.status));
    const c = j.candidates && j.candidates[0];
    return ((c && c.content && c.content.parts) || []).map(x => x.text || '').join('\n').trim() || 'No response';
  }
  const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }, body: JSON.stringify({ model: model || 'claude-sonnet-5-5', max_tokens: 900, system: sys, messages: [{ role: 'user', content: text }] }) });
  const j = await r.json();
  if (!r.ok) throw new Error((j.error && j.error.message) || ('HTTP ' + r.status));
  return (j.content || []).map(c => c.text || '').join('\n').trim();
}

Views.guide = async ({ pid, kind }) => {
  const p = await Repo.patient(pid); const G = GUIDE[kind];
  let a = Object.assign({}, p.clin && p.clin[kind] ? p.clin[kind].a : {});
  const visible = () => GF[kind].filter(f => !f.show || f.show(a));
  const form = () => visible().map(f => {
    if (f.t === 'n') return '<label class="lbl">' + esc(f.l) + '</label><input class="inp" inputmode="decimal" data-n="' + f.id + '" value="' + esc(a[f.id] == null ? '' : a[f.id]) + '">';
    const opts = typeof f.o === 'function' ? f.o(a) : f.o;
    return '<label class="lbl">' + esc(f.l) + '</label><div class="chips wrapchips">' + opts.map(o => '<button type="button" data-act="gp" class="chip sm ' + (a[f.id] === o ? 'on' : '') + '" data-f="' + f.id + '" data-v="' + esc(o) + '">' + esc(o) + '</button>').join('') + '</div>';
  }).join('');
  const clean = () => { const keep = new Set(visible().map(f => f.id)); Object.keys(a).forEach(k => { if (!keep.has(k)) delete a[k]; }); };
  const result = () => {
    const r = G.fn(a, p);
    return (r.badge ? '<div class="card" style="background:var(--navy);color:#fff;border:0"><div class="small" style="color:#9FB4C8">Assessment</div><div style="font-size:19px;font-weight:700;margin-top:2px">' + esc(r.badge) + '</div>' + (r.note ? '<div class="small" style="color:#C9D6E2;margin-top:6px">' + esc(r.note) + '</div>' : '') + '</div>' : '') +
      (r.miss.length ? '<div class="card" style="background:var(--ambert);border-color:#FCD34D"><b>Still needed</b><div class="small" style="color:var(--amberd);margin-top:4px">' + esc([...new Set(r.miss)].join(' · ')) + '</div></div>' : '') +
      r.secs.map(s => '<div class="sec" style="margin:16px 0 8px"><h2>' + esc(s.h) + '</h2></div><div class="card" style="padding:4px 14px">' + s.rows.map(x => '<div class="irow" style="display:block"><div style="font-size:14.5px">' + esc(x.t) + '</div><div class="small" style="margin-top:4px;color:var(--link);font-weight:600">' + esc(x.tag) + '</div></div>').join('') + '</div>').join('') ;
  };
  const save = debounce(async () => { const r = G.fn(a, p); await Repo.setClin(pid, kind, a, r.badge || ''); }, 600);
  return {
    html: hdr('EAU Guidance') + wrapPage(
      '<div class="phead" style="margin-bottom:4px"><div class="avatar">' + esc(initials(p.name)) + '</div><div><div class="t-name">' + esc(p.name) + '</div><div class="t-sub"><b>' + esc(p.uhid) + '</b> &middot; ' + p.age + 'y &middot; ' + G.name + '</div></div></div>' +
      '<div class="banner" style="margin-top:12px">' + ic('shield', 16) + ' On-device only. Nothing is sent anywhere.</div>' +
      '<div id="gq">' + form() + '</div><div style="height:6px"></div><div id="ga">' + result() + '</div>' +
      '<div class="sec" style="margin:16px 0 8px"><h2>AI review (optional)</h2></div><div class="card"><div class="small" style="margin-bottom:10px">Sends only the answers above (no name, UHID, mobile or exact age) to the AI provider you set, using your own API key, after you preview and approve it.</div><button class="btn o" data-act="aiGo">' + ic('book', 18) + ' Review with AI</button><div id="aiout"></div></div>' +
      '<div class="small" style="margin-top:18px;line-height:1.5">' + esc(EAU_VER) + '. Recommendations are paraphrased from the guidelines for decision support. They do not replace clinical judgement or the full guideline text - verify before acting. Answers are saved to this patient automatically.</div>'),
    acts: {
      aiGo: async () => {
        const key = await metaGet('aiKey');
        if (!key) return alertDlg('AI not set up', 'Add your API key in Settings > AI assistant first.');
        const model = await metaGet('aiModel'); const prov = (await metaGet('aiProv')) || 'gemini'; const host = prov === 'gemini' ? 'generativelanguage.googleapis.com (Google)' : 'api.anthropic.com (Anthropic)'; const text = aiPayload(p, kind, a, G.fn(a, p));
        sheet('<h3>Review before sending</h3><div class="small" style="margin-bottom:8px">This exact text will be sent to ' + host + '. Nothing else is sent.</div><div class="card pre" style="max-height:38vh;overflow:auto;font-size:13px">' + esc(text) + '</div><div style="height:12px"></div><button class="btn" id="aiok">Send</button><button class="btn o" style="margin-top:8px" id="aino">Cancel</button>', (sh, close) => {
          $('#aino', sh).onclick = close;
          $('#aiok', sh).onclick = async () => {
            close();
            try { const out = await withBusy('Asking AI...', () => aiReview(text, key, model, prov)); $('#aiout').innerHTML = '<div class="pre" style="margin-top:12px;font-size:14.5px">' + esc(out) + '</div><div class="small" style="margin-top:8px">AI-generated. Verify against the guideline.</div>'; await Repo.audit('ai_review', 'guidance', null, pid); }
            catch (e) { alertDlg('AI request failed', String(e.message || e)); }
          };
        });
      },
      gp: el => {
        const id = el.dataset.f, v = el.dataset.v;
        if (a[id] === v) delete a[id]; else a[id] = v;
        if (id === 'sys') delete a.grade;
        clean(); $('#gq').innerHTML = form(); $('#ga').innerHTML = result(); save();
      }
    },
    bind: root => {
      root.oninput = e => { const n = e.target.dataset && e.target.dataset.n; if (!n || !$('#ga')) return; if (e.target.value.trim() === '') delete a[n]; else a[n] = e.target.value.trim(); $('#ga').innerHTML = result(); save(); };
    }
  };
};
ACT.openGuide = el => go('guide', { pid: +el.dataset.pid, kind: el.dataset.k });
