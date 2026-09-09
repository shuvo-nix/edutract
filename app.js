'use strict';

/* ==================== Storage ==================== */
const LS = {
  files: 'edutract:files',
  active: 'edutract:activeFile',
  bookmarks: 'edutract:bookmarks',
  notes: 'edutract:notes',
  statuses: 'edutract:statuses',
  drafts: 'edutract:drafts',
  theme: 'edutract:theme'
};

const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); }
    catch (e) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage full */ }
  },
  remove(key) { try { localStorage.removeItem(key); } catch (e) {} }
};

function genId() {
  return 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* -------- Migration from the single-file version -------- */
function migrateOld() {
  if (localStorage.getItem(LS.files)) return;
  const rawStr = localStorage.getItem('edutract:data');
  if (!rawStr) return;
  try {
    const raw = JSON.parse(rawStr);
    if (!Array.isArray(raw) || !raw.length) {
      store.remove('edutract:data'); store.remove('edutract:meta');
      return;
    }
    const meta = store.get('edutract:meta', {}) || {};
    const id = genId();
    const filesObj = {};
    filesObj[id] = {
      id: id,
      name: meta.filename ? String(meta.filename).replace(/\.(xlsx|xls)$/i, '') : 'Master list',
      raw: raw,
      count: raw.length,
      uploadedAt: meta.uploadedAt || Date.now(),
      lastAccessed: Date.now()
    };
    store.set(LS.files, filesObj);
    store.set(LS.active, id);
    const oldBm = store.get('edutract:bookmarks', null);
    if (Array.isArray(oldBm) && oldBm.length) store.set(LS.bookmarks, { id: id, arr: oldBm });
    const oldNotes = store.get('edutract:notes', null);
    if (oldNotes && typeof oldNotes === 'object' && !Array.isArray(oldNotes)) store.set(LS.notes, { id: id, map: oldNotes });
    const oldSt = store.get('edutract:statuses', null);
    if (oldSt && typeof oldSt === 'object' && !Array.isArray(oldSt)) store.set(LS.statuses, { id: id, map: oldSt });
    const oldDr = store.get('edutract:drafts', null);
    if (oldDr && typeof oldDr === 'object' && !Array.isArray(oldDr)) store.set(LS.drafts, { id: id, map: oldDr });
    store.remove('edutract:data');
    store.remove('edutract:meta');
  } catch (e) { /* ignore corrupt old data */ }
}

migrateOld();

/* ==================== Icons (Lucide-style) ==================== */
function svgWrap(inner, size, fill) {
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="' + (fill || 'none') + '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>';
}
const I = {
  moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  pencil: '<path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>',
  chevron: '<polyline points="6 9 12 15 18 9"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  mail: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
  check: '<polyline points="20 6 9 17 4 12"/>'
};
function icon(name, size) { return svgWrap(I[name], size || 18); }
function starIcon(filled, size) {
  return svgWrap(I.star, size || 18, filled ? 'currentColor' : 'none');
}

/* ==================== State ==================== */
let files = store.get(LS.files, {}) || {};
let activeFileId = store.get(LS.active, null);
let bookmarksAll = store.get(LS.bookmarks, {}) || {};
if (Array.isArray(bookmarksAll)) bookmarksAll = {};
let notesAll = store.get(LS.notes, {}) || {};
let statusesAll = store.get(LS.statuses, {}) || {};
let draftsAll = store.get(LS.drafts, {}) || {};
let resumeFileId = null;

let rows = [];
let openIds = new Set();
let expandAllState = false;
const filters = { q: '', priority: 'all', area: 'all', location: 'all', status: 'all', bookmarked: false, sort: 'priority' };

function activeFile() { return files[activeFileId] || null; }
function bmSet() { return new Set(bookmarksAll[activeFileId] || []); }
function notesMap() { return notesAll[activeFileId] || {}; }
function overridesMap() { return statusesAll[activeFileId] || {}; }
function draftsMap() { return draftsAll[activeFileId] || {}; }

/* ==================== DOM refs ==================== */
const $ = (s) => document.querySelector(s);
const uploadView = $('#upload-view');
const directoryView = $('#directory-view');
const dropzone = $('#dropzone');
const fileInput = $('#file-input');
const listEl = $('#list');
const emptyEl = $('#empty');
const statsEl = $('#stats');

/* ==================== Column mapping (flexible) ==================== */
const FIELD_DEFS = [
  ['priority',    /^priority$/i],
  ['name',        /^(name|professor|person|pi|lab|group)$/i],
  ['institution', /institution|university|affiliation|organi[sz]ation/i],
  ['role',        /^role$|^position$/i],
  ['research',    /research|focus/i],
  ['hiring',      /hiring/i],
  ['email',       /e-?mail/i],
  ['website',     /website|home ?page/i],
  ['profile',     /profile|vacancy|open position/i],
  ['documents',   /document|route|apply|application/i],
  ['angle',       /angle|suggest|strategy/i],
  ['status',      /^status$|contact/i]
];

/* ==================== Auto-classification ==================== */
const AREA_RULES = [
  ['HCI & Usability',         /\b(hci|usab|user research|ux|user stud|interaction|human[- ]computer)/i],
  ['Trustworthy AI & Safety', /\b(trustworthy|alignment|ai safety|llm|responsible ai|ai ethic|explainab|interpretab)/i],
  ['Security & Cyber',        /\b(security|cyber|fuzz|vulnerab|threat|malware|attack|defen[cs]e)/i],
  ['Privacy',                 /\bprivacy\b/i],
  ['Education & Learning',    /\b(education|teaching|e-?learning|learning analytics|digital education|self[- ]regulated)/i],
  ['Health & Medicine',       /\b(health|medic|telemed|clinical|psychiat|well[- ]?being|patient)/i],
  ['NLP & Dialogue',          /\b(nlp|natural language|dialog|conversational|chatbot|language model)/i],
  ['Robotics & XR',           /\b(robot|\bxr\b|\bvr\b|virtual reality|mixed reality|augmented|autonomous driving|teleoperation)/i]
];

const CITY_RULES = [
  [/cispa|saarbr|st\.? ?ingbert/i, 'Saarbrücken'],
  [/berlin|weizenbaum|hu-?berlin/i, 'Berlin'],
  [/darmstadt|athene|ukp/i, 'Darmstadt'],
  [/zurich|uzh/i, 'Zurich'],
  [/tübingen|tubingen|tuebingen|iwm\b|tücede/i, 'Tübingen'],
  [/bamberg/i, 'Bamberg'],
  [/bayreuth/i, 'Bayreuth'],
  [/köln|cologne|koeln/i, 'Cologne'],
  [/koblenz/i, 'Koblenz'],
  [/hamburg|haw\b/i, 'Hamburg'],
  [/konstanz/i, 'Konstanz'],
  [/düsseldorf|dusseldorf|duesseldorf|hhu\b/i, 'Düsseldorf'],
  [/duisburg/i, 'Duisburg'],
  [/göttingen|goettingen/i, 'Göttingen'],
  [/potsdam|hasso|hpi\b/i, 'Potsdam'],
  [/geesthacht|hereon/i, 'Geesthacht'],
  [/oldenburg/i, 'Oldenburg'],
  [/ingolstadt|carissma|thi\b/i, 'Ingolstadt'],
  [/hagen|fernuni/i, 'Hagen'],
  [/freiburg/i, 'Freiburg'],
  [/stuttgart/i, 'Stuttgart'],
  [/hannover|hanover/i, 'Hannover'],
  [/\bbonn\b/i, 'Bonn'],
  [/\bessen\b/i, 'Essen'],
  [/bochum|rub\b/i, 'Bochum'],
  [/dortmund/i, 'Dortmund'],
  [/bremen/i, 'Bremen'],
  [/münchen|muenchen|munich|helmholtz munich|\btum\b/i, 'Munich'],
  [/aachen|rwth/i, 'Aachen']
];

const BUCKET_LABELS = {
  'open-verify': 'Open / verify',
  'applied': 'Applied',
  'emailed': 'Emailed',
  'outreach': 'Outreach',
  'future': 'Future contact',
  'monitor': 'Monitor',
  'interview': 'Interview',
  'no-response': 'No response',
  'rejected': 'Rejected',
  'other': 'Other'
};

const OVERRIDE_BUCKET = {
  'Not contacted': 'other',
  'Emailed': 'emailed',
  'Applied': 'applied',
  'Interview scheduled': 'interview',
  'No response': 'no-response',
  'Rejected': 'rejected'
};

const STATUS_OPTIONS = ['Not contacted', 'Emailed', 'Applied', 'Interview scheduled', 'No response', 'Rejected'];

/* ==================== Helpers ==================== */
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function linkify(text, mailto) {
  return String(text || '').split(/(\s+)/).map(function (tok) {
    const t = tok.replace(/[),.;]+$/, '');
    const punct = tok.slice(t.length);
    if (!t) return esc(tok);
    if (/^https?:\/\//i.test(t)) {
      const label = t.replace(/^https?:\/\//i, '').replace(/\/$/, '');
      return '<a href="' + esc(t) + '" target="_blank" rel="noopener">' + esc(label) + '</a>' + esc(punct);
    }
    if (mailto && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) {
      return '<a href="mailto:' + esc(t) + '">' + esc(t) + '</a>' + esc(punct);
    }
    return esc(tok);
  }).join('');
}

function attrSel(v) { return String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"'); }

let toastTimer;
function toast(msg, isError) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.toggle('error', !!isError);
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { t.hidden = true; }, 1900);
}

