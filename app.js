'use strict';

/* =============================================================
   EduTract - professor directory from Excel master lists.
   Everything runs locally; data lives in your browser (IndexedDB).
   ============================================================= */

/* ---------- tiny helpers ---------- */
const $ = (id) => document.getElementById(id);
const ENT = { '&': '&' + 'amp;', '<': '&' + 'lt;', '>': '&' + 'gt;', '"': '&' + 'quot;', "'": '&' + '#39;' };
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ENT[c]);
const fmtDate = (ts) => new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
const safeUrl = (u) => /^https?:\/\//i.test(u) ? u : 'https://' + u;
const splitArea = (v) => String(v || '').split(/[,;|]+/).map((s) => s.trim()).filter(Boolean);
const rowAreas = (r) => (r.areas && r.areas.length ? r.areas : splitArea(r.area));

const SVG = {
  chevron: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
  star: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  copy: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  send: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
  pencil: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>',
  trash: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  close: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  sun: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>',
  moon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'
};

/* ---------- statuses ---------- */
const STATUSES = ['Saved', 'Ready', 'Contacted', 'Followed', 'Responded', 'Applied', 'Interview', 'Accepted', 'Rejected', 'No Response'];
const statusSlug = (s) => 'st-' + String(s).toLowerCase().replace(/\s+/g, '-');
const normStatus = (v) => STATUSES.find((s) => s.toLowerCase() === String(v || '').trim().toLowerCase()) || null;
const normHeader = (h) => String(h == null ? '' : h).toLowerCase().replace(/[^a-z0-9]/g, '');
const normPriority = (v) => {
  const t = String(v == null ? '' : v).trim();
  if (!t) return null;
  if (/^(a|1|high|top)$/i.test(t)) return 'A';
  if (/^(b|2|medium|mid)$/i.test(t)) return 'B';
  if (/^(c|3|low)$/i.test(t)) return 'C';
  return null;
};
const CITY_RE = /(city|country|region|state|town|address|place|province|campus|location|continent)/i;

/* ---------- Excel column mapping ----------
   Known fields are matched by header name (flexible), everything else
   is displayed as an extra field so no column is ever hidden. */
const FIELD_DEFS = [
  { key: 'subject', exact: ['emailsubject', 'subject', 'subjectline', 'emailsubjectline', 'mailsubject'], contains: ['subject'] },
  { key: 'body', exact: ['emailbody', 'body', 'emailcontent', 'emailmessage', 'message', 'mailbody', 'emailtext', 'draft'], contains: ['body', 'message', 'draft', 'content'] },
  { key: 'name', exact: ['name', 'professorname', 'professor', 'prof', 'pi', 'supervisor', 'advisor', 'facultyname', 'faculty'], contains: ['name', 'professor', 'supervisor', 'advisor'] },
  { key: 'email', exact: ['email', 'emailaddress', 'mail', 'contact', 'contactemail'], contains: ['email', 'mail'] },
  { key: 'institution', exact: ['university', 'institution', 'institute', 'school', 'college', 'organization', 'organisation', 'affiliation', 'uni'], contains: ['university', 'institution', 'institute', 'school', 'college', 'affiliation'] },
  { key: 'location', exact: ['location', 'country', 'region', 'city', 'place', 'nation', 'state', 'address', 'town', 'province', 'campus', 'basedin', 'continent', 'where'], contains: ['location', 'country', 'region', 'city', 'town', 'address', 'province'] },
  { key: 'area', exact: ['researcharea', 'area', 'field', 'research', 'researchinterests', 'researchinterest', 'researchtopics', 'topics', 'topic', 'researchfield', 'interests'], contains: ['research', 'area', 'field', 'interest', 'topic'] },
  { key: 'priority', exact: ['priority', 'prio', 'rank', 'tier'], contains: ['priority', 'prio'] },
  { key: 'status', exact: ['status', 'applicationstatus', 'appstatus'], contains: ['status'] },
  { key: 'notes', exact: ['notes', 'note', 'comments', 'comment', 'remarks'], contains: ['note', 'comment', 'remark'] }
];
const LINK_HINTS = ['link', 'links', 'website', 'url', 'homepage', 'webpage', 'site', 'page', 'scholar', 'profile', 'lab', 'job', 'posting', 'vacancy', 'opening'];

