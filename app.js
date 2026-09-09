'use strict';

/* ==================== Storage ==================== */
const LS = {
  files: 'edutract:files',
  active: 'edutract:activeFile',
  view: 'edutract:view',
  bookmarks: 'edutract:bookmarks',
  notes: 'edutract:notes',
  statuses: 'edutract:statuses',
  drafts: 'edutract:drafts',
  emails: 'edutract:emails',
  theme: 'edutract:theme'
};

const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); }
    catch (e) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  },
  remove(key) { try { localStorage.removeItem(key); } catch (e) {} }
};

function genId() {
  return 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

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
  } catch (e) {}
}

migrateOld();

/* ==================== Icons ==================== */
function svgWrap(inner, size, fill) {
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="' + (fill || 'none') + '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>';
}
const I = {
  moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  pencil: '<path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>',
  chevron: '<polyline points="6 9 12 15 18 9"/>',
  chevronsDown: '<polyline points="7 13 12 18 17 13"/><polyline points="7 6 12 11 17 6"/>',
  chevronsUp: '<polyline points="7 11 12 6 17 11"/><polyline points="7 18 12 13 17 18"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  mail: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
  send: '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  arrowLeft: '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>'
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
let emailsAll = store.get(LS.emails, {}) || {};
let resumeFileId = null;

let rows = [];
let openIds = new Set();
let expandAllState = false;
const filters = { q: '', priority: 'all', area: 'all', location: 'all', status: 'all', bookmarked: false, sort: 'priority' };

/* ==================== Status (user-set, default Saved) ==================== */
const STATUS_VALUES = ['Saved', 'Ready', 'Contacted', 'Followed', 'Responded', 'Applied', 'Interview', 'Accepted', 'Rejected', 'No response'];
const CHIP_CLASS = {
  'Saved': 'st-saved',
  'Ready': 'st-ready',
  'Contacted': 'st-contacted',
  'Followed': 'st-followed',
  'Responded': 'st-responded',
  'Applied': 'st-applied',
  'Interview': 'st-interview',
  'Accepted': 'st-accepted',
  'Rejected': 'st-rejected',
  'No response': 'st-no-response'
};

function statusOf(fid, uid) { return (statusesAll[fid] || {})[uid] || ''; }

(function migrateStatuses() {
  const M = { 'Not contacted': 'Saved', 'Emailed': 'Contacted', 'Interview scheduled': 'Interview' };
  let changed = false;
  Object.keys(statusesAll).forEach(function (fid) {
    const m = statusesAll[fid];
    Object.keys(m).forEach(function (uid) {
      let v = m[uid];
      if (M[v]) v = M[v];
      if (STATUS_VALUES.indexOf(v) === -1) v = 'Saved';
      if (v !== m[uid]) { m[uid] = v; changed = true; }
    });
  });
  if (changed) store.set(LS.statuses, statusesAll);
})();

function emailOf(fid, uid, row) {
  const ov = (emailsAll[fid] || {})[uid];
  if (ov != null && String(ov).trim() !== '') return String(ov).trim();
  return firstEmailOf(row);
}

/* ==================== DOM refs ==================== */
const $ = (s) => document.querySelector(s);
const uploadView = $('#upload-view');
const directoryView = $('#directory-view');
const bookmarksView = $('#bookmarks-view');
const toolbarEl = $('#toolbar');
const bmPageHeadEl = $('#bm-page-head');
const bmCountChip = $('#bm-count-chip');
const resumeCard = $('#resume-card');
const dropzone = $('#dropzone');
const fileInput = $('#file-input');
const listEl = $('#list');
const bmListEl = $('#bm-list');
const emptyEl = $('#empty');
const statsEl = $('#stats');

/* ==================== Column mapping ==================== */
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

/* ==================== Helpers ==================== */
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    if (c === '&') return '&' + 'amp;';
    if (c === '<') return '&' + 'lt;';
    if (c === '>') return '&' + 'gt;';
    if (c === '"') return '&' + 'quot;';
    return '&' + '#39;';
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

function positionMenu(menu, anchor) {
  const rect = anchor.getBoundingClientRect();
  const mw = menu.offsetWidth;
  const mh = menu.offsetHeight;
  let left = Math.max(8, Math.min(rect.left, window.innerWidth - mw - 8));
  let top = rect.bottom + 6;
  if (top + mh > window.innerHeight - 8) top = Math.max(8, rect.top - mh - 6);
  menu.style.top = top + 'px';
  menu.style.left = left + 'px';
}

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
    toast('Copy failed. Please select the text manually.', true);
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
    'Subject: Prospective PhD applicant - ' + who,
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
  const bm = new Set(bookmarksAll[activeFileId] || []);
  const list = rows.filter(function (r) {
    if (filters.bookmarked && !bm.has(r.uid)) return false;
    if (filters.priority !== 'all' && String(r.priority || '').toUpperCase() !== filters.priority) return false;
    if (filters.area !== 'all' && r.areas.indexOf(filters.area) === -1) return false;
    if (filters.location !== 'all' && r.location !== filters.location) return false;
    if (filters.status !== 'all' && (statusOf(activeFileId, r.uid) || 'Saved') !== filters.status) return false;
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

function cardHTML(row, fid, opts) {
  opts = opts || {};
  const uid = row.uid;
  const marked = (bookmarksAll[fid] || []).indexOf(row.uid) !== -1;
  const ov = statusOf(fid, uid) || 'Saved';
  const df = draftsAll[fid] || {};
  const draft = df[uid] != null ? df[uid] : row.emailDraft;
  const nt = notesAll[fid] || {};
  const currentEmail = emailOf(fid, uid, row);
  const parts = splitDraft(draft);
  const mailHref = currentEmail
    ? 'mailto:' + encodeURIComponent(currentEmail) + '?subject=' + encodeURIComponent(parts.subject) + '&body=' + encodeURIComponent(parts.body)
    : '';

  let fields = '';
  if (row.role) fields += fieldHTML('Role', esc(row.role));
  if (row.research) fields += fieldHTML('Research fit', esc(row.research));
  fields += fieldHTML('Areas', '<div class="chips">' + row.areas.map(function (a) { return '<span class="chip">' + esc(a) + '</span>'; }).join('') + '</div>');
  if (row.hiring) fields += fieldHTML('Hiring status', esc(row.hiring));
  fields += '<div class="field"><div class="field-label">Email</div><div class="field-value email-value" data-email="' + esc(currentEmail) + '">' +
    (currentEmail ? linkify(currentEmail, true) : '<span class="muted">Not set</span>') +
    ' <button type="button" class="mini-btn inline-edit" data-action="editemail" title="Edit email" aria-label="Edit email">' + icon('pencil', 13) + '</button>' +
  '</div></div>';
  if (row.website) fields += fieldHTML('Website', linkify(row.website));
  if (row.profile) fields += fieldHTML('Profile / vacancy', linkify(row.profile));
  if (row.documents) fields += fieldHTML('How to apply', esc(row.documents));
  if (row.angle) fields += fieldHTML('Suggested angle', esc(row.angle));

  return (
    '<article class="card' + (openIds.has(uid) ? ' open' : '') + '" data-uid="' + esc(uid) + '" data-fid="' + esc(fid) + '">' +
      '<header class="card-head" data-action="toggle">' +
        '<button class="star' + (marked ? ' marked' : '') + '" data-action="bookmark" title="Bookmark" aria-label="Bookmark">' + starIcon(marked, 18) + '</button>' +
        '<div class="card-title">' +
          '<h3>' + esc(row.name || 'Untitled') + '</h3>' +
          '<p class="card-inst">' + esc(row.institution || '') + (row.location ? ' · <span class="loc">' + esc(row.location) + '</span>' : '') + '</p>' +
        '</div>' +
        '<div class="card-badges">' +
          (row.priority ? '<span class="badge prio-' + esc(String(row.priority).toLowerCase()) + '">' + esc(row.priority) + '</span>' : '') +
          '<button type="button" class="status-chip ' + (CHIP_CLASS[ov] || 'st-saved') + '" data-action="statusmenu" data-uid="' + esc(uid) + '" title="Change status" aria-label="Change status">' + esc(ov) + '</button>' +
          (opts.showFile && files[fid] ? '<span class="badge file-badge" title="' + esc(files[fid].name) + '">' + esc(files[fid].name) + '</span>' : '') +
          '<span class="chevron" data-action="toggle">' + icon('chevron', 14) + '</span>' +
        '</div>' +
      '</header>' +
      '<div class="card-details"><div class="card-inner"><div class="card-body">' +
        fields +
        '<div class="field"><div class="field-label">Notes <span class="muted">(saved locally)</span></div>' +
          '<textarea class="notes" placeholder="Add your notes">' + esc(nt[uid] || '') + '</textarea>' +
        '</div>' +
        '<div class="field"><div class="field-label">Email draft <span class="muted">(editable, edits are saved)</span></div>' +
          '<textarea class="draft" spellcheck="false">' + esc(draft) + '</textarea>' +
          '<div class="draft-actions">' +
            (mailHref ? '<a class="btn btn-primary" href="' + esc(mailHref) + '">' + icon('send', 15) + ' Send</a>' : '') +
            '<button class="btn btn-ghost" data-action="copy">' + icon('copy', 15) + ' Copy draft</button>' +
            (opts.showFile ? '<button class="btn btn-ghost" data-action="openfile">' + icon('arrowLeft', 15) + ' Open in file</button>' : '') +
          '</div>' +
        '</div>' +
      '</div></div></div>' +
    '</article>'
  );
}

function renderList() {
  const list = applyFilters();
  if (expandAllState) list.forEach(function (r) { openIds.add(r.uid); });
  listEl.innerHTML = list.map(function (r) { return cardHTML(r, activeFileId); }).join('');
  emptyEl.hidden = list.length > 0;
  statsEl.innerHTML = '<strong>' + list.length + '</strong> of ' + rows.length + ' entries · <strong>' + (bookmarksAll[activeFileId] || []).length + '</strong> bookmarked';
}

function renderBookmarksPage() {
  const q = filters.q.trim().toLowerCase();
  const order = { a: 0, b: 1, c: 2 };
  const entries = [];
  Object.keys(files).forEach(function (fid) {
    const bms = bookmarksAll[fid] || [];
    if (!bms.length) return;
    normalizeRows(files[fid].raw).forEach(function (r) {
      if (bms.indexOf(r.uid) !== -1) entries.push({ r: r, fid: fid });
    });
  });
  const filtered = entries.filter(function (e) {
    const r = e.r;
    if (filters.priority !== 'all' && String(r.priority || '').toUpperCase() !== filters.priority) return false;
    if (filters.area !== 'all' && r.areas.indexOf(filters.area) === -1) return false;
    if (filters.location !== 'all' && r.location !== filters.location) return false;
    if (filters.status !== 'all' && (statusOf(e.fid, r.uid) || 'Saved') !== filters.status) return false;
    if (q) {
      const hay = (r.name || '') + ' ' + (r.institution || '') + ' ' + (r.research || '') + ' ' + (r.angle || '') + ' ' + (r.role || '');
      if (hay.toLowerCase().indexOf(q) === -1) return false;
    }
    return true;
  });
  filtered.sort(function (x, y) {
    if (filters.sort === 'name') return String(x.r.name || '').localeCompare(String(y.r.name || ''));
    if (filters.sort === 'institution') return String(x.r.institution || '').localeCompare(String(y.r.institution || ''));
    const px = order[String(x.r.priority || '').toLowerCase()];
    const py = order[String(y.r.priority || '').toLowerCase()];
    return ((px == null ? 9 : px) - (py == null ? 9 : py)) || String(x.r.name || '').localeCompare(String(y.r.name || ''));
  });
  if (expandAllState) filtered.forEach(function (e) { openIds.add(e.r.uid); });
  bmListEl.innerHTML = filtered.map(function (e) { return cardHTML(e.r, e.fid, { showFile: true }); }).join('');
  $('#bm-empty').hidden = filtered.length > 0;
  bmCountChip.textContent = filtered.length + ' of ' + entries.length;
}

function currentViewEntries() {
  if (!bookmarksView.hidden) {
    const pairs = [];
    Object.keys(files).forEach(function (fid) {
      const bms = bookmarksAll[fid] || [];
      if (!bms.length) return;
      normalizeRows(files[fid].raw).forEach(function (r) {
        if (bms.indexOf(r.uid) !== -1) pairs.push({ r: r, fid: fid });
      });
    });
    return pairs;
  }
  return rows.map(function (r) { return { r: r, fid: activeFileId }; });
}

/* ==================== Custom filter dropdowns ==================== */
const SORT_OPTIONS = [
  { v: 'priority', l: 'Priority' },
  { v: 'name', l: 'Name A-Z' },
  { v: 'institution', l: 'Institution' }
];
const DD_DEFS = [
  { id: 'dd-priority', key: 'priority', label: 'Priority' },
  { id: 'dd-area', key: 'area', label: 'Area' },
  { id: 'dd-location', key: 'location', label: 'Location' },
  { id: 'dd-status', key: 'status', label: 'Status' },
  { id: 'dd-sort', key: 'sort', label: 'Sort' }
];
const ddOptions = {
  priority: [],
  area: [],
  location: [],
  status: STATUS_VALUES.slice(),
  sort: SORT_OPTIONS.map(function (o) { return o.v; })
};

function ddValueLabel(key, v) {
  if (key === 'sort') {
    for (let i = 0; i < SORT_OPTIONS.length; i++) {
      if (SORT_OPTIONS[i].v === v) return SORT_OPTIONS[i].l;
    }
  }
  return v;
}

function renderDDTriggers() {
  DD_DEFS.forEach(function (def) {
    const el = $('#' + def.id);
    if (!el) return;
    const v = filters[def.key];
    const label = v === 'all' ? def.label : ddValueLabel(def.key, v);
    el.innerHTML = '<button type="button" class="dd-trigger' + (v !== 'all' ? ' has-value' : '') + '" data-dd="' + def.key + '" aria-haspopup="listbox">' +
      '<span class="dd-text">' + esc(label) + '</span>' + icon('chevron', 13) +
    '</button>';
  });
}

function closeDropdown() {
  const m = document.getElementById('dd-menu');
  if (m) m.remove();
}

function openDropdown(key, trigger) {
  closeDropdown();
  const menu = document.createElement('div');
  menu.className = 'dd-menu';
  menu.id = 'dd-menu';
  menu.dataset.key = key;
  let html = '';
  if (key !== 'sort') {
    html += '<button type="button" class="dd-item' + (filters[key] === 'all' ? ' current' : '') + '" data-value="all">All</button>';
  }
  ddOptions[key].forEach(function (v) {
    html += '<button type="button" class="dd-item' + (filters[key] === v ? ' current' : '') + '" data-value="' + esc(v) + '">' + esc(ddValueLabel(key, v)) + '</button>';
  });
  menu.innerHTML = html;
  document.body.appendChild(menu);
  positionMenu(menu, trigger);
  menu.addEventListener('click', function (e) {
    const item = e.target.closest('.dd-item');
    if (!item) return;
    filters[key] = item.dataset.value;
    closeDropdown();
    renderDDTriggers();
    rerenderCurrent();
  });
}

function populateSelects() {
  const pairs = currentViewEntries();
  const areas = [];
  const locations = [];
  const prios = [];
  pairs.forEach(function (p) {
    (p.r.areas || []).forEach(function (a) { if (areas.indexOf(a) === -1) areas.push(a); });
    if (p.r.location && locations.indexOf(p.r.location) === -1) locations.push(p.r.location);
    const pr = String(p.r.priority || '').toUpperCase();
    if (pr && prios.indexOf(pr) === -1) prios.push(pr);
  });
  areas.sort();
  locations.sort();
  const prioOrder = ['A', 'B', 'C'];
  prios.sort(function (a, b) { return prioOrder.indexOf(a) - prioOrder.indexOf(b); });
  ddOptions.priority = prios;
  ddOptions.area = areas;
  ddOptions.location = locations;
  ddOptions.status = STATUS_VALUES.slice();
  ['priority', 'area', 'location'].forEach(function (key) {
    if (filters[key] !== 'all' && ddOptions[key].indexOf(filters[key]) === -1) filters[key] = 'all';
  });
  renderDDTriggers();
}

/* ==================== Views ==================== */
function syncNav() {
  const landing = !uploadView.hidden;
  $('#btn-add').hidden = landing;
  $('#btn-bookmarks').hidden = landing;
  $('#btn-files').hidden = landing;
  $('#btn-bookmarks').classList.toggle('active', !bookmarksView.hidden);
  syncInstallBtn();
}

function showView(which) {
  uploadView.hidden = which !== 'upload';
  directoryView.hidden = which !== 'directory';
  bookmarksView.hidden = which !== 'bookmarks';
  toolbarEl.hidden = which === 'upload';
  bmPageHeadEl.hidden = which !== 'bookmarks';
  statsEl.hidden = which === 'bookmarks';
  $('#f-bookmarked').hidden = which === 'bookmarks';
  store.set(LS.view, which);
  syncNav();
}

function showDirectory() {
  showView('directory');
  populateSelects();
  renderList();
}

function showBookmarks() {
  showView('bookmarks');
  populateSelects();
  renderBookmarksPage();
}

function showUpload() {
  showView('upload');
  updateResumeCard();
}

function updateResumeCard() {
  const ids = Object.keys(files);
  if (!ids.length) { resumeCard.hidden = true; return; }
  let rf = (activeFileId && files[activeFileId]) ? activeFileId :
    ids.slice().sort(function (a, b) { return (files[b].lastAccessed || 0) - (files[a].lastAccessed || 0); })[0];
  resumeFileId = rf;
  const f = files[rf];
  resumeCard.hidden = false;
  $('#resume-meta').textContent = f.name + ' · ' + (f.count || 0) + ' entries · ' + (f.lastAccessed ? new Date(f.lastAccessed).toLocaleString() : '-');
}

function backFromBookmarks() {
  if (activeFileId && files[activeFileId]) showDirectory();
  else showUpload();
}

function rerenderCurrent() {
  if (!directoryView.hidden) renderList();
  else if (!bookmarksView.hidden) renderBookmarksPage();
}

/* ==================== Status menu ==================== */
function closeStatusMenu() {
  const menu = document.getElementById('status-menu');
  if (menu) menu.remove();
}

function setStatus(fid, uid, value) {
  if (!statusesAll[fid]) statusesAll[fid] = {};
  statusesAll[fid][uid] = value;
  store.set(LS.statuses, statusesAll);
  rerenderCurrent();
}

function openStatusMenu(btn, fid, uid) {
  closeStatusMenu();
  const current = statusOf(fid, uid) || 'Saved';
  const menu = document.createElement('div');
  menu.className = 'status-menu';
  menu.id = 'status-menu';
  menu.dataset.uid = uid;
  menu.dataset.fid = fid;
  let html = '<div class="status-menu-top"><button type="button" class="status-menu-close" aria-label="Close menu">' + icon('x', 13) + '</button></div>';
  html += '<div class="status-menu-items">';
  STATUS_VALUES.forEach(function (v) {
    html += '<button type="button" class="status-menu-item ' + (CHIP_CLASS[v] || '') + (v === current ? ' current' : '') + '" data-value="' + esc(v) + '">' + esc(v) + '</button>';
  });
  html += '</div>';
  menu.innerHTML = html;
  document.body.appendChild(menu);
  menu.querySelector('.status-menu-close').addEventListener('click', function (e) {
    e.stopPropagation();
    closeStatusMenu();
  });
  positionMenu(menu, btn);
  menu.addEventListener('click', function (e) {
    const item = e.target.closest('.status-menu-item');
    if (!item) return;
    setStatus(fid, uid, item.dataset.value);
    closeStatusMenu();
  });
}

/* ==================== Email editing ==================== */
function startEmailEdit(wrap, fid, uid, current) {
  if (!wrap || wrap.querySelector('.email-input')) return;
  wrap.innerHTML = '<input class="email-input" type="email" value="' + esc(current) + '" placeholder="name@example.com" aria-label="Email address" />' +
    '<span class="email-edit-hint">Enter to save · Esc to cancel</span>';
  const input = wrap.querySelector('.email-input');
  input.focus();
  input.select();
  let done = false;
  const finish = function (save) {
    if (done) return;
    done = true;
    if (save) {
      if (!emailsAll[fid]) emailsAll[fid] = {};
      emailsAll[fid][uid] = input.value.trim();
      store.set(LS.emails, emailsAll);
      toast('Email saved');
    }
    rerenderCurrent();
  };
  input.addEventListener('blur', function () { finish(true); });
  input.addEventListener('click', function (ev) { ev.stopPropagation(); });
  input.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter') { ev.preventDefault(); input.blur(); }
    if (ev.key === 'Escape') { done = true; rerenderCurrent(); }
  });
}

/* ==================== File operations ==================== */
function persistFiles() { store.set(LS.files, files); }

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
  delete emailsAll[fid];
  store.set(LS.files, files);
  store.set(LS.bookmarks, bookmarksAll);
  store.set(LS.notes, notesAll);
  store.set(LS.statuses, statusesAll);
  store.set(LS.drafts, draftsAll);
  store.set(LS.emails, emailsAll);
  if (activeFileId === fid) {
    activeFileId = null;
    store.set(LS.active, null);
    showView('upload');
    updateResumeCard();
  }
  toast('Deleted "' + name + '"');
}