async function copyText(text, btn) {
  let ok = false;
  try { await navigator.clipboard.writeText(text); ok = true; }
  catch (e1) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      ok = document.execCommand('copy');
      ta.remove();
    } catch (e2) { ok = false; }
  }
  if (ok) {
    toast('Email draft copied!');
    if (btn) {
      const old = btn.innerHTML;
      btn.innerHTML = icon('check', 15) + ' Copied';
      setTimeout(function () { btn.innerHTML = old; }, 1500);
    }
  } else {
    toast('Copy failed — please select the text manually.', true);
  }
}

/* ==================== Classification ==================== */
function detectAreas(row) {
  const text = (row.research || '') + ' ' + (row.angle || '');
  const found = AREA_RULES.filter(function (r) { return r[1].test(text); }).map(function (r) { return r[0]; });
  return found.length ? found : ['General'];
}

function detectLocation(row) {
  const s = row.institution || '';
  for (let i = 0; i < CITY_RULES.length; i++) { if (CITY_RULES[i][0].test(s)) return CITY_RULES[i][1]; }
  return 'Other';
}

function bucketOf(row) {
  const ov = overridesMap()[row.uid];
  if (ov && OVERRIDE_BUCKET[ov]) return OVERRIDE_BUCKET[ov];
  const s = String(row.status || '');
  if (/applied/i.test(s)) return 'applied';
  if (/emailed|contacted/i.test(s)) return 'emailed';
  if (/interview/i.test(s)) return 'interview';
  if (/no ?response/i.test(s)) return 'no-response';
  if (/rejected/i.test(s)) return 'rejected';
  if (/future/i.test(s)) return 'future';
  if (/monitor/i.test(s)) return 'monitor';
  if (/outreach/i.test(s)) return 'outreach';
  if (/open|verify|promptly|priority|high|apply/i.test(s)) return 'open-verify';
  return 'other';
}