function mapColumns(headers) {
  const nh = headers.map(normHeader);
  const col = {};
  const used = new Set();
  FIELD_DEFS.forEach((def) => {
    for (let i = 0; i < nh.length; i++) {
      if (used.has(i) || !nh[i]) continue;
      if (def.exact.indexOf(nh[i]) >= 0) { col[def.key] = i; used.add(i); break; }
    }
  });
  FIELD_DEFS.forEach((def) => {
    if (col[def.key] != null) return;
    let best = -1;
    for (let i = 0; i < nh.length; i++) {
      if (used.has(i) || !nh[i]) continue;
      if (def.contains.some((p) => nh[i].indexOf(p) >= 0)) {
        if (best < 0 || nh[i].length < nh[best].length) best = i;
      }
    }
    if (best >= 0) { col[def.key] = best; used.add(best); }
  });
  const links = [];
  for (let i = 0; i < nh.length; i++) {
    if (used.has(i) || !nh[i]) continue;
    if (LINK_HINTS.some((p) => nh[i].indexOf(p) >= 0)) { links.push(i); used.add(i); }
  }
  return { col, links, used };
}

/* ---------- Excel parsing ---------- */
function parseWorkbook(buf) {
  if (typeof XLSX === 'undefined') throw new Error('SheetJS missing');
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) throw new Error('empty');
  const grid = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
  let hi = grid.findIndex((r) => r.filter((c) => String(c == null ? '' : c).trim()).length >= 2);
  if (hi < 0) hi = grid.findIndex((r) => r.some((c) => String(c == null ? '' : c).trim()));
  if (hi < 0) throw new Error('empty');
  const headers = grid[hi].map((h) => String(h == null ? '' : h).trim());
  const mapped = mapColumns(headers);
  let locIdx = mapped.col.location != null ? mapped.col.location : -1;
  if (locIdx < 0) {
    for (let i = 0; i < headers.length; i++) {
      if (!headers[i] || mapped.used.has(i)) continue;
      if (CITY_RE.test(headers[i])) { locIdx = i; mapped.used.add(i); break; }
    }
  }
  const rows = [];
  for (let ri = hi + 1; ri < grid.length; ri++) {
    const line = grid[ri];
    if (!line || !line.some((c) => String(c == null ? '' : c).trim())) continue;
    const val = (i) => { const v = line[i]; return v == null ? '' : String(v).trim(); };
    const areaVal = mapped.col.area != null ? val(mapped.col.area) : '';
    const row = {
      name: mapped.col.name != null ? val(mapped.col.name) : '',
      email: mapped.col.email != null ? val(mapped.col.email) : '',
      institution: mapped.col.institution != null ? val(mapped.col.institution) : '',
      location: locIdx >= 0 ? val(locIdx) : '',
      area: areaVal,
      areas: splitArea(areaVal),
      priority: mapped.col.priority != null ? val(mapped.col.priority) : '',
      subject: mapped.col.subject != null ? val(mapped.col.subject) : '',
      body: mapped.col.body != null ? val(mapped.col.body) : '',
      notes: mapped.col.notes != null ? val(mapped.col.notes) : '',
      status: (mapped.col.status != null && normStatus(val(mapped.col.status))) || 'Saved',
      links: mapped.links.map((i) => ({ label: headers[i], url: val(i) })).filter((l) => l.url),
      extras: [],
      bookmarked: false,
      draft: null
    };
    headers.forEach((h, i) => {
      if (!h || mapped.used.has(i)) return;
      const v = val(i);
      if (v) row.extras.push({ label: h, value: v });
    });
    if (!row.name) {
      let first = -1;
      for (let i = 0; i < headers.length; i++) {
        if (headers[i] && !mapped.used.has(i) && val(i)) { first = i; break; }
      }
      row.name = first >= 0 ? val(first) : 'Untitled';
    }
    rows.push(row);
  }
  if (!rows.length) throw new Error('empty');
  return { headers, rows };
}

/* ---------- IndexedDB ---------- */
const DB_NAME = 'edutract';
let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains('files')) d.createObjectStore('files', { keyPath: 'id' });
        if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta');
      };
      req.onsuccess = () => {
        db = req.result;
        if (!db.objectStoreNames.contains('files') || !db.objectStoreNames.contains('meta')) {
          db.close();
          indexedDB.deleteDatabase(DB_NAME);
          setTimeout(attempt, 300);
          return;
        }
        resolve(db);
      };
      req.onerror = () => {
        if (req.error && req.error.name === 'VersionError') {
          indexedDB.deleteDatabase(DB_NAME);
          setTimeout(attempt, 300);
          return;
        }
        reject(req.error);
      };
    };
    attempt();
  });
}

const pv = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const dbAll = () => pv(db.transaction('files').objectStore('files').getAll());
const dbGet = (id) => pv(db.transaction('files').objectStore('files').get(id));
const dbPut = (rec) => pv(db.transaction('files', 'readwrite').objectStore('files').put(rec));
const dbDel = (id) => pv(db.transaction('files', 'readwrite').objectStore('files').delete(id));
const dbClear = () => pv(db.transaction('files', 'readwrite').objectStore('files').clear());
const metaGet = (k) => pv(db.transaction('meta').objectStore('meta').get(k));
const metaSet = (k, v) => pv(db.transaction('meta', 'readwrite').objectStore('meta').put(v, k));
const metaDel = (k) => pv(db.transaction('meta', 'readwrite').objectStore('meta').delete(k));

