# DevDating — Autonomous Development Progress

## Goal
Continuously improve the project: fix UI/responsiveness, header/footer, README images, and any bugs found.

## Completed
- [x] Stage A: OAuth sessions, Alembic, difficulty scoring, CI
- [x] Stage B: swipe-affinity reranking, profile dashboard, matches + chat UI
- [x] Stage C: Socket.IO chat, maintainer claiming, two-way matching
- [x] Responsive TopNav (client component, mobile hamburger, auto active state)
- [x] Footer component (Discord 9p.1, GitHub, npm links)
- [x] Root layout hosts TopNav + Footer (single source)
- [x] README: screenshots, Discord/npm badges, roadmap updated
- [x] Fix: experience_level preference now persists (was silently ignored)
- [x] Fix: UserRead exposes preferences/availability for profile display
- [x] Fix: web/package-lock.json tracked (CI `npm ci` needs it)
- [x] Fix: Socket.IO client connects directly to API origin (true WebSocket; proxy dropped upgrades + trailing-slash 308)
- [x] Improvement: sync-me infers experience level from GitHub stats (public_repos, followers)
- [x] Home redirect -> /discover
- [x] Fix: config default DB -> portable SQLite (alembic/manual runs no longer hang on postgres default)
- [x] Fix: bin/devdating ensure_schema (alembic upgrade head) before sync/seed commands
- [x] README: troubleshooting snippet sources devdating.env before direct alembic
- [x] Tech debt: removed create_all from sync scripts (Alembic is the only schema path)
- [x] Tech debt: socket-token endpoint + token-auth handshake (OAuth-mode Socket.IO no longer needs the session cookie)
- [x] Realtime notifications: user rooms, push after commit, unread-count endpoint, live nav badge
- [x] Contribution tracking: `last_synced_at` + GitHub PR sync (CLAIMED -> PR_OPEN -> MERGED), manual override UI
- [x] Tracking CTAs from match detail and issue feed; Inbox + Contributions pages rebuilt
- [x] UI redesign stage: landing at `/` + **full dark reskin of all app pages** (tokens in
      tailwind.config + globals.css, codemod over 35 tsx files, chrome rewritten, footer brand
      icons github/MIT/next.js/fastapi/discord->9p.1) — see records/2026-10-19/full-app-reskin.md
- [x] Seed data: **real GitHub projects** (7 repos, real links + metrics snapshot 2026-10-19)
      replace the `github.com/example/...` placeholders; live Index/sync layers on top
- [x] Full security & correctness audit: socket CORS `*`, 0.0.0.0 binds (loopback by
      default now), docker port exposure, session-secret guard, token env-injection guard,
      stale GitHub token bug, npm cli.js tool-check bug, installer CSRF, web security
      headers, path encoding — see records/2026-10-19/security-audit.md

## Remaining / Candidates
- [ ] Decide `/picks` fate: link it from TopNav or delete (orphaned after the landing took `/`)
- [ ] Contribution sync for maintainers (swap repo-local search for timeline API when token scopes allow)
- [ ] Notification digest / email delivery (mentions, matches, messages)
- [ ] Contribution readiness insights on the profile dashboard

## Verification
- Backend: 60 pytest passing, ruff clean, alembic up/down/up green
- Frontend: next build green (14 routes)
- Live: all 11 pages HTTP 200; token socket handshake + live notification push verified in a real browser