/* ==================== Email draft generation ==================== */
function extractGreeting(name) {
  let first = String(name || '').split('/')[0].trim();
  first = first.replace(/^((prof|dr)\.?\s*)+/i, '').trim();
  first = first.replace(/["'\u201C\u201D]/g, '');
  const words = first.split(/\s+/).filter(Boolean);
  const last = words[words.length - 1] || '';
  const isOrg = /^(team|teams|lab|labs|group|groups|institute|school|project|network|program|center|centre|consortium)$/i.test(last);
  const isAcronym = /^[A-Z0-9&\- ]{2,12}$/.test(first) && first === first.toUpperCase() && /^[A-Z]/.test(first);
  if (!words.length || isOrg || isAcronym) return 'Dear Hiring Team,';
  return 'Dear Dr. ' + last + ',';
}

function firstSnippet(s) { return String(s || '').split(/[.;\n]/)[0].trim(); }

function cleanAngle(s) {
  return String(s || '').replace(/^your [^:]{2,50}:\s*/i, '').trim();
}

function buildEmail(row) {
  let who = String(row.name || '').split('/')[0].trim();
  who = who.replace(/\s+teams?$/i, '');
  const greeting = extractGreeting(row.name);
  const research = firstSnippet(row.research) || 'human-centered AI';
  const angle = cleanAngle(firstSnippet(row.angle)) || 'empirical, human-centered evaluation of AI-supported systems';
  const lines = [
    'Subject: Prospective PhD applicant — ' + who,
    '',
    greeting,
    '',
    "My name is Md Shakhawat Hossain. I hold an MSc in Human-Computer Interaction (University of Siegen) and a BSc in Computer Science (University of Macau), with experience in empirical evaluation, software quality assurance, usability testing, and AI-supported systems.",
    '',
    "I am interested in " + who + "'s work on " + research + '. My particular interest here: ' + angle + '.',
    '',
    'My strongest experience is in mixed-methods user research, usability and heuristic evaluation, behavioral analysis, and QA workflows across multiple product releases. I have also built and systematically tested small LLM-enabled applications to better understand their failure modes and interaction patterns.',
    '',
    'Could you please let me know whether you are currently considering PhD applicants, and which application route and documents you prefer? I would be happy to send my CV, transcripts, and a short research summary.',
    '',
    'Thank you very much for your time.',
    '',
    'Best regards,',
    'Md Shakhawat Hossain',
    '+49 163 255 6779 | shossain.hci@gmail.com',
    'LinkedIn: linkedin.com/in/mds-hossain | Portfolio: www.shossain.xyz'
  ];
  return lines.join('\n');
}

function splitDraft(text) {
  const lines = String(text).split('\n');
  let subject = '', body = text;
  if (lines.length && /^subject:/i.test(lines[0])) {
    subject = lines[0].replace(/^subject:\s*/i, '');
    body = lines.slice(1).join('\n').replace(/^\s*\n/, '');
  }
  return { subject: subject, body: body };
}

function firstEmailOf(row) {
  const m = String(row.email || '').match(/[^\s@;,]+@[^\s@;,]+\.[^\s@;,]+/);
  return m ? m[0] : '';
}

/* ==================== Normalize ==================== */
function normalizeRows(raw) {
  const seen = {};
  return raw.map(function (r) {
    const out = {};
    Object.keys(r).forEach(function (header) {
      const h = String(header).trim();
      for (let i = 0; i < FIELD_DEFS.length; i++) {
        if (FIELD_DEFS[i][1].test(h)) {
          if (out[FIELD_DEFS[i][0]] === undefined) out[FIELD_DEFS[i][0]] = String(r[header] == null ? '' : r[header]).trim();
          break;
        }
      }
    });
    if (!out.name && !out.institution) return null;
    let uid = (out.name || '') + '|' + (out.institution || '');
    uid = uid.toLowerCase().replace(/\s+/g, ' ').trim();
    if (seen[uid]) { seen[uid] += 1; uid = uid + ' #' + seen[uid]; }
    else seen[uid] = 1;
    out.uid = uid;
    out.areas = detectAreas(out);
    out.location = detectLocation(out);
    out.emailDraft = buildEmail(out);
    return out;
  }).filter(Boolean);
}

/* ==================== Filtering & sorting ==================== */
function applyFilters() {
  const q = filters.q.trim().toLowerCase();
  const bm = bmSet();
  const list = rows.filter(function (r) {
    if (filters.bookmarked && !bm.has(r.uid)) return false;
    if (filters.priority !== 'all' && String(r.priority || '').toUpperCase() !== filters.priority) return false;
    if (filters.area !== 'all' && r.areas.indexOf(filters.area) === -1) return false;
    if (filters.location !== 'all' && r.location !== filters.location) return false;
    if (filters.status !== 'all' && bucketOf(r) !== filters.status) return false;
    if (q) {
      const hay = (r.name || '') + ' ' + (r.institution || '') + ' ' + (r.research || '') + ' ' + (r.angle || '') + ' ' + (r.role || '');
      if (hay.toLowerCase().indexOf(q) === -1) return false;
    }
    return true;
  });
  return sortList(list);
}

function sortList(list) {
  const order = { a: 0, b: 1, c: 2 };
  const byName = function (x, y) { return String(x.name || '').localeCompare(String(y.name || '')); };
  if (filters.sort === 'name') return list.slice().sort(byName);
  if (filters.sort === 'institution') return list.slice().sort(function (x, y) {
    return String(x.institution || '').localeCompare(String(y.institution || '')) || byName(x, y);
  });
  return list.slice().sort(function (x, y) {
    const px = order[String(x.priority || '').toLowerCase()];
    const py = order[String(y.priority || '').toLowerCase()];
    return ((px == null ? 9 : px) - (py == null ? 9 : py)) || byName(x, y);
  });
}

/* ==================== Rendering ==================== */
function fieldHTML(label, valueHTML) {
  return '<div class="field"><div class="field-label">' + label + '</div><div class="field-value">' + valueHTML + '</div></div>';
}

function cardHTML(row) {
  const uid = row.uid;
  const marked = bmSet().has(uid);
  const bucket = bucketOf(row);
  const ov = overridesMap()[uid] || '';
  const draft = draftsMap()[uid] != null ? draftsMap()[uid] : row.emailDraft;
  const parts = splitDraft(draft);
  const mailAddr = firstEmailOf(row);
  const mailHref = mailAddr
    ? 'mailto:' + encodeURIComponent(mailAddr) + '?subject=' + encodeURIComponent(parts.subject) + '&body=' + encodeURIComponent(parts.body)
    : '';

  let statusOptions = '';
  STATUS_OPTIONS.forEach(function (o) {
    statusOptions += '<option value="' + esc(o) + '"' + (ov === o ? ' selected' : '') + '>' + esc(o) + '</option>';
  });

  let fields = '';
  if (row.role) fields += fieldHTML('Role', esc(row.role));
  if (row.research) fields += fieldHTML('Research fit', esc(row.research));
  fields += fieldHTML('Areas', '<div class="chips">' + row.areas.map(function (a) { return '<span class="chip">' + esc(a) + '</span>'; }).join('') + '</div>');
  if (row.hiring) fields += fieldHTML('Hiring status', esc(row.hiring));
  if (row.email) fields += fieldHTML('Email', linkify(row.email, true));
  if (row.website) fields += fieldHTML('Website', linkify(row.website));
  if (row.profile) fields += fieldHTML('Profile / vacancy', linkify(row.profile));
  if (row.documents) fields += fieldHTML('How to apply', esc(row.documents));
  if (row.angle) fields += fieldHTML('Suggested angle', esc(row.angle));

  return (
    '<article class="card' + (openIds.has(uid) ? ' open' : '') + '" data-uid="' + esc(uid) + '">' +
      '<header class="card-head" data-action="toggle">' +
        '<button class="star' + (marked ? ' marked' : '') + '" data-action="bookmark" title="Bookmark" aria-label="Bookmark">' + starIcon(marked, 18) + '</button>' +
        '<div class="card-title">' +
          '<h3>' + esc(row.name || 'Untitled') + '</h3>' +
          '<p class="card-inst">' + esc(row.institution || '') + (row.location ? ' · <span class="loc">' + esc(row.location) + '</span>' : '') + '</p>' +
        '</div>' +
        '<div class="card-badges">' +
          (row.priority ? '<span class="badge prio-' + esc(String(row.priority).toLowerCase()) + '">' + esc(row.priority) + '</span>' : '') +
          '<span class="badge st-' + bucket + '">' + esc(BUCKET_LABELS[bucket] || bucket) + '</span>' +
          '<span class="chevron" data-action="toggle">' + icon('chevron', 14) + '</span>' +
        '</div>' +
      '</header>' +
      '<div class="card-details"><div class="card-inner"><div class="card-body">' +
        fields +
        '<div class="field"><div class="field-label">Contact status</div>' +
          '<select class="status-select" data-uid="' + esc(uid) + '"><option value="">— from sheet —</option>' + statusOptions + '</select>' +
        '</div>' +
        '<div class="field"><div class="field-label">Notes <span class="muted">(saved locally)</span></div>' +
          '<textarea class="notes" placeholder="Add your notes…">' + esc(notesMap()[uid] || '') + '</textarea>' +
        '</div>' +
        '<div class="field"><div class="field-label">Email draft <span class="muted">(editable — edits are saved)</span></div>' +
          '<textarea class="draft" spellcheck="false">' + esc(draft) + '</textarea>' +
          '<div class="draft-actions">' +
            '<button class="btn btn-primary" data-action="copy">' + icon('copy', 15) + ' Copy draft</button>' +
            (mailHref ? '<a class="btn btn-ghost" href="' + esc(mailHref) + '">' + icon('mail', 15) + ' Open in mail app</a>' : '') +
          '</div>' +
        '</div>' +
      '</div></div></div>' +
    '</article>'
  );
}

function renderList() {
  const list = applyFilters();
  if (expandAllState) list.forEach(function (r) { openIds.add(r.uid); });
  listEl.innerHTML = list.map(cardHTML).join('');
  emptyEl.hidden = list.length > 0;
  statsEl.innerHTML = '<strong>' + list.length + '</strong> of ' + rows.length + ' entries · <strong>' + bmSet().size + '</strong> bookmarked';
}

function fillSelect(sel, label, values, labelMap) {
  let html = '<option value="all">' + label + ' · All</option>';
  values.forEach(function (v) {
    html += '<option value="' + esc(v) + '">' + esc((labelMap && labelMap[v]) || v) + '</option>';
  });
  sel.innerHTML = html;
}

function populateSelects() {
  const uniq = function (arr) { return Array.from(new Set(arr)).filter(Boolean).sort(); };
  fillSelect($('#f-area'), 'Research area', uniq(rows.reduce(function (acc, r) { return acc.concat(r.areas); }, [])));
  fillSelect($('#f-location'), 'Location', uniq(rows.map(function (r) { return r.location; })));
  fillSelect($('#f-status'), 'Status', Object.keys(BUCKET_LABELS), BUCKET_LABELS);
}

/* ==================== Views ==================== */
function showDirectory() {
  uploadView.hidden = true;
  directoryView.hidden = false;
  populateSelects();
  renderList();
}

function showUpload() {
  directoryView.hidden = true;
  uploadView.hidden = false;
}

/* ==================== File operations ==================== */
function persistFiles() { store.set(LS.files, files); }
function persistAll() {
  store.set(LS.files, files);
  store.set(LS.bookmarks, bookmarksAll);
  store.set(LS.notes, notesAll);
  store.set(LS.statuses, statusesAll);
  store.set(LS.drafts, draftsAll);
}

function openFile(fid, focusUid) {
  const f = files[fid];
  if (!f) { toast('File not found.', true); return; }
  activeFileId = fid;
  f.lastAccessed = Date.now();
  persistFiles();
  store.set(LS.active, fid);
  rows = normalizeRows(f.raw);
  showDirectory();
  if (focusUid) {
    openIds.add(focusUid);
    renderList();
    requestAnimationFrame(function () {
      const card = listEl.querySelector('.card[data-uid="' + attrSel(focusUid) + '"]');
      if (card) {
        card.classList.add('open');
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }
}

function deleteFile(fid) {
  const name = files[fid] ? files[fid].name : 'file';
  delete files[fid];
  delete bookmarksAll[fid];
  delete notesAll[fid];
  delete statusesAll[fid];
  delete draftsAll[fid];
  persistAll();
  if (activeFileId === fid) {
    activeFileId = null;
    store.set(LS.active, null);
    showUpload();
  }
  toast('Deleted "' + name + '"');
}

/* ==================== File upload ==================== */
function handleFile(file) {
  if (!/\.(xlsx|xls)$/i.test(file.name)) { toast('Please choose an .xlsx or .xls file', true); return; }
  if (typeof XLSX === 'undefined') { toast('Excel library failed to load — check your internet connection.', true); return; }
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
      const sheetName = wb.SheetNames.find(function (n) { return /master/i.test(n); }) || wb.SheetNames[0];
      const raw = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });
      const parsed = normalizeRows(raw);
      if (!parsed.length) throw new Error('No data rows found in sheet "' + sheetName + '".');
      const fid = genId();
      const now = Date.now();
      files[fid] = {
        id: fid,
        name: file.name.replace(/\.(xlsx|xls)$/i, ''),
        raw: raw,
        count: parsed.length,
        uploadedAt: now,
        lastAccessed: now
      };
      persistFiles();
      openFile(fid);
      toast('Loaded ' + parsed.length + ' entries');
    } catch (err) {
      toast('Could not read file: ' + err.message, true);
    }
  };
  reader.onerror = function () { toast('Could not read the file.', true); };
  reader.readAsArrayBuffer(file);
}

/* ==================== Panels ==================== */
function openPanel(which) {
  closePanels();
  const p = which === 'files' ? $('#panel-files') : $('#panel-bookmarks');
  if (which === 'files') renderFileList();
  if (which === 'bookmarks') renderBookmarksPanel();
  p.hidden = false;
  document.body.classList.add('no-scroll');
}

function closePanels() {
  $('#panel-files').hidden = true;
  $('#panel-bookmarks').hidden = true;
  document.body.classList.remove('no-scroll');
}

function renderFileList() {
  const wrap = $('#file-list');
  const ids = Object.keys(files).sort(function (a, b) {
    return (files[b].lastAccessed || 0) - (files[a].lastAccessed || 0);
  });
  $('#files-empty').hidden = ids.length > 0;
  wrap.innerHTML = ids.map(function (fid) {
    const f = files[fid];
    const when = f.lastAccessed ? new Date(f.lastAccessed).toLocaleString() : '—';
    return (
      '<div class="file-row' + (fid === activeFileId ? ' active-file' : '') + '" data-fid="' + esc(fid) + '">' +
        '<div class="file-icon">' + icon('file', 20) + '</div>' +
        '<div class="file-info">' +
          '<span class="file-name">' + esc(f.name) + '</span>' +
          '<span class="file-meta">' + (f.count || 0) + ' entries · ' + esc(when) + '</span>' +
        '</div>' +
        '<div class="file-actions">' +
          '<button class="mini-btn" data-action="rename" title="Rename">' + icon('pencil', 15) + '</button>' +
          '<button class="mini-btn danger" data-action="delete" title="Delete">' + icon('trash', 15) + '</button>' +
        '</div>' +
      '</div>'
    );
  }).join('');
}

function startRename(row, fid) {
  const nameEl = row.querySelector('.file-name');
  if (!nameEl || row.querySelector('.rename-input')) return;
  const old = files[fid].name;
  nameEl.outerHTML = '<input class="rename-input" value="' + esc(old) + '" aria-label="File name" />';
  const input = row.querySelector('.rename-input');
  input.focus();
  input.select();
  let done = false;
  const commit = function () {
    if (done) return;
    done = true;
    const v = input.value.trim();
    if (v && v !== old) {
      files[fid].name = v;
      persistFiles();
      toast('Renamed to "' + v + '"');
    }
    renderFileList();
  };
  input.addEventListener('blur', commit);
  input.addEventListener('click', function (ev) { ev.stopPropagation(); });
  input.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter') input.blur();
    if (ev.key === 'Escape') { done = true; renderFileList(); }
  });
}