/* ---------- state ---------- */
const state = {
  files: [],
  file: null,
  view: 'upload',
  open: new Set(),
  expandAll: false,
  filters: { q: '', priority: '', area: '', location: '', status: '', bookmarked: false, sort: '' },
  ddSync: [],
  deferredPrompt: null
};

/* ---------- views ---------- */
function showView(v) {
  state.view = v;
  $('upload-view').hidden = v !== 'upload';
  $('toolbar').hidden = v !== 'directory';
  $('directory-view').hidden = v !== 'directory';
  $('bookmarks-view').hidden = v !== 'bookmarks';
  $('bm-page-head').hidden = v !== 'bookmarks';
  updateNav();
  window.scrollTo(0, 0);
}

function updateNav() {
  const has = state.files.length > 0;
  $('btn-files').hidden = !has;
  $('btn-bookmarks').hidden = !has;
  $('btn-add').hidden = !has;
  $('btn-bookmarks').classList.toggle('active', state.view === 'bookmarks');
}

/* Promote a city-like extra field to location for rows saved by older versions */
function migrateRows(rec) {
  let changed = false;
  rec.rows.forEach((row) => {
    if (!row.location && row.extras && row.extras.length) {
      const i = row.extras.findIndex((e) => CITY_RE.test(e.label || ''));
      if (i >= 0) {
        row.location = row.extras[i].value;
        row.extras.splice(i, 1);
        changed = true;
      }
    }
  });
  return changed;
}

async function refreshFiles() {
  state.files = (await dbAll()).sort((a, b) => b.uploadedAt - a.uploadedAt);
  if (state.file) state.file = state.files.find((f) => f.id === state.file.id) || null;
  updateNav();
}

async function openFile(id) {
  await refreshFiles();
  const rec = state.files.find((f) => f.id === id);
  if (!rec) { showView('upload'); return; }
  state.file = rec;
  await metaSet('lastFileId', id);
  if (migrateRows(rec)) dbPut(rec);
  state.open.clear();
  state.expandAll = false;
  buildFilterDropdowns();
  showView('directory');
  renderDirectory();
}

async function refreshResume() {
  const lastId = await metaGet('lastFileId');
  const rec = lastId ? state.files.find((f) => f.id === lastId) : null;
  const card = $('resume-card');
  if (rec) {
    $('resume-title').textContent = 'Continue where you left off';
    $('resume-meta').textContent = rec.name + ' · ' + rec.rows.length + ' professors · ' + fmtDate(rec.uploadedAt);
    card.hidden = false;
    $('btn-resume').onclick = () => openFile(rec.id);
  } else {
    card.hidden = true;
  }
}

/* ---------- upload ---------- */
async function handleFile(file) {
  try {
    if (!/\.(xlsx|xls)$/i.test(file.name)) throw new Error('type');
    const buf = await file.arrayBuffer();
    const parsed = parseWorkbook(buf);
    const rec = {
      id: 'f' + Date.now() + Math.random().toString(36).slice(2, 6),
      name: file.name.replace(/\.(xlsx|xls)$/i, ''),
      uploadedAt: Date.now(),
      headers: parsed.headers,
      rows: parsed.rows
    };
    await dbPut(rec);
    await metaSet('lastFileId', rec.id);
    await refreshFiles();
    closePanel();
    openFile(rec.id);
    toast('Loaded ' + rec.rows.length + ' entries from "' + rec.name + '"');
  } catch (err) {
    toast('Could not read that file. Is it a valid Excel file?', true);
  }
}

function initUpload() {
  const dz = $('dropzone');
  const fi = $('file-input');
  dz.addEventListener('click', () => fi.click());
  dz.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fi.click(); }
  });
  ['dragenter', 'dragover'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('drag'); }));
  dz.addEventListener('drop', (e) => {
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) handleFile(f);
  });
  fi.addEventListener('change', () => {
    if (fi.files && fi.files[0]) handleFile(fi.files[0]);
    fi.value = '';
  });
}

/* ---------- filter dropdowns ---------- */
let openMenuEl = null;
function closeMenus() { if (openMenuEl) { openMenuEl.remove(); openMenuEl = null; } }

