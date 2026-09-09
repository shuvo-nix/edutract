# EduTract | Professor Directory

A fast, minimal, fully client-side web app to manage your academic application master lists.

## What it does

- **Multi-file support**: upload as many Excel master lists as you like (.xlsx / .xls); every file keeps its own bookmarks, notes, statuses and email drafts
- **Auto-resume**: refresh opens your last file directly, no re-uploading. The EduTract logo always takes you home
- **File manager** (folder icon): all your files in one place, open, rename inline, delete with a confirmation dialog, or delete all data
- **Master bookmarks page** (star icon): a unified page with all bookmarked entries across all files, with the same search, filters and sorting as the directory
- **Status tracking**: every entry starts as Saved. Tap the status chip to open a colored chip menu and set Saved, Ready, Contacted, Followed, Responded, Applied, Interview, Accepted, Rejected or No response. The status filter follows your choices
- **Collapsible cards** for every professor / lab / project: click to expand all details and links
- **Filters**: full-text search, priority, research area, location, status, bookmarked-only, and sorting
- **Auto-generated email drafts** per entry: editable, one-click copy, open in mail app; text wraps responsively on any screen
- **Dark / light mode**, fully responsive, modern minimal SVG icons

## Expected Excel format

The app reads the first sheet whose name contains "Master" (or the first sheet). Recommended columns:

`Priority | Name | Institution/lab | Role | Research fit | Hiring status | Email | Website | Profile/vacancy | Documents/route | Suggested angle | Status`

Header matching is flexible. Close variants work too. Research areas and locations are auto-detected and become filters.

## Run on GitHub Pages

1. Go to the repository, then Settings, then Pages
2. Source: Deploy from a branch
3. Branch: main / (root), then Save
4. Your site will be live at: https://shuvo-nix.github.io/edutract/

## Run locally

Just open index.html in any modern browser. No build step, no dependencies to install.

## Privacy

Everything runs 100% in your browser. Your files, bookmarks, notes, and drafts are stored only in your browser's localStorage and never leave your device.

## Tech

Vanilla HTML / CSS / JS + SheetJS (CDN). No backend, no tracking, no cookies.