function confirmDeleteFile(fid) {
  const f = files[fid];
  if (!f) return;
  showConfirm({
    title: 'Delete file?',
    message: '"' + f.name + '" and its bookmarks, notes, statuses and drafts will be permanently removed.',
    okLabel: 'Delete',
    onOk: function () { deleteFile(fid); renderFileList(); }
  });
}

function renderBookmarksPanel() {
  const c = $('#bm-content');
  let html = '';
  const fids = Object.keys(files).sort(function (a, b) {
    return (files[b].lastAccessed || 0) - (files[a].lastAccessed || 0);
  });
  let total = 0;
  fids.forEach(function (fid) {
    const bms = bookmarksAll[fid] || [];
    if (!bms.length) return;
    const frows = normalizeRows(files[fid].raw);
    const marked = frows.filter(function (r) { return bms.indexOf(r.uid) !== -1; });
    if (!marked.length) return;
    total += marked.length;
    html += '<div class="bm-group">' +
      '<div class="bm-file">' + icon('file', 13) + ' ' + esc(files[fid].name) + '</div>' +
      marked.map(function (r) {
        return '<div class="bm-row" data-fid="' + esc(fid) + '" data-uid="' + esc(r.uid) + '">' +
          '<div class="bm-info"><span class="bm-name">' + esc(r.name) + '</span>' +
          '<span class="bm-inst">' + esc(r.institution || '') + '</span></div>' +
          '<button class="mini-btn bm-on" data-action="unbm" title="Remove bookmark">' + starIcon(true, 16) + '</button>' +
        '</div>';
      }).join('') +
    '</div>';
  });
  if (!total) {
    html = '<div class="panel-empty">' + starIcon(false, 30) +
      '<p>No bookmarks yet.</p><p class="sub">Tap the star on any entry to bookmark it.</p></div>';
  }
  c.innerHTML = html;
}