function createDropdown(el, label, options, get, set) {
  el.innerHTML = '';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'dd-trigger';
  btn.innerHTML = '<span class="dd-text"></span>' + SVG.chevron;
  el.appendChild(btn);
  const textEl = btn.querySelector('.dd-text');
  const sync = () => {
    const v = get();
    btn.classList.toggle('has-value', !!v);
    const opt = options.find((o) => o.value === v);
    textEl.textContent = v && opt ? opt.label : label;
  };
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const wasOpen = openMenuEl && openMenuEl._owner === btn;
    closeMenus();
    if (wasOpen) return;
    const menu = document.createElement('div');
    menu.className = 'dd-menu';
    menu._owner = btn;
    options.forEach((o) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'dd-item' + (get() === o.value ? ' current' : '');
      item.textContent = o.label;
      item.addEventListener('click', (ev) => {
        ev.stopPropagation();
        set(o.value);
        closeMenus();
        sync();
        renderDirectory();
      });
      menu.appendChild(item);
    });
    document.body.appendChild(menu);
    openMenuEl = menu;
    const r = btn.getBoundingClientRect();
    menu.style.left = Math.max(8, Math.min(r.left, window.innerWidth - menu.offsetWidth - 8)) + 'px';
    menu.style.top = Math.min(r.bottom + 6, window.innerHeight - menu.offsetHeight - 8) + 'px';
  });
  sync();
  return sync;
}

