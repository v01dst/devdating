# DevDating v2 — Onboarding-first redesign (Approach B)

Date: 2026-09-05
Status: Approved — user picked B (clean dashboard + CmdK), wants all: notifications, contribution tracking, onboarding + ease fixes.
Stack: keep FastAPI + Next.js 14 + SQLite default / Postgres supported. No SaaS rewrite.

## 1. Goals / Success criteria
- First run never empty: `devdating up` leaves app with Today's Picks ready.
- CLI simplified: 2-line quickstart, advanced sync commands hidden.
- UI B: sidebar + CmdK + Inbox, light Linear-like, responsive, Today's Picks home.
- Features: Notifications (matches/messages/mentions), Contribution tracking (interested → claimed → pr_open → merged), Onboarding quiz + streak/level retention.
- Clarify auth: explicit local-mode vs GitHub-mode banner.
- No regression: 26 pytest + next build green, swipe-affinity + matching scores unchanged except surfacing reasons.

## 2. Architecture
- Keep `api/app/main.py` FastAPI + `web/` Next.js app router. No new services.
- `bin/devdating up`: ensure_schema (alembic upgrade head) → if project_count==0: seed_local → if GITHUB_TOKEN and no real projects: bulk_sync 200 background. Prints status URL.
- New `GET /api/v1/status` → { seeded, project_count, issue_count, needs_onboarding } for empty-state CTAs.
- BackgroundTasks for GitHub poll (contribution state refresh), no workers/queues in v2.

## 3. Components
### 3.1 First-run / CLI (`bin/devdating`, `scripts/seed_local.py`, `README.md`)
- `up` idempotent bootstrapper, `status` shows PIDs + counts, `sync-*` stay as advanced.
- Rate-limit degrade: banner "Live sync paused — rate limit", fall back to demo seed.

### 3.2 Web UI B (`web/app/layout.tsx`, new components)
- `Sidebar`: Discover / Projects / Issues / Inbox(•) / Matches / Profile. Mobile drawer.
- `CommandPalette`: Ctrl-K, searches projects/issues/actions via existing list APIs.
- `OnboardingWizard` at `/onboarding`: 3 steps (languages → level → goals) → PATCH `/me/preferences`.
- Home `/` (or `/discover` hero kept): Today's Picks top-3 cards + streak/level + Inbox preview.
- Theme: CSS vars, light default, dark via `data-theme`. Keep Tailwind + Framer Motion.
- AuthBanner: local-mode vs GitHub sign-in.

### 3.3 Notifications
- Model `notifications(id,user_id,type,title,body,link,read,created_at)`.
- APIs: `GET /notifications?unread_only`, `PATCH /notifications/{id}/read`, `POST /notifications/read-all`.
- Emit on: match created, message received, maintainer approved. Inbox UI polls / TanStack Query.

### 3.4 Contribution tracking
- Model `contributions(id,user_id,issue_id,repo,state,pr_url,updated_at)` states: interested|claimed|pr_open|merged.
- APIs: `GET /contributions`, `POST /contributions/claim {issue_id}`, `PATCH /contributions/{id} {state,pr_url}` + auto-refresh from GitHub issue state on sync.
- Profile shows readiness + active contributions + merged count.

### 3.5 Discovery (unchanged logic, clearer UX)
- Keep `matching.calculate_compatibility` + `affinity_boost` + `build_reasons`. Surface reason strings in cards.
- Merge filter state across Projects/Issues/Community in sidebar, keep `/discover` swipe deck hero.

## 4. Data flow
- Boot: CLI → alembic → seed/sync → API ready → web reads `/status` → onboarding or picks.
- Swipe: `POST /swipes` → affinity update → `GET /discovery/cards` reranked → match ≥65 → notification + starter issue.
- Claim: `POST /contributions/claim` → notification to maintainer if claimed → chat via Socket.IO (direct-to-API, unchanged).
- Sync: `bulk_sync` upserts projects/issues + refreshes contribution states + emits notifications.

## 5. Error handling
- Empty DB: never blank — seed + CTA to `sync-bulk` / connect token.
- GitHub 403/rate-limit: log, banner, keep serving cached.
- Alembic: `up`/`upd` auto-baseline pre-migration DBs (existing pattern).
- Socket.IO OAuth-mode cookie limitation (known): out of scope, document.

## 6. Testing
- Backend pytest: status, notifications CRUD, contributions state machine, onboarding prefs persist.
- Frontend: `npm run build`, 11 routes still green, manual: all pages 200, socket handshake 200.
- Live verify: fresh `up` on empty DB shows picks, CmdK works, Inbox badge increments on match.

## 7. Rollout / Migrations
- One Alembic migration: create notifications + contributions.
- `devdating upd` upgrades packages + `alembic upgrade head` + restart.
- Docs: update README quickstart to 2 lines, troubleshooting empty-start removed (fixed by design).

## 8. Out of scope (YAGNI)
- AI summaries, Postgres-by-default, Redis queues/workers, SaaS teams, full rewrite. Socket cookie cross-origin fix deferred.
