# Smoke — 2026-08-25

Live runtime check after fixes (uvicorn on 127.0.0.1:8111, existing SQLite DB):

| Endpoint | Result |
|---|---|
| `GET /healthz` | `{"status":"ok"}` |
| `GET /api/v1/me` (bearer dev token) | 200, returns synced user profile |
| `GET /api/v1/projects/public?limit=2` | 200, real indexed repos returned |
| `GET /api/v1/discovery/cards?limit=3` | 200, scored cards with reasons |

Server stopped cleanly afterwards; production services in `.run/` were left untouched (they were
stopped before the smoke test).
- [23:57:40] uvicorn live check on :8111 — healthz/me/projects/cards all 200(no message)
