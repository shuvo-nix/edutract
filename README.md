# EduTract — Professor Directory

A fast, minimal, fully client-side web app to manage your academic application master lists.

## ✨ What it does

- **Multi-file support** — upload as many Excel master lists as you like (.xlsx / .xls); every file keeps its own bookmarks, notes, statuses and email drafts
- **File manager** (folder icon) — all your files in one place: open, rename inline, or delete with a confirmation dialog; shows entry count and last-accessed time
- **Master bookmarks** (star icon) — bookmarked entries across **all** files, grouped by file; click one to jump straight to it
- **Collapsible cards** for every professor / lab / project — click to expand all details and links
- **Filters:** full-text search, priority, research area, location, contact status, bookmarked-only, and sorting
- **Auto-generated email drafts** per entry — editable, one-click copy, and "open in mail app"
- **Dark / light mode**, fully responsive, modern minimal SVG icons

## 📊 Expected Excel format

The app reads the first sheet whose name contains "Master" (or the first sheet). Recommended columns:

`Priority | Name | Institution/lab | Role | Research fit | Hiring status | Email | Website | Profile/vacancy | Documents/route | Suggested angle | Status`

Header matching is flexible — close variants work too. Research areas and locations are auto-detected and become filters.

## 🚀 Run on GitHub Pages

1. Go to the repository → **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: **main** / **(root)** → **Save**
4. Your site will be live at: `https://shuvo-nix.github.io/edutract/`

## 💻 Run locally

Just open `index.html` in any modern browser — no build step, no dependencies to install.

## 🔒 Privacy

Everything runs 100% in your browser. Your files, bookmarks, notes, and drafts are stored only in your browser's `localStorage` and never leave your device.

## 🛠 Tech

Vanilla HTML / CSS / JS + SheetJS (CDN). No backend, no tracking, no cookies.
