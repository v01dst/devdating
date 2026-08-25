<div align="center">

<img src="docs/images/banner.svg" width="100%" alt="DevDating banner" />

# DevDating

**The fastest way to find real open-source projects and beginner-friendly issues worth solving.**

DevDating scans public GitHub repositories, understands your technical profile, and turns thousands of open issues into a focused, searchable contribution feed. No endless GitHub searching. No random “awesome lists.” Just relevant projects and actionable issues.

[![Install globally](https://img.shields.io/badge/install-npm%20i%20--g%20%40v01dst%2Fdevdating-7c5cff?style=for-the-badge&logo=npm)](https://www.npmjs.com/package/@v01dst/devdating)
[![GitHub](https://img.shields.io/badge/source-GitHub-181717?style=for-the-badge&logo=github)](https://github.com/v01dst/devdating)
[![License](https://img.shields.io/badge/license-MIT-22c55e?style=for-the-badge)](./LICENSE)

</div>

## 💡 The Idea

Most developers want to contribute to open source, but they get stuck before writing any code:

- “Which project should I choose?”
- “Is this issue actually beginner-friendly?”
- “How do I know the project is active?”
- “Where are good first issues in my language?”

**DevDating solves discovery first.**

It indexes public repositories and real GitHub issues, then helps you filter by:

- Programming language
- Topic and keywords
- Project activity
- Stars and forks
- Open issue count
- Labels like `good first issue`, `help wanted`, documentation, and beginner

Instead of browsing dozens of repositories manually, you get a clean project and issue discovery experience.

<div align="center">
<img src="docs/images/install-flow.svg" width="720" alt="DevDating install flow" />
</div>

## 👥 Who Is This For?

### New contributors
Find approachable issues without spending hours searching GitHub. Filter for `good first issue` in your language.

### Students and career switchers
Build a real public portfolio by contributing to active projects instead of only doing tutorials.

### Working developers
Discover useful open-source projects by language, topic, activity, ecosystem, and maintenance signal.

### Open-source maintainers
Make your repository easier to discover through topics, descriptions, labels, and healthy issue metadata.

### Hackathon participants
Quickly locate projects with open tasks in TypeScript, Python, Go, Rust, JavaScript, Java, C++, and more.

## 🚀 Quick Start

Install globally:

```bash
npm install -g @v01dst/devdating@latest
devdating install
```

Start the app:

```bash
devdating up
```

Open:

| Page | URL |
|---|---|
| Projects | http://localhost:3000/projects |
| Issues | http://localhost:3000/issues |
| Community Questions | http://localhost:3000/community |
| API Docs | http://localhost:8000/docs |

You can also run it directly without a global install:

```bash
npx @v01dst/devdating up
```

## 🧭 How To Use DevDating

### 1. Install and launch

```bash
npm install -g @v01dst/devdating@latest
devdating install
devdating up
```

The app uses a portable local SQLite database by default, so you do not need to configure PostgreSQL locally.

### 2. Personalize from GitHub

```bash
devdating sync-me
```

This reads your connected GitHub profile, detects your commonly used languages, and updates your contributor preferences.

### 3. Index projects and issues

Index 500 beginner-friendly issues:

```bash
devdating sync-bulk 500
```

For larger datasets:

```bash
devdating sync-bulk 1000
devdating sync-bulk 2500
```

This searches GitHub across languages such as:

TypeScript · JavaScript · Python · Go · Rust · Java · Kotlin · Swift · C · C++ · C# · PHP · Ruby · Dart · Elixir · Lua · Scala · Haskell · Solidity · Vue · Svelte

### 4. Improve project metadata

Some repositories do not expose complete language data through search alone. Refresh it with:

```bash
devdating enrich-languages
```

### 5. Search projects

Open `/projects`.

You can filter by:

- Language
- Keyword
- Topic
- Most active
- Most stars
- Most open issues
- Alphabetical order

Each project shows its description, languages, stars, forks, open issues, activity score, license, and repository link.

### 6. Find issues to solve

Open `/issues`.

Filter by:

- Language
- `good first issue`
- `help wanted`
- Documentation
- Beginner-friendly labels
- Free-text search

Then click **Open Issue** to jump straight to GitHub.

### 7. Explore community questions

Open `/community`.

This highlights question-style discussions from indexed projects, which is useful if you want to build context before submitting code.

## 📦 CLI Reference

| Command | Purpose |
|---|---|
| `devdating install` | Download dependencies and initialize the local database |
| `devdating up` | Start web and API services |
| `devdating stop` | Stop running services |
| `devdating status` | Show service status |
| `devdating logs [api\|web]` | Tail service logs |
| `devdating sync-me` | Detect your GitHub languages and update your profile |
| `devdating sync-bulk <count>` | Bulk-index beginner-friendly GitHub issues |
| `devdating enrich-languages` | Improve repository language metadata |
| `devdating sync-questions` | Index community question-style issues |
| `devdating doctor` | Check required tools |

## 🔄 Upgrade Guide

To upgrade an existing installation:

```bash
npm install -g @v01dst/devdating@latest
devdating install
```

If you installed from Git:

```bash
cd ~/.devdating
git pull --ff-only
./bin/devdating install
```

If migrations or schema changes were introduced:

```bash
cd ~/.devdating/api
../.venv/bin/python - <<'PY'
import asyncio
from app.db import Base, engine
import app.models

async def upgrade():
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

asyncio.run(upgrade())
PY
```

After upgrading:

```bash
devdating stop
devdating up
```

To refresh stale GitHub data:

```bash
devdating sync-me
devdating sync-bulk 1000
devdating enrich-languages
```

## 🖼 Screens

### Projects

Browse public repositories that are ready for contribution.

![Projects screen](docs/images/projects.svg)

### Issues

Search real beginner-friendly issues from live GitHub data.

![Issues screen](docs/images/issues.svg)

## ⚙️ Requirements

| Requirement | Version |
|---|---|
| Node.js | 18+ |
| Python | 3.11+ |
| Git | Latest recommended |

Docker is optional.

## 🧱 Tech Stack

- **Frontend:** Next.js 14, React, Tailwind CSS, Framer Motion
- **Backend:** FastAPI, SQLAlchemy 2, Pydantic v2
- **Database:** SQLite for portable local mode; PostgreSQL supported
- **Data source:** GitHub REST API
- **Deployment:** Docker Compose and Kubernetes-ready manifests

## 🛠 Local Development

Clone and start with Docker:

```bash
git clone https://github.com/v01dst/devdating.git
cd devdating
cp .env.example .env
docker compose up --build
```

Run native development mode:

```bash
git clone https://github.com/v01dst/devdating.git
cd devdating
./bin/devdating install --mode native
./bin/devdating up
```

Run backend tests:

```bash
cd api
pytest
```

Build the frontend:

```bash
cd web
npm install
npm run build
```

## 🗺 Project Roadmap

- ✅ Public project discovery
- ✅ Real GitHub issue indexing
- ✅ Language-aware filtering
- ✅ Bulk GitHub sync
- ✅ Community question discovery
- 🔜 Maintainer profiles and project claiming
- 🔜 Two-way matching between maintainers and contributors
- 🔜 Direct chat after match
- 🔜 Smart issue recommendations with difficulty scoring
- 🔜 Contribution tracking from issue to merged pull request

## 🤝 Contributing To DevDating

1. Fork the repository.
2. Create a branch.
3. Make a focused change.
4. Run tests and build checks.
5. Open a pull request with a clear explanation.

Good first contributions include UI improvements, accessibility fixes, tests, docs, filters, sorting options, and GitHub ingestion improvements.

## 📬 Contact & Support

Need help, want to suggest a feature, or found something broken?

Join or message me on Discord:

```text
9p.1
```

GitHub Issues:

https://github.com/v01dst/devdating/issues

## 📄 License

MIT — see [`LICENSE`](./LICENSE).
