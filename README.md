# EduTract · Professor Directory

A fast, minimal, fully client-side web app to manage your academic application master lists.

## Features

- Multi-file support: upload as many Excel master lists as you like (.xlsx / .xls). Every file keeps its own bookmarks, notes, statuses and email drafts
- Auto-open: your last file opens automatically on refresh, no landing page detour
- File manager (folder icon): open, rename inline, or delete files with a confirmation dialog. Shows entry count and last-accessed time. Delete-all lives here too
- Bookmarks page (star icon): a unified page of all bookmarked entries across all files, with file badges and Open-in-file jump buttons
- Collapsible cards: click any entry to expand all details and links
- Filters: full-text search, priority, research area, location, status, bookmarked-only, and sorting
- User-set status: each entry has a status chip dropdown you control (Not contacted, Emailed, Applied, Interview, No response, Rejected). No auto-assigned statuses
- Email drafts: auto-generated per entry, editable, wrap responsively, one-click copy, open-in-mail-app
- Dark / light mode, fully responsive, modern minimal SVG icons

## Expected Excel format

The app reads the first sheet whose name contains "Master" (or the first sheet). Recommended columns:

`Priority | Name | Institution/lab | Role | Research fit | Hiring status | Email | Website | Profile/vacancy | Documents/route | Suggested angle | Status`

Header matching is flexible. Close variants work too. Research areas and locations are auto-detected and become filters.

## Run on GitHub Pages

1. Repository, Settings, Pages
2. Source: Deploy from a branch
3. Branch: main / (root), Save
4. Site URL: https://shuvo-nix.github.io/edutract/

## Run locally

Open index.html in any modern browser. No build step, no dependencies.

## Privacy

Everything runs 100% in your browser. Your files, bookmarks, notes, and drafts are stored only in localStorage and never leave your device.

## Tech

Vanilla HTML / CSS / JS + SheetJS (CDN). No backend, no tracking, no cookies.