function uniqueValues(arr) {
  return Array.from(new Set(arr.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function buildFilterDropdowns() {
  const rows = state.file ? state.file.rows : [];
  state.ddSync = [];
  const mk = (el, label, options, key) => {
    const sync = createDropdown(el, label, options, () => state.filters[key], (v) => { state.filters[key] = v; });
    state.ddSync.push(sync);
  };
  mk($('dd-priority'), 'Priority', [{ value: '', label: 'All priorities' }].concat(
    uniqueValues(rows.map((r) => normPriority(r.priority))).map((p) => ({ value: p, label: 'Priority ' + p }))), 'priority');
  mk($('dd-area'), 'Research area', [{ value: '', label: 'All areas' }].concat(
    uniqueValues(rows.reduce((acc, r) => acc.concat(rowAreas(r)), [])).map((a) => ({ value: a, label: a }))), 'area');
  mk($('dd-location'), 'Location', [{ value: '', label: 'All locations' }].concat(
    uniqueValues(rows.map((r) => r.location)).map((l) => ({ value: l, label: l }))), 'location');
  mk($('dd-status'), 'Status', [{ value: '', label: 'All statuses' }].concat(
    STATUSES.map((s) => ({ value: s, label: s }))), 'status');
  mk($('dd-sort'), 'Sort', [
    { value: '', label: 'File order' },
    { value: 'name-az', label: 'Name A-Z' },
    { value: 'name-za', label: 'Name Z-A' },
    { value: 'priority', label: 'Priority (A first)' }
  ], 'sort');
}

/* ---------- filtering ---------- */
function visibleRows() {
  const f = state.filters;
  let list = state.file.rows.map((r, i) => ({ r, i }));
  if (f.q) {
    const q = f.q.toLowerCase();
    list = list.filter(({ r }) =>
      [r.name, r.email, r.institution, r.location, r.area, r.subject].some((v) => String(v || '').toLowerCase().indexOf(q) >= 0) ||
      r.extras.some((e) => (e.label + ' ' + e.value).toLowerCase().indexOf(q) >= 0));
  }
  if (f.priority) list = list.filter(({ r }) => normPriority(r.priority) === f.priority);
  if (f.area) list = list.filter(({ r }) => rowAreas(r).some((a) => a.toLowerCase() === f.area.toLowerCase()));
  if (f.location) list = list.filter(({ r }) => (r.location || '').toLowerCase() === f.location.toLowerCase());
  if (f.status) list = list.filter(({ r }) => r.status === f.status);
  if (f.bookmarked) list = list.filter(({ r }) => r.bookmarked);
  if (f.sort === 'name-az') list.sort((a, b) => a.r.name.localeCompare(b.r.name));
  if (f.sort === 'name-za') list.sort((a, b) => b.r.name.localeCompare(a.r.name));
  if (f.sort === 'priority') list.sort((a, b) => (normPriority(a.r.priority) || 'c').localeCompare(normPriority(b.r.priority) || 'c'));
  return list;
}

/* ---------- email drafts ---------- */
function buildDraft(r) {
  const subject = String(r.subject || '').trim() || ('Prospective PhD/RA applicant - ' + r.name);
  const body = String(r.body || '').trim() || defaultBody(r);
  return 'Subject: ' + subject + '\n\n' + body;
}

function defaultBody(r) {
  const sal = r.name ? 'Dear ' + r.name + ',' : 'Dear Professor,';
  const interest = r.area ? ' I am especially interested in your work on ' + r.area + '.' : '';
  return sal + '\n\nI am writing to ask about the possibility of joining your research group as a PhD student.' + interest +
    ' I would be glad to share my CV and discuss how my background might align with your current projects.\n\nThank you for your time.\n\nSincerely,\n[Your name]';
}

function sendDraft(card, row) {
  if (!row.email) { toast('No email address saved for this entry', true); return; }
  const ta = card.querySelector('textarea.draft');
  const draft = (ta ? ta.value : buildDraft(row)).trim();
  let subject = String(row.subject || '').trim() || ('Prospective PhD/RA applicant - ' + row.name);
  let body = draft;
  const m = draft.match(/^\s*Subject:\s*(.+?)\s*$/im);
  if (m) {
    subject = m[1];
    body = draft.replace(/^\s*Subject:\s*.+?\s*$/im, '').replace(/^\s+/, '');
  }
  window.location.href = 'mailto:' + encodeURIComponent(row.email) +
    '?' + 'subject=' + encodeURIComponent(subject) + '&' + 'body=' + encodeURIComponent(body);
}

/* ---------- card rendering ---------- */
function cardHTML(file, r, i, showFile) {
  const key = file.id + ':' + i;
  const open = state.expandAll || state.open.has(key);
  const tier = (normPriority(r.priority) || 'c').toLowerCase();
  const prioBadge = r.priority ? '<span class="badge prio-' + tier + '">' + esc(r.priority) + '</span>' : '';
  const fileBadge = showFile ? '<span class="badge file-badge" title="' + esc(file.name) + '">' + esc(file.name) + '</span>' : '';
  const areas = rowAreas(r);
  const chips = areas.map((a) => '<span class="chip">' + esc(a) + '</span>').join('');
  const extras = r.extras.map((e) =>
    '<div class="field"><div class="field-label">' + esc(e.label) + '</div><div class="field-value">' + esc(e.value) + '</div></div>'
  ).join('');
  const linkFields = r.links.map((l) =>
    '<div class="field"><div class="field-label">' + esc(l.label || 'Link') + '</div><div class="field-value"><a href="' + esc(safeUrl(l.url)) + '" target="_blank" rel="noopener">' + esc(l.url) + '</a></div></div>'
  ).join('');
  const emailField =
    '<div class="field"><div class="field-label">Email</div><div class="field-value email-value">' +
    '<span class="email-text">' + (r.email ? esc(r.email) : '<span class="muted">not set</span>') + '</span>' +
    '<button class="mini-btn inline-edit" data-act="edit-email" title="Edit email">' + SVG.pencil + '</button>' +
    '<button class="mini-btn" data-act="copy-email" title="Copy email">' + SVG.copy + '</button>' +
    '</div></div>';
  const draftVal = r.draft != null ? r.draft : buildDraft(r);
  const body =
    (areas.length ? '<div class="field"><div class="field-label">Research areas</div><div class="chips">' + chips + '</div></div>' : '') +
    extras +
    linkFields +
    '<div class="field"><div class="field-label">Notes</div><textarea class="notes" placeholder="Your notes…">' + esc(r.notes || '') + '</textarea></div>' +
    emailField +
    '<div class="field"><div class="field-label">Email draft</div><textarea class="draft">' + esc(draftVal) + '</textarea>' +
    '<div class="draft-actions" style="justify-content:space-between">' +
    '<button class="btn btn-primary" data-act="send">' + SVG.send + ' Send</button>' +
    '<button class="btn btn-ghost" data-act="copy-draft" title="Copy draft" aria-label="Copy draft">' + SVG.copy + '</button>' +
    '</div></div>';
  return (
    '<div class="card' + (open ? ' open' : '') + '" data-file="' + file.id + '" data-idx="' + i + '">' +
    '<div class="card-head">' +
    '<button class="star' + (r.bookmarked ? ' marked' : '') + '" data-act="star" aria-label="Bookmark" title="' + (r.bookmarked ? 'Remove bookmark' : 'Bookmark') + '">' + SVG.star + '</button>' +
    '<div class="card-title"><h3>' + esc(r.name) + '</h3><div class="card-inst">' +
    esc(r.institution || '') + (r.institution && r.location ? ' · ' : '') +
    (r.location ? '<span class="loc">' + esc(r.location) + '</span>' : '') +
    '</div></div>' +
    '<div class="card-badges">' + prioBadge + fileBadge +
    '<button class="status-chip ' + statusSlug(r.status) + '" data-act="status" title="Change status">' + esc(r.status) + '</button>' +
    '<span class="chevron">' + SVG.chevron + '</span>' +
    '</div></div>' +
    '<div class="card-details"><div class="card-inner"><div class="card-body">' + body + '</div></div></div>' +
    '</div>'
  );
}

function renderDirectory() {
  if (!state.file || state.view !== 'directory') return;
  const list = visibleRows();
  const total = state.file.rows.length;
  const bm = state.file.rows.filter((r) => r.bookmarked).length;
  $('stats').innerHTML = 'Showing <strong>' + list.length + '</strong> of ' + total + ' professors · ' + bm + ' bookmarked';
  $('list').innerHTML = list.map(({ r, i }) => cardHTML(state.file, r, i, false)).join('');
  $('empty').hidden = list.length > 0;
  $('f-bookmarked').classList.toggle('active', state.filters.bookmarked);
  $('f-bookmarked').setAttribute('aria-pressed', String(!!state.filters.bookmarked));
  $('btn-expand-all').classList.toggle('active', state.expandAll);
}

function renderBookmarks() {
  let total = 0;
  let bm = 0;
  const cards = [];
  state.files.forEach((file) => {
    file.rows.forEach((r, i) => { if (r.bookmarked) cards.push(cardHTML(file, r, i, true)); });
    total += file.rows.length;
    bm += file.rows.filter((r) => r.bookmarked).length;
  });
  $('bm-list').innerHTML = cards.join('');
  $('bm-empty').hidden = cards.length > 0;
  $('bm-count-chip').textContent = bm + ' of ' + total;
}

function showBookmarks() { showView('bookmarks'); renderBookmarks(); }

function rerenderView() {
  if (state.view === 'bookmarks') renderBookmarks();
  else if (state.view === 'directory') renderDirectory();
}

/* ---------- card events ---------- */
function bindList(container) {
  container.addEventListener('click', onCardClick);
  container.addEventListener('change', onCardChange);
}

function onCardClick(e) {
  const card = e.target.closest('.card');
  if (!card) return;
  const file = state.files.find((f) => f.id === card.dataset.file);
  const idx = Number(card.dataset.idx);
  if (!file || isNaN(idx)) return;
  const row = file.rows[idx];
  const act = e.target.closest('[data-act]');
  if (act) {
    const a = act.dataset.act;
    if (a === 'star') {
      row.bookmarked = !row.bookmarked;
      dbPut(file);
      rerenderView();
      return;
    }
    if (a === 'status') { e.stopPropagation(); openStatusMenu(act, file, idx); return; }
    if (a === 'copy-email') { copyText(row.email); return; }
    if (a === 'edit-email') { e.stopPropagation(); startEmailEdit(act, card, file, idx); return; }
    if (a === 'copy-draft') {
      const ta = card.querySelector('textarea.draft');
      copyText(ta ? ta.value : buildDraft(row));
      return;
    }
    if (a === 'send') { sendDraft(card, row); return; }
    return;
  }
  if (e.target.closest('.card-head')) {
    const key = file.id + ':' + idx;
    if (state.expandAll) {
      state.expandAll = false;
      state.open.clear();
      Array.prototype.forEach.call(card.parentElement.querySelectorAll('.card'), (c) => {
        if (c !== card) state.open.add(c.dataset.file + ':' + c.dataset.idx);
      });
      card.classList.remove('open');
      $('btn-expand-all').classList.remove('active');
      return;
    }
    if (state.open.has(key)) { state.open.delete(key); card.classList.remove('open'); }
    else { state.open.add(key); card.classList.add('open'); }
  }
}

function onCardChange(e) {
  const ta = e.target;
  if (!ta || ta.tagName !== 'TEXTAREA') return;
  const card = ta.closest('.card');
  if (!card) return;
  const file = state.files.find((f) => f.id === card.dataset.file);
  const idx = Number(card.dataset.idx);
  if (!file || isNaN(idx)) return;
  if (ta.classList.contains('notes')) { file.rows[idx].notes = ta.value; dbPut(file); }
  if (ta.classList.contains('draft')) { file.rows[idx].draft = ta.value; dbPut(file); }
}

function startEmailEdit(btn, card, file, idx) {
  const wrap = btn.closest('.email-value');
  const span = wrap.querySelector('.email-text');
  const input = document.createElement('input');
  input.type = 'email';
  input.className = 'email-input';
  input.value = file.rows[idx].email || '';
  span.replaceWith(input);
  const hint = document.createElement('span');
  hint.className = 'email-edit-hint';
  hint.textContent = 'Enter to save · Esc to cancel';
  wrap.appendChild(hint);
  input.focus();
  input.select();
  let done = false;
  const finish = (commit) => {
    if (done) return;
    done = true;
    if (commit && input.value.trim()) {
      file.rows[idx].email = input.value.trim();
      dbPut(file);
    }
    rerenderView();
  };
  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') { ev.preventDefault(); finish(true); }
    else if (ev.key === 'Escape') { ev.preventDefault(); finish(false); }
  });
  input.addEventListener('blur', () => finish(true));
}

/* ---------- status menu ---------- */
let statusMenuEl = null;
function closeStatusMenu() { if (statusMenuEl) { statusMenuEl.remove(); statusMenuEl = null; } }

function openStatusMenu(chip, file, idx) {
  closeMenus();
  closeStatusMenu();
  const menu = document.createElement('div');
  menu.className = 'status-menu';
  const top = document.createElement('div');
  top.className = 'status-menu-top';
  const closeBtn = document.createElement('button');
  closeBtn.className = 'status-menu-close';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.innerHTML = SVG.close;
  closeBtn.addEventListener('click', (ev) => { ev.stopPropagation(); closeStatusMenu(); });
  top.appendChild(closeBtn);
  const items = document.createElement('div');
  items.className = 'status-menu-items';
  STATUSES.forEach((s) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'status-menu-item ' + statusSlug(s) + (file.rows[idx].status === s ? ' current' : '');
    b.textContent = s;
    b.addEventListener('click', (ev) => {
      ev.stopPropagation();
      file.rows[idx].status = s;
      dbPut(file);
      closeStatusMenu();
      rerenderView();
    });
    items.appendChild(b);
  });
  menu.appendChild(top);
  menu.appendChild(items);
  document.body.appendChild(menu);
  statusMenuEl = menu;
  const r = chip.getBoundingClientRect();
  menu.style.left = Math.max(8, Math.min(r.left, window.innerWidth - menu.offsetWidth - 8)) + 'px';
  menu.style.top = Math.min(r.bottom + 6, window.innerHeight - menu.offsetHeight - 8) + 'px';
}

