# Local Operations Runbook

## Start Stack

```bash
cp .env.example .env
docker compose up --build
```

## Health Checks

- API: `curl http://localhost:8000/healthz`
- Web: `open http://localhost:3000`
- OpenAPI: `open http://localhost:8000/docs`

## Current Alpha Boundaries

- GitHub OAuth is scaffolded but production session issuance is not complete.
- Project sync uses placeholder data until ingestion workers are connected.
- Matching is deterministic and explainable; ML reranking is not enabled.
- Socket.IO chat is not yet implemented.

## One-Line Install

```bash
curl -fsSL https://raw.githubusercontent.com/v01dst/devdating/main/install.sh | bash
```

The installer automatically selects Docker when available and native SQLite otherwise.
It installs `devdating`, initializes the database, and prints launch instructions.

```bash
devdating up --seed
```

For an attached production process that keeps both services alive:

```bash
devdating serve
```

## Next Implementation Priorities

1. Replace development bearer-token identity with signed session cookies and PKCE OAuth.
2. Generate database migrations with Alembic and add integration fixtures.
3. Implement GitHub REST/GraphQL repository synchronization with durable cursors.
4. Add maintainer claiming and project-side matching preferences.
5. Implement Socket.IO authentication, rooms, delivery events, and reconnect handling.
