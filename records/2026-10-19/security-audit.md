# Full security & correctness audit — 2026-10-19

Scope: the whole repo (api, web, scripts, bin, npm, installer_ui, docker-compose, CI).
Method: pytest + ruff, targeted code reading, repo-wide greps for secrets and
dangerous patterns, live probing of the running services. Everything below was
fixed in the same pass unless marked "noted".

## Verified clean
- 60/60 API tests, ruff clean, web build green (rebuilt after fixes).
- No real secrets in the repo: `.gitignore` covers `.env`, `devdating.env`,
  `devdating.db*`, `.next`, `__pycache__`. Only fake fixtures (`ghp_valid123`)
  and a UI placeholder exist. GitHub token lives in `devdating.env` (0600,
  atomic writes) and is never returned by any API or log.
- OAuth flow: random state + `secrets.compare_digest`, httponly/lax cookies,
  `secure` cookie outside local. Session vs socket tokens are purpose-separated.
- SQLAlchemy everywhere (no string SQL), all Pydantic schemas length-bounded,
  query limits clamped (`le=50..200`), repo names regex-validated.
- No `eval`/`pickle`/`shell=True` on user input; installer subprocess calls use
  static commands; k8s manifest uses secretRef; CI has no secrets.

## Fixed
1. **Sockets open to any website (CORS `*`)** — `api/app/socket.py` accepted
   cross-origin WebSocket handshakes from any origin; in local mode an
   unauthenticated socket fell back to the single local user, so a malicious
   page could join the user's personal notification room. Fix: explicit
   allow-list (WEB_ORIGIN + localhost/127.0.0.1 on ports 3000/3100) and the
   dev fallback now additionally requires `ENVIRONMENT=local`.
2. **Loopback by default** — `bin/devdating up` and `bin/devdating-serve`
   bound API *and* web to `0.0.0.0`, so anyone on the same Wi-Fi could use the
   app without auth in local mode. Fix: `DEVDATING_BIND_HOST` (default
   `127.0.0.1`); LAN access is an explicit opt-in (documented in .env.example).
3. **Docker port exposure** — compose published Postgres/Redis/API/web on all
   interfaces (Postgres had default `devdating` credentials). Fixed with
   `127.0.0.1:` prefixes.
4. **Session secret fail-closed** — outside `ENVIRONMENT=local` the signer now
   refuses default/empty secrets instead of silently signing with
   "development-secret". First-run `devdating.env` now gets a random secret.
5. **Token env-injection guard** — `github_token.py` rejects any saved token
   that is not `[A-Za-z0-9_]+` (a newline would inject extra variables into
   devdating.env) and sanitizes the stored login.
6. **Stale GitHub token** — `github_ingest.py` read the token once at import
   (tokens saved from Settings never applied without a restart) and fell back
   to using the OAuth *client secret* as a PAT. Fixed: call-time
   `os.environ` read, client-secret fallback removed.
7. **npm/cli.js** — `!status === 0` meant the tool check never failed; the
   unused `download()` helper followed arbitrary redirects; `$HOME` was
   interpolated into single-quoted shell strings. Fixed: proper status check,
   dead code removed, env-var passing.
8. **Installer UI CSRF** — `/api/install` and `/api/seed` accepted cross-site
   POSTs (seed wipes and re-seeds data). Now gated by an Origin check.
9. **Web security headers** — added `X-Frame-Options: DENY`,
   `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`,
   `Referrer-Policy: no-referrer`, `poweredByHeader: false`.
10. **Path encoding** — `/matches/[id]` interpolated the raw route param into
    the backend URL; now `encodeURIComponent`.
11. **Socket message cap** — WS `message` payload was unbounded (REST caps at
    8000); now capped identically. Also hardened the case `data` is None.
12. **Dead route** — removed unreferenced hidden `/api/v1/healthz` duplicate.
13. `.env.example` documents the bind-host/WEB_ORIGIN LAN opt-in.

## Noted (intentional, left as-is)
- Framer Motion `initial={{opacity:0}}` blocks are invisible without JS —
  acceptable for this local app; everything else is server-rendered HTML.
- `apiFetch` forwards all cookies to the API — single-app local cookie jar,
  the API ignores unknown cookies.
- Stagger items below the fold animate in on scroll (by design).

## Live verification caught two more correctness bugs (fixed)
1. **Match decisions ignored the affinity boost** — the discovery card showed
   `base + boost`, but `POST /swipes` compared the raw base score to the 65
   threshold. A card could display "69% match" and still never match. The
   swipe handler now computes the same boosted `final_score` (helper
   `_language_affinity_for_user` shared by both endpoints) and uses it for the
   swipe row, the match decision, the match record and the notification.
   Verified live: next.js displayed 75.25 → swipe returned `MATCHED` 75.25.
2. **Cold-start demo never reached the threshold** — with the real-repo seed,
   every project scored 55–59 for the two-language demo developer. The demo
   profile now seeds a realistic four-language stack (python/typescript/
   javascript/rust), producing a 47–75 spread with a first-swipe match.

Live checks after the fixes: Socket.IO handshake `[accepted]` (ChatBox shows
"live"), `evil.example` origin rejected with 400, security headers present,
API health OK, 60/60 tests, ruff clean, production build green.

## Runbook
- Dev entrypoint must be `app.asgi:application` (mounts Socket.IO). Running
  `app.main:app` serves HTTP but every socket handshake 403s — that produced
  the "WebSocket /socket.io 403" log spam seen in earlier sessions.
- If sockets stop working after a config change, check the console for
  engine.io origin rejection messages first (allowed origins live in
  `api/app/socket.py:_allowed_socket_origins`).