/* ==================== File upload ==================== */
function handleFile(file) {
  if (!/\.(xlsx|xls)$/i.test(file.name)) { toast('Please choose an .xlsx or .xls file', true); return; }
  if (typeof XLSX === 'undefined') { toast('Excel library failed to load. Check your internet connection.', true); return; }
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

/* ==================== File manager panel ==================== */
function openPanel() {
  closePanels();
  renderFileList();
  $('#panel-files').hidden = false;
  document.body.classList.add('no-scroll');
}

function closePanels() {
  $('#panel-files').hidden = true;
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
    const when = f.lastAccessed ? new Date(f.lastAccessed).toLocaleString() : '-';
    return (
      '<div class="file-row' + (fid === activeFileId ? ' active-file' : '') + '" data-fid="' + esc(fid) + '">' +
        '<div class="file-info">' +
          '<div class="file-line1">' +
            '<span class="file-name">' + esc(f.name) + '</span>' +
            '<span class="file-actions">' +
              '<button class="mini-btn" data-action="rename" title="Rename">' + icon('pencil', 15) + '</button>' +
              '<button class="mini-btn danger" data-action="delete" title="Delete">' + icon('trash', 15) + '</button>' +
            '</span>' +
          '</div>' +
          '<div class="file-line2">' +
            '<span class="file-meta">' + (f.count || 0) + ' entries · ' + esc(when) + '</span>' +
            '<button class="btn btn-ghost btn-open-file" data-action="open">Open</button>' +
          '</div>' +
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
  if ($('#panel-files').hidden) {
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

/* ==================== Events: cards ==================== */
function cardClickHandler(e) {
  const actionEl = e.target.closest('[data-action]');
  if (!actionEl) return;
  const card = actionEl.closest('.card');
  if (!card) return;
  const uid = card.dataset.uid;
  const fid = card.dataset.fid;
  const action = actionEl.dataset.action;

  if (action === 'statusmenu') {
    const menu = document.getElementById('status-menu');
    if (menu && menu.dataset.uid === uid && menu.dataset.fid === fid) {
      closeStatusMenu();
    } else {
      openStatusMenu(actionEl, fid, uid);
    }
    return;
  }

  if (action === 'editemail') {
    const wrap = actionEl.closest('.email-value');
    if (wrap) startEmailEdit(wrap, fid, uid, wrap.dataset.email || '');
    return;
  }

  if (action === 'toggle') {
    if (openIds.has(uid)) { openIds.delete(uid); card.classList.remove('open'); }
    else { openIds.add(uid); card.classList.add('open'); }
  } else if (action === 'bookmark') {
    if (!bookmarksAll[fid]) bookmarksAll[fid] = [];
    const arr = bookmarksAll[fid];
    const i = arr.indexOf(uid);
    if (i === -1) arr.push(uid); else arr.splice(i, 1);
    store.set(LS.bookmarks, bookmarksAll);
    populateSelects();
    rerenderCurrent();
  } else if (action === 'copy') {
    const ta = card.querySelector('.draft');
    if (ta) copyText(ta.value, actionEl);
  } else if (action === 'openfile') {
    openFile(fid, uid);
  }
}

function cardInputHandler(e) {
  const el = e.target;
  const card = el.closest('.card');
  if (!card) return;
  const uid = card.dataset.uid;
  const fid = card.dataset.fid;
  if (el.classList.contains('notes')) {
    if (!notesAll[fid]) notesAll[fid] = {};
    notesAll[fid][uid] = el.value;
    store.set(LS.notes, notesAll);
  } else if (el.classList.contains('draft')) {
    if (!draftsAll[fid]) draftsAll[fid] = {};
    draftsAll[fid][uid] = el.value;
    store.set(LS.drafts, draftsAll);
  }
}

[listEl, bmListEl].forEach(function (el) {
  el.addEventListener('click', cardClickHandler);
  el.addEventListener('input', cardInputHandler);
});

/* ==================== Events: shared toolbar ==================== */
$('#f-search').addEventListener('input', function (e) { filters.q = e.target.value; rerenderCurrent(); });

toolbarEl.addEventListener('click', function (e) {
  const trig = e.target.closest('.dd-trigger');
  if (!trig) return;
  const key = trig.dataset.dd;
  const menu = document.getElementById('dd-menu');
  if (menu && menu.dataset.key === key) { closeDropdown(); return; }
  openDropdown(key, trig);
});

$('#f-bookmarked').addEventListener('click', function () {
  filters.bookmarked = !filters.bookmarked;
  $('#f-bookmarked').classList.toggle('active', filters.bookmarked);
  $('#f-bookmarked').setAttribute('aria-pressed', String(filters.bookmarked));
  rerenderCurrent();
});

$('#btn-expand-all').addEventListener('click', function () {
  expandAllState = !expandAllState;
  if (!expandAllState) openIds.clear();
  this.innerHTML = icon(expandAllState ? 'chevronsUp' : 'chevronsDown', 16);
  this.title = expandAllState ? 'Collapse all' : 'Expand all';
  this.setAttribute('aria-label', this.title);
  rerenderCurrent();
});

function resetFilters() {
  filters.q = ''; filters.priority = 'all'; filters.area = 'all';
  filters.location = 'all'; filters.status = 'all'; filters.bookmarked = false; filters.sort = 'priority';
  $('#f-search').value = '';
  $('#f-bookmarked').classList.remove('active');
  $('#f-bookmarked').setAttribute('aria-pressed', 'false');
  renderDDTriggers();
  rerenderCurrent();
}
$('#f-reset').addEventListener('click', resetFilters);
$('#btn-empty-reset').addEventListener('click', resetFilters);

/* ==================== Events: topbar, home, panels ==================== */
$('#btn-add').addEventListener('click', function () { closePanels(); fileInput.click(); });

$('#btn-bookmarks').addEventListener('click', function () {
  if (!bookmarksView.hidden) { backFromBookmarks(); return; }
  showBookmarks();
});

$('#btn-back-dir').addEventListener('click', backFromBookmarks);

$('#btn-files').addEventListener('click', openPanel);
$('#panel-add-file').addEventListener('click', function () { closePanels(); fileInput.click(); });

$('#brand-home').addEventListener('click', function () {
  closePanels();
  closeStatusMenu();
  showUpload();
});

$('#btn-resume').addEventListener('click', function () {
  if (resumeFileId) openFile(resumeFileId);
});
$('#btn-all-files').addEventListener('click', openPanel);

$('#panel-clear-all').addEventListener('click', function () {
  showConfirm({
    title: 'Delete all data?',
    message: 'All files, bookmarks, notes, statuses, emails and drafts will be permanently removed from this browser.',
    okLabel: 'Delete everything',
    onOk: function () {
      Object.values(LS).forEach(function (k) { store.remove(k); });
      location.reload();
    }
  });
});

document.querySelectorAll('[data-close-panel]').forEach(function (el) {
  el.addEventListener('click', closePanels);
});

$('#file-list').addEventListener('click', function (e) {
  const row = e.target.closest('.file-row');
  if (!row) return;
  const fid = row.dataset.fid;
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  if (btn.dataset.action === 'rename') startRename(row, fid);
  else if (btn.dataset.action === 'delete') confirmDeleteFile(fid);
  else if (btn.dataset.action === 'open') { closePanels(); openFile(fid); }
});

$('#modal-ok').addEventListener('click', function () {
  const cb = modalOnOk;
  hideModal();
  if (cb) cb();
});
$('#modal-cancel').addEventListener('click', hideModal);
$('#modal .modal-backdrop').addEventListener('click', hideModal);

document.addEventListener('click', function (e) {
  const sm = document.getElementById('status-menu');
  if (sm && !sm.contains(e.target) && !(e.target.closest && e.target.closest('[data-action="statusmenu"]'))) {
    closeStatusMenu();
  }
  const dm = document.getElementById('dd-menu');
  if (dm && !dm.contains(e.target) && !(e.target.closest && e.target.closest('.dd-trigger'))) {
    closeDropdown();
  }
});

window.addEventListener('scroll', function (e) {
  if (e.target && e.target.closest && (e.target.closest('.status-menu') || e.target.closest('.dd-menu'))) return;
  closeStatusMenu();
  closeDropdown();
}, true);

document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape') return;
  closeStatusMenu();
  closeDropdown();
  if (!$('#modal').hidden) { hideModal(); return; }
  closePanels();
});

/* ==================== PWA install ==================== */
let deferredPrompt = null;

function syncInstallBtn() {
  const btn = $('#btn-install');
  if (!btn) return;
  btn.hidden = !(deferredPrompt && !uploadView.hidden);
}

window.addEventListener('beforeinstallprompt', function (e) {
  e.preventDefault();
  deferredPrompt = e;
  syncInstallBtn();
});

window.addEventListener('appinstalled', function () {
  deferredPrompt = null;
  syncInstallBtn();
  toast('EduTract installed');
});

$('#btn-install').addEventListener('click', function () {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then(function () {
    deferredPrompt = null;
    syncInstallBtn();
  }).catch(function () {});
});

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  });
}

/* ==================== Theme ==================== */
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  $('#theme-toggle').innerHTML = icon(t === 'dark' ? 'sun' : 'moon', 18);
  const logo = $('#brand-logo');
  if (logo) logo.src = t === 'dark' ? 'assets/edutract-dark.png' : 'assets/edutract-light.png';
  const tc = document.querySelector('meta[name="theme-color"]');
  if (tc) tc.setAttribute('content', t === 'dark' ? '#0e1013' : '#4f46e5');
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
  const savedView = store.get(LS.view, null);
  if (ids.length) {
    let rf = (activeFileId && files[activeFileId]) ? activeFileId : null;
    if (!rf) {
      rf = ids.slice().sort(function (a, b) {
        return (files[b].lastAccessed || 0) - (files[a].lastAccessed || 0);
      })[0];
    }
    if (savedView === 'upload') {
      showUpload();
    } else {
      openFile(rf);
      if (savedView === 'bookmarks') showBookmarks();
    }
  } else {
    showUpload();
  }
})();