/* ---------- toolbar ---------- */
function initToolbar() {
  $('f-search').addEventListener('input', (e) => { state.filters.q = e.target.value; renderDirectory(); });
  $('f-bookmarked').addEventListener('click', () => {
    state.filters.bookmarked = !state.filters.bookmarked;
    renderDirectory();
  });
  $('btn-expand-all').addEventListener('click', () => {
    state.expandAll = !state.expandAll;
    if (state.expandAll) state.open.clear();
    renderDirectory();
  });
  $('f-reset').addEventListener('click', resetFilters);
  $('btn-empty-reset').addEventListener('click', resetFilters);
}

function resetFilters() {
  state.filters = { q: '', priority: '', area: '', location: '', status: '', bookmarked: false, sort: '' };
  $('f-search').value = '';
  state.ddSync.forEach((fn) => fn());
  renderDirectory();
}

/* ---------- files panel ---------- */
function openPanel() { renderPanel(); $('panel-files').hidden = false; document.body.classList.add('no-scroll'); }
function closePanel() { $('panel-files').hidden = true; document.body.classList.remove('no-scroll'); }

function renderPanel() {
  $('files-empty').hidden = state.files.length > 0;
  $('file-list').innerHTML = state.files.map((f) =>
    '<div class="file-row' + (state.file && state.file.id === f.id ? ' active-file' : '') + '" data-id="' + f.id + '">' +
    '<div class="file-line1"><span class="file-name">' + esc(f.name) + '</span>' +
    '<div class="file-actions">' +
    '<button class="mini-btn" data-act="rename" title="Rename">' + SVG.pencil + '</button>' +
    '<button class="mini-btn danger" data-act="delete" title="Delete">' + SVG.trash + '</button>' +
    '</div></div>' +
    '<div class="file-line2"><span class="file-meta">' + f.rows.length + ' professors · ' + fmtDate(f.uploadedAt) + '</span>' +
    '<button class="btn btn-primary btn-open-file" data-act="open">Open</button></div>' +
    '</div>'
  ).join('');
}

