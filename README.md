# DevDating

A mobile-first platform that matches open-source contributors with suitable repositories.

## Stack

- **Web:** Next.js 14, React, Tailwind CSS, Framer Motion
- **API:** FastAPI, SQLAlchemy 2, Pydantic v2
- **Database:** PostgreSQL 16
- **Cache / queues:** Redis 7
- **Realtime:** Socket.IO service
- **ML:** Scikit-learn
- **Infrastructure:** Docker Compose with Kubernetes-ready services

## Local Development

```bash
cp .env.example .env
docker compose up --build
```

Services:

- Web: http://localhost:3000
- API docs: http://localhost:8000/docs
- API health: http://localhost:8000/healthz
- PostgreSQL: localhost:5432
- Redis: localhost:6379

The initial alpha includes health checks, SQLAlchemy models, profile/discovery/swipe/match/chat routes,
deterministic explainable scoring, rule-based issue recommendations, a mobile-first landing page,
and a Framer Motion swipe deck.

## Validation

```bash
cd api && python -m pytest
```