/* ==================== Confirm modal ==================== */
let modalOnOk = null;

function showConfirm(opts) {
  $('#modal-title').textContent = opts.title;
  $('#modal-message').textContent = opts.message;
  $('#modal-ok').textContent = opts.okLabel || 'Confirm';
  modalOnOk = opts.onOk;
  $('#modal').hidden = false;
  document.body.classList.add('no-scroll');
}

function hideModal() {
  $('#modal').hidden = true;
  modalOnOk = null;
  if ($('#panel-files').hidden && $('#panel-bookmarks').hidden) {
    document.body.classList.remove('no-scroll');
  }
}

/* ==================== Events: upload ==================== */
['dragenter', 'dragover'].forEach(function (ev) {
  dropzone.addEventListener(ev, function (e) { e.preventDefault(); dropzone.classList.add('drag'); });
});
['dragleave', 'drop'].forEach(function (ev) {
  dropzone.addEventListener(ev, function (e) { e.preventDefault(); dropzone.classList.remove('drag'); });
});
dropzone.addEventListener('drop', function (e) { const f = e.dataTransfer.files[0]; if (f) handleFile(f); });
dropzone.addEventListener('click', function () { fileInput.click(); });
dropzone.addEventListener('keydown', function (e) {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
});
fileInput.addEventListener('change', function () {
  if (fileInput.files[0]) handleFile(fileInput.files[0]);
  fileInput.value = '';
});

