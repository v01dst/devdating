# Build — 2026-08-25

## Web (Next.js 14)

- Command: `cd web && npm run build`
- Result: success (exit 0), includes lint + TypeScript check.
- Next.js 14.2.35, static generation 7/7 pages.

```
Route (app)                              Size     First Load JS
┌ ○ /                                    137 B          87.4 kB
├ ○ /_not-found                          875 B          88.1 kB
├ ƒ /community                           181 B          96.1 kB
├ ƒ /issues                              181 B          96.1 kB
└ ƒ /projects                            181 B          96.1 kB
```

## API

- No separate build step (FastAPI runs from source); validated via pytest + live smoke test.
- [23:57:39] npm run build (web): success, lint+types clean(no message)
