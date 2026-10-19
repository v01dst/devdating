# Full app reskin — the landing look, everywhere (2026-10-19, stage 3)

**Ask:** "طبق التصميم دا للمشروع" + footer icons like GitHub / MIT / built with
next.js + fastapi / Discord, and (correction from the user) the DiscO link must point at
the maintainer (9p.1), and the design must apply to **every** page of the app, not just a
landing that hands you off to a different-looking product.

## What shipped

1. **Route restructure** — the whole app chrome moved out of `app/layout.tsx`:
   - `app/layout.tsx` = bare root (fonts, Providers, globals).
   - `app/(app)/layout.tsx` = TopNav + AuthBanner + Sidebar + CommandPalette + Footer.
   - All 11 app routes moved into `app/(app)/` (URLs unchanged); the old picks home
     moved to `app/(app)/picks` (currently orphaned, nothing links to it — example: add
     it to TopNav or delete).
   - The landing owns `/` with no chrome (full-bleed, as designed).
2. **Design tokens** — `tailwind.config.ts` + `globals.css` now carry the landing palette:
   `surface #0b0b0d`, `raised #17171d`, `ink/soft/dim`, `line`, `accent #7c5cff`,
   semantic `signal/like/pass/heart/warn`; Fredoka/Space Grotesk/IBM Plex Mono via
   next/font variables (`--font-round/-grot/-label`, declared once in the root layout;
   the landing page no longer declares its own copies). `.card`, `.nav-link`,
   `.nav-active`, `.btn-primary`, `.input`, `.chip`, `.chip-accent`, `.skeleton` are the
   shared dark components.
3. **Mechanical sweep** — two codemod passes over all 35 tsx files mapped the old
   light-theme utilities to tokens (`text-zinc-900 -> text-ink`, `bg-white -> bg-raised`,
   `bg-violet-* -> bg-accent/*`, `emerald -> like`, `rose -> heart`, `amber -> warn`,
   `sky -> signal`, etc). Final leftover scan: 0 hits.
4. **Hand polish** — chrome rewritten: brand glyph (stack + heart) in nav/footer, mono
   lowercase search pill with ⌘K, mono tip card, sidebar glyphs (heart emoji replaced),
   CommandPalette on `card` + `data-palette-open` (fixes swipe-hotkeys firing over the
   palette), MatchModal burst art palette + Phosphor heart instead of emoji,
   em-dashes removed from copy (inbox/contributions/onboarding), empty states use ✦.
5. **Footer icons** — `components/BrandIcons.tsx` (Simple Icons CC0 paths: github,
   discord, nextdotjs, fastapi, opensourceinitiative=M/MIT mark). Footer + landing
   footer show: github / MIT / next.js / fastapi / discord: 9p.1. **Discord points at
   the maintainer: https://discord.com/users/9p.1** (swap for a numeric
   `users/<id>` URL if the username URL ever stops resolving).
6. **Landing CTA bug fixed** — the hero "start swiping" pill rendered cream-on-cream
   because `.page a { color: inherit }` (element+class, 0-1-1) outranked every
   single-class link color (0-1-0). Removed; Tailwind preflight already handles
   link resets in the app.
7. **Mobile fix** — discover deck container `min-h-[72vh]` on small screens so the
   swipe card no longer overlaps the Index button above it.
8. **Swipe action icons** — the swipe deck buttons (undo / pass / super-like / like) now
   use real Phosphor fill SVG shapes from `components/UiIcons.tsx` instead of text glyphs
   (↩ ✕ ★ ♥), with a small hover animation (scale, star tilts). Plain bold X, not the
   squared `x-fill`. Landing page keeps its own inline phosphor heart/arrow.

## Incident — PowerShell encoding (READ THIS NEXT SESSION)

The first codemod read files with `Get-Content -Raw` and wrote with `Set-Content -Encoding UTF8`.
This machine's PowerShell defaults to the **cp1256 (Arabic) ANSI codepage** and the files were
BOM-less UTF-8 → every non-ASCII char (emoji, arrows, ✓ stars, …, —) was decoded as cp1256
and saved back as mojibake (e.g. `💜` -> `ًں’œ`), plus a UTF-8 BOM on all 26 written files.

- Recovery: enc→cp1256 byte round-trip per file (lossless inverse), guarded with
  `EncoderFallback.ExceptionFallback` + FFFD check; 25 files repaired, 1 BOM-strip.
- One straggler (`RespondButtons` `âœ“`) had no Arabic chars so it escaped the first guard;
  found by comparing per-file non-ASCII runs and fixed by hand.
- Two more gave the guard false positives on legit `×` (U+00D7) — verified by codepoint, no change.
- **Rule for this machine: never `Get-Content`/`Set-Content` UTF-8 source files in
  PowerShell. Use `[System.IO.File]::ReadAllText/WriteAllText` with `UTF8Encoding($false)`.**
- Note: `git show` output captured into a PS variable is mangled the same way — read git
  blobs via `git show ... | Out-File` + .NET read, or `git -c core.quotepath=false` with
  byte-safe tooling, if you ever need HEAD comparisons.

## Verification

- `next build` green — 14 routes (landing static 1.96 kB). All app URLs unchanged.
- Live check (prod server :3100, API :8000): `/`, `/discover`, `/projects`, `/inbox`,
  `/matches`, `/profile` all HTTP 200.
- Screenshots: `.playwright-mcp/rk-{landing,discover,projects,matches,inbox,profile,contributions}.png`
  + `rk-discover-mobile.png` — dark theme consistent across pages, footer icons render.
- DB note: local `api/devdating.db` was empty this session -> `alembic upgrade head`
  (api venv) + `scripts/seed_local.py` = 5 demo projects, `needs_onboarding=false`.
  `/issues` and `/community` will stay empty until a real GitHub sync runs.

## Seed data — real projects, no placeholders

`scripts/seed_local.py` used to create 5 fake projects with `github.com/example/...`
links. Replaced with **7 real repositories** and metadata fetched live from the GitHub
API on 2026-10-19 (fastapi/fastapi, scikit-learn/scikit-learn, pydantic/pydantic,
vitejs/vite, withastro/astro, rust-lang/rustlings, vercel/next.js) — real URLs, real
descriptions, real star/fork/issue counts, real topics. `contributor_count` now uses
the same formula as the real ingest (`min(1000, stars // 50)`); `activity_score` is a
documented `pushed_at`-recency estimate; `difficulty_level` is a documented starter
estimate. Demo user email moved off `example.com` to `devdating.local`. Local DB was
rebuilt (delete db → `alembic upgrade head` → seed) and verified: `/projects` renders
all 7 with working repo links. The Index action still layers live GitHub sync on top.

## Follow-ups

- `/picks` is orphaned after the move (decide: link it or delete it).
- `design/landing/index.html` (the standalone artifact) is now the *reference*, not the
  source of truth; it does not carry the footer icon row yet.
- Optional: OpenDesign skills for the next iteration (`threejs`/`shader-dev` centerpiece,
  `screenshots-marketing` for README shots).