/* ==================== Events: directory ==================== */
listEl.addEventListener('click', function (e) {
  const actionEl = e.target.closest('[data-action]');
  if (!actionEl) return;
  const card = actionEl.closest('.card');
  if (!card) return;
  const uid = card.dataset.uid;
  const action = actionEl.dataset.action;

  if (action === 'toggle') {
    if (openIds.has(uid)) { openIds.delete(uid); card.classList.remove('open'); }
    else { openIds.add(uid); card.classList.add('open'); }
  } else if (action === 'bookmark') {
    const arr = bookmarksAll[activeFileId] || (bookmarksAll[activeFileId] = []);
    const i = arr.indexOf(uid);
    if (i === -1) arr.push(uid); else arr.splice(i, 1);
    store.set(LS.bookmarks, bookmarksAll);
    renderList();
  } else if (action === 'copy') {
    const ta = card.querySelector('.draft');
    if (ta) copyText(ta.value, actionEl);
  }
});

listEl.addEventListener('input', function (e) {
  const el = e.target;
  const card = el.closest('.card');
  if (!card) return;
  const uid = card.dataset.uid;
  if (el.classList.contains('notes')) {
    if (!notesAll[activeFileId]) notesAll[activeFileId] = {};
    notesAll[activeFileId][uid] = el.value;
    store.set(LS.notes, notesAll);
  } else if (el.classList.contains('draft')) {
    if (!draftsAll[activeFileId]) draftsAll[activeFileId] = {};
    draftsAll[activeFileId][uid] = el.value;
    store.set(LS.drafts, draftsAll);
  }
});