function initPanel() {
  document.querySelectorAll('[data-close-panel]').forEach((el) => el.addEventListener('click', closePanel));
  $('panel-add-file').addEventListener('click', () => $('file-input').click());
  $('btn-all-files').addEventListener('click', openPanel);
  $('file-list').addEventListener('click', (e) => {
    const rowEl = e.target.closest('.file-row');
    if (!rowEl) return;
    const act = e.target.closest('[data-act]');
    if (!act) return;
    const id = rowEl.dataset.id;
    const a = act.dataset.act;
    if (a === 'open') { closePanel(); openFile(id); }
    else if (a === 'rename') startFileRename(rowEl, id);
    else if (a === 'delete') deleteFile(id);
  });
  $('panel-clear-all').addEventListener('click', clearAllData);
}

function startFileRename(rowEl, id) {
  const nameEl = rowEl.querySelector('.file-name');
  if (!nameEl) return;
  const input = document.createElement('input');
  input.className = 'rename-input';
  input.value = nameEl.textContent;
  nameEl.replaceWith(input);
  input.focus();
  input.select();
  let done = false;
  const finish = async (commit) => {
    if (done) return;
    done = true;
    if (commit && input.value.trim()) {
      const f = state.files.find((x) => x.id === id);
      if (f) {
        f.name = input.value.trim();
        await dbPut(f);
        await refreshFiles();
        await refreshResume();
      }
    }
    renderPanel();
    rerenderView();
  };
  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') { ev.preventDefault(); finish(true); }
    else if (ev.key === 'Escape') { ev.preventDefault(); finish(false); }
  });
  input.addEventListener('blur', () => finish(true));
}

