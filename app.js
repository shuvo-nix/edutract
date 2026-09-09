'use strict';

/* ==================== Storage ==================== */
const LS = {
  data: 'edutract:data',
  meta: 'edutract:meta',
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
  }
};

/* ==================== State ==================== */
let rows = [];
let bookmarks = new Set(store.get(LS.bookmarks, []));
let notes = store.get(LS.notes, {});
let overrides = store.get(LS.statuses, {});
let drafts = store.get(LS.drafts, {});
let openIds = new Set();
let expandAllState = false;
const filters = { q: '', priority: 'all', area: 'all', location: 'all', status: 'all', bookmarked: false, sort: 'priority' };

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
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      ok = document.execCommand('copy');
      ta.remove();
    } catch (e2) { ok = false; }
  }
  if (ok) {
    toast('Email draft copied!');
    if (btn) {
      const old = btn.textContent;
      btn.textContent = '✓ Copied';
      setTimeout(function () { btn.textContent = old; }, 1500);
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
  const ov = overrides[row.uid];
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
  const list = rows.filter(function (r) {
    if (filters.bookmarked && !bookmarks.has(r.uid)) return false;
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
  const marked = bookmarks.has(uid);
  const bucket = bucketOf(row);
  const ov = overrides[uid] || '';
  const draft = drafts[uid] != null ? drafts[uid] : row.emailDraft;
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
        '<button class="star' + (marked ? ' marked' : '') + '" data-action="bookmark" title="Bookmark" aria-label="Bookmark">' + (marked ? '★' : '☆') + '</button>' +
        '<div class="card-title">' +
          '<h3>' + esc(row.name || 'Untitled') + '</h3>' +
          '<p class="card-inst">' + esc(row.institution || '') + (row.location ? ' · <span class="loc">' + esc(row.location) + '</span>' : '') + '</p>' +
        '</div>' +
        '<div class="card-badges">' +
          (row.priority ? '<span class="badge prio-' + esc(String(row.priority).toLowerCase()) + '">' + esc(row.priority) + '</span>' : '') +
          '<span class="badge st-' + bucket + '">' + esc(BUCKET_LABELS[bucket] || bucket) + '</span>' +
          '<span class="chevron" data-action="toggle">▾</span>' +
        '</div>' +
      '</header>' +
      '<div class="card-details"><div class="card-inner"><div class="card-body">' +
        fields +
        '<div class="field"><div class="field-label">Contact status</div>' +
          '<select class="status-select" data-uid="' + esc(uid) + '"><option value="">— from sheet —</option>' + statusOptions + '</select>' +
        '</div>' +
        '<div class="field"><div class="field-label">Notes <span class="muted">(saved locally)</span></div>' +
          '<textarea class="notes" placeholder="Add your notes…">' + esc(notes[uid] || '') + '</textarea>' +
        '</div>' +
        '<div class="field"><div class="field-label">Email draft <span class="muted">(editable — edits are saved)</span></div>' +
          '<textarea class="draft" spellcheck="false">' + esc(draft) + '</textarea>' +
          '<div class="draft-actions">' +
            '<button class="btn btn-primary" data-action="copy">Copy draft</button>' +
            (mailHref ? '<a class="btn btn-ghost" href="' + esc(mailHref) + '">Open in mail app</a>' : '') +
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
  statsEl.innerHTML = '<strong>' + list.length + '</strong> of ' + rows.length + ' entries · <strong>' + bookmarks.size + '</strong> bookmarked';
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
  $('#btn-upload-new').hidden = false;
  $('#btn-clear').hidden = false;
  populateSelects();
  renderList();
}

function showUpload() {
  directoryView.hidden = true;
  uploadView.hidden = false;
}

/* ==================== File handling ==================== */
function handleFile(file) {
  if (!/\.(xlsx|xls)$/i.test(file.name)) { toast('Please choose an .xlsx or .xls file', true); return; }
  if (typeof XLSX === 'undefined') { toast('Excel library failed to load — check your internet connection.', true); return; }
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
      const sheetName = wb.SheetNames.find(function (n) { return /master/i.test(n); }) || wb.SheetNames[0];
      const raw = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });
      rows = normalizeRows(raw);
      if (!rows.length) throw new Error('No data rows found in sheet "' + sheetName + '".');
      store.set(LS.data, raw);
      store.set(LS.meta, { filename: file.name, uploadedAt: Date.now(), count: rows.length });
      showDirectory();
      toast('Loaded ' + rows.length + ' entries');
    } catch (err) {
      toast('Could not read file: ' + err.message, true);
    }
  };
  reader.onerror = function () { toast('Could not read the file.', true); };
  reader.readAsArrayBuffer(file);
}