listEl.addEventListener('change', function (e) {
  const el = e.target;
  if (!el.classList.contains('status-select')) return;
  const uid = el.dataset.uid || (el.closest('.card') && el.closest('.card').dataset.uid);
  if (!uid) return;
  if (!statusesAll[activeFileId]) statusesAll[activeFileId] = {};
  statusesAll[activeFileId][uid] = el.value;
  store.set(LS.statuses, statusesAll);
  renderList();
});

$('#f-search').addEventListener('input', function (e) { filters.q = e.target.value; renderList(); });

const FILTER_MAP = { 'f-priority': 'priority', 'f-area': 'area', 'f-location': 'location', 'f-status': 'status', 'f-sort': 'sort' };
Object.keys(FILTER_MAP).forEach(function (id) {
  $('#' + id).addEventListener('change', function (e) { filters[FILTER_MAP[id]] = e.target.value; renderList(); });
});

$('#f-bookmarked').addEventListener('click', function () {
  filters.bookmarked = !filters.bookmarked;
  $('#f-bookmarked').classList.toggle('active', filters.bookmarked);
  $('#f-bookmarked').setAttribute('aria-pressed', String(filters.bookmarked));
  renderList();
});

$('#btn-expand-all').addEventListener('click', function () {
  expandAllState = !expandAllState;
  if (!expandAllState) openIds.clear();
  $('#btn-expand-all').textContent = expandAllState ? 'Collapse all' : 'Expand all';
  renderList();
});

