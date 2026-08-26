# Project Records

This folder is the dated operational log of the DevDating project. Every test run,
build, fix, migration, and incident gets recorded here so the project history is
auditable.

## Layout

```
records/
  README.md                  <- this file
  YYYY-MM-DD/                <- one folder per calendar day (UTC)
    fixes.md                 <- bugs found + how they were fixed
    tests.md                 <- backend/frontend test run results
    build.md                 <- web/API build results
    smoke.md                 <- live runtime checks
    incidents.md             <- outages, regressions, rollbacks (when applicable)
```

## Conventions

- One folder per day, named `YYYY-MM-DD` (UTC).
- Files are plain Markdown; prepend new entries at the top with an ISO timestamp.
- Never delete past records; append a correction entry instead.

## Recording entries

Use `scripts/record.sh <category> <message>`, which appends a timestamped line to
`records/<today>/<category>.md`:

```bash
./scripts/record.sh tests "pytest api/tests: 4 passed"
./scripts/record.sh build "next build: success"
```

Valid categories: `fixes`, `tests`, `build`, `smoke`, `incidents`, `notes`.