async function deleteFile(id) {
  const f = state.files.find((x) => x.id === id);
  if (!f) return;
  const ok = await confirmDialog('Delete file?', 'This removes "' + f.name + '" and its bookmarks, notes and statuses from this browser. This cannot be undone.');
  if (!ok) return;
  await dbDel(id);
  if (state.file && state.file.id === id) state.file = null;
  await refreshFiles();
  if (!state.files.length) await metaDel('lastFileId');
  await refreshResume();
  renderPanel();
  if (!state.file) showView('upload');
  else rerenderView();
  toast('File deleted');
}

async function clearAllData() {
  const ok = await confirmDialog('Delete all data?', 'This removes every uploaded file with all bookmarks, notes, statuses and email edits stored in this browser. This cannot be undone.');
  if (!ok) return;
  await dbClear();
  await metaDel('lastFileId');
  state.file = null;
  await refreshFiles();
  await refreshResume();
  renderPanel();
  closePanel();
  showView('upload');
  toast('All data deleted');
}

/* ---------- modal ---------- */
let modalResolve = null;
function confirmDialog(title, message) {
  $('modal-title').textContent = title;
  $('modal-message').textContent = message;
  $('modal').hidden = false;
  return new Promise((res) => { modalResolve = res; });
}
function closeModal(val) {
  $('modal').hidden = true;
  if (modalResolve) { modalResolve(val); modalResolve = null; }
}
function initModal() {
  $('modal-ok').addEventListener('click', () => closeModal(true));
  $('modal-cancel').addEventListener('click', () => closeModal(false));
  document.querySelector('.modal-backdrop').addEventListener('click', () => closeModal(false));
}

/* ---------- toast and clipboard ---------- */
let toastTimer = null;
function toast(msg, err) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.toggle('error', !!err);
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2400);
}

async function copyText(text) {
  if (!text) { toast('Nothing to copy', true); return; }
  try {
    await navigator.clipboard.writeText(text);
    toast('Copied');
  } catch (err) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); toast('Copied'); }
    catch (e2) { toast('Copy failed', true); }
    ta.remove();
  }
}

/* ---------- theme ---------- */
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  $('brand-logo').src = t === 'dark' ? 'assets/edutract-dark.png' : 'assets/edutract-light.png';
  $('theme-toggle').innerHTML = t === 'dark' ? SVG.sun : SVG.moon;
  try { localStorage.setItem('edutract-theme', t); } catch (e) {}
}

function initTheme() {
  let t = null;
  try { t = localStorage.getItem('edutract-theme'); } catch (e) {}
  if (!t) t = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  applyTheme(t);
  $('theme-toggle').addEventListener('click', () => {
    applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  });
}

/* ---------- PWA install ---------- */
function initInstall() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    state.deferredPrompt = e;
    $('btn-install').hidden = false;
  });
  $('btn-install').addEventListener('click', async () => {
    if (!state.deferredPrompt) return;
    state.deferredPrompt.prompt();
    try { await state.deferredPrompt.userChoice; } catch (e) {}
    state.deferredPrompt = null;
    $('btn-install').hidden = true;
  });
  window.addEventListener('appinstalled', () => { $('btn-install').hidden = true; });
}

/* ---------- topbar ---------- */
function initTopbar() {
  $('brand-home').addEventListener('click', async () => { await refreshResume(); showView('upload'); });
  $('btn-add').addEventListener('click', () => $('file-input').click());
  $('btn-bookmarks').addEventListener('click', () => {
    if (state.view === 'bookmarks') { state.file ? showView('directory') : showView('upload'); }
    else showBookmarks();
  });
  $('btn-files').addEventListener('click', openPanel);
  $('btn-back-dir').addEventListener('click', () => {
    state.file ? showView('directory') : showView('upload');
  });
}

/* ---------- global close handlers ---------- */
function initGlobalClose() {
  document.addEventListener('click', () => { closeMenus(); closeStatusMenu(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMenus();
      closeStatusMenu();
      if (modalResolve) closeModal(false);
    }
  });
}

/* ---------- init ---------- */
async function init() {
  initTheme();
  initInstall();
  initUpload();
  initToolbar();
  initPanel();
  initModal();
  initTopbar();
  initGlobalClose();
  bindList($('list'));
  bindList($('bm-list'));
  await openDB();
  await refreshFiles();
  await refreshResume();
  showView('upload');
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

init();