/* ==================== Events ==================== */
['dragenter', 'dragover'].forEach(function (ev) {
  dropzone.addEventListener(ev, function (e) { e.preventDefault(); dropzone.classList.add('drag'); });
});
['dragleave', 'drop'].forEach(function (ev) {
  dropzone.addEventListener(ev, function (e) { e.preventDefault(); dropzone.classList.remove('drag'); });
});
dropzone.addEventListener('drop', function (e) { const f = e.dataTransfer.files[0]; if (f) handleFile(f); });
dropzone.addEventListener('click', function () { fileInput.click(); });
dropzone.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } });
fileInput.addEventListener('change', function () { if (fileInput.files[0]) handleFile(fileInput.files[0]); fileInput.value = ''; });

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
    if (bookmarks.has(uid)) bookmarks.delete(uid); else bookmarks.add(uid);
    store.set(LS.bookmarks, Array.from(bookmarks));
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
    notes[uid] = el.value;
    store.set(LS.notes, notes);
  } else if (el.classList.contains('draft')) {
    drafts[uid] = el.value;
    store.set(LS.drafts, drafts);
  }
});

listEl.addEventListener('change', function (e) {
  const el = e.target;
  if (!el.classList.contains('status-select')) return;
  const uid = el.dataset.uid || (el.closest('.card') && el.closest('.card').dataset.uid);
  if (!uid) return;
  overrides[uid] = el.value;
  store.set(LS.statuses, overrides);
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

$('#btn-upload-new').addEventListener('click', showUpload);

$('#btn-clear').addEventListener('click', function () {
  if (!confirm('Clear ALL saved data (upload, bookmarks, notes, statuses, drafts)?')) return;
  [LS.data, LS.meta, LS.bookmarks, LS.notes, LS.statuses, LS.drafts].forEach(function (k) { localStorage.removeItem(k); });
  location.reload();
});

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  $('#theme-toggle').textContent = t === 'dark' ? '☀️' : '🌙';
}
$('#theme-toggle').addEventListener('click', function () {
  const t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(t);
  store.set(LS.theme, t);
});

$('#btn-resume').addEventListener('click', function () {
  const raw = store.get(LS.data, null);
  if (!raw || !Array.isArray(raw) || !raw.length) { toast('No saved data found.', true); return; }
  rows = normalizeRows(raw);
  showDirectory();
});

$('#btn-discard').addEventListener('click', function () {
  localStorage.removeItem(LS.data);
  localStorage.removeItem(LS.meta);
  $('#resume-card').hidden = true;
  toast('Saved upload discarded');
});

/* ==================== Init ==================== */
(function init() {
  const savedTheme = store.get(LS.theme, null);
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(savedTheme || (prefersDark ? 'dark' : 'light'));

  const raw = store.get(LS.data, null);
  const meta = store.get(LS.meta, null);
  if (raw && Array.isArray(raw) && raw.length && meta) {
    $('#resume-card').hidden = false;
    const when = meta.uploadedAt ? new Date(meta.uploadedAt).toLocaleString() : 'unknown date';
    $('#resume-meta').textContent = (meta.filename || 'Excel file') + ' · ' + (meta.count || raw.length) + ' entries · ' + when;
  }
})();
