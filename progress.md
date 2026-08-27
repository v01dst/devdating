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

## Remaining / Candidates
- [ ] Sync scripts still call create_all (bulk_sync, sync_personal) — redundant now that ensure_schema runs alembic; could remove for cleanliness
- [ ] OAuth-mode Socket.IO auth relies on cookie (cross-origin direct connection won't send it) — needs token-in-query or shared cookie domain
- [ ] Notification delivery (mentions, matches, messages)
- [ ] Contribution tracking (issue -> PR -> merge)

## Verification
- Backend: 26 pytest passing, ruff clean
- Frontend: next build green (11 routes)
- Live: all pages HTTP 200, socket.io polling handshake 200