function resetFilters() {
  filters.q = ''; filters.priority = 'all'; filters.area = 'all';
  filters.location = 'all'; filters.status = 'all'; filters.bookmarked = false; filters.sort = 'priority';
  $('#f-search').value = '';
  $('#f-priority').value = 'all';
  $('#f-area').value = 'all';
  $('#f-location').value = 'all';
  $('#f-status').value = 'all';
  $('#f-sort').value = 'priority';
  $('#f-bookmarked').classList.remove('active');
  $('#f-bookmarked').setAttribute('aria-pressed', 'false');
  renderList();
}
$('#f-reset').addEventListener('click', resetFilters);
$('#btn-empty-reset').addEventListener('click', resetFilters);

/* ==================== Events: topbar & panels ==================== */
$('#btn-add').addEventListener('click', function () { closePanels(); showUpload(); });

$('#btn-clear').addEventListener('click', function () {
  showConfirm({
    title: 'Clear all data?',
    message: 'All files, bookmarks, notes, statuses and drafts will be permanently removed from this browser.',
    okLabel: 'Clear everything',
    onOk: function () {
      Object.values(LS).forEach(function (k) { store.remove(k); });
      location.reload();
    }
  });
});

$('#btn-bookmarks').addEventListener('click', function () { openPanel('bookmarks'); });
$('#btn-files').addEventListener('click', function () { openPanel('files'); });
$('#panel-add-file').addEventListener('click', function () { closePanels(); showUpload(); });

document.querySelectorAll('[data-close-panel]').forEach(function (el) {
  el.addEventListener('click', closePanels);
});

$('#file-list').addEventListener('click', function (e) {
  const row = e.target.closest('.file-row');
  if (!row) return;
  const fid = row.dataset.fid;
  const btn = e.target.closest('[data-action]');
  if (btn) {
    if (btn.dataset.action === 'rename') startRename(row, fid);
    else if (btn.dataset.action === 'delete') confirmDeleteFile(fid);
    return;
  }
  closePanels();
  openFile(fid);
});

$('#bm-content').addEventListener('click', function (e) {
  const row = e.target.closest('.bm-row');
  if (!row) return;
  const fid = row.dataset.fid;
  const uid = row.dataset.uid;
  const btn = e.target.closest('[data-action="unbm"]');
  if (btn) {
    const arr = bookmarksAll[fid] || [];
    const i = arr.indexOf(uid);
    if (i !== -1) arr.splice(i, 1);
    store.set(LS.bookmarks, bookmarksAll);
    renderBookmarksPanel();
    if (fid === activeFileId) renderList();
    toast('Bookmark removed');
    return;
  }
  closePanels();
  openFile(fid, uid);
});

$('#modal-ok').addEventListener('click', function () {
  const cb = modalOnOk;
  hideModal();
  if (cb) cb();
});
$('#modal-cancel').addEventListener('click', hideModal);
$('#modal .modal-backdrop').addEventListener('click', hideModal);

document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape') return;
  if (!$('#modal').hidden) { hideModal(); return; }
  closePanels();
});

/* ==================== Resume & theme ==================== */
$('#btn-resume').addEventListener('click', function () {
  if (resumeFileId) openFile(resumeFileId);
});
$('#btn-all-files').addEventListener('click', function () { openPanel('files'); });

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  $('#theme-toggle').innerHTML = icon(t === 'dark' ? 'sun' : 'moon', 18);
}
$('#theme-toggle').addEventListener('click', function () {
  const t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(t);
  store.set(LS.theme, t);
});

/* ==================== Init ==================== */
(function init() {
  const savedTheme = store.get(LS.theme, null);
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(savedTheme || (prefersDark ? 'dark' : 'light'));

  const ids = Object.keys(files);
  if (ids.length) {
    let rf = (activeFileId && files[activeFileId]) ? activeFileId : null;
    if (!rf) {
      rf = ids.slice().sort(function (a, b) {
        return (files[b].lastAccessed || 0) - (files[a].lastAccessed || 0);
      })[0];
    }
    resumeFileId = rf;
    const f = files[rf];
    $('#resume-card').hidden = false;
    const when = f.lastAccessed ? new Date(f.lastAccessed).toLocaleString() : '—';
    $('#resume-meta').textContent = f.name + ' · ' + (f.count || 0) + ' entries · ' + when;
  }
})();
