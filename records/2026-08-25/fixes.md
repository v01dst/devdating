# Fixes — 2026-08-25

- [23:40] `api/app/routes.py` (`create_message`): `conversation.last_message_at` was assigned
  `message.created_at` before the ORM flush, so it was always `NULL`. Now both the message and the
  conversation use an explicit `datetime.now(UTC)`.
- [23:41] `api/app/github_ingest.py` (`upsert_project_from_search_item`): passed a nonexistent column
  kwarg `github_repo_id_unique=repo["id"]`, which raised `TypeError` on every invocation. Removed the
  kwarg, added a duplicate `github_repo_id` guard, and wrapped the GitHub client in an async context
  manager to stop leaking HTTP connections.
- [23:41] `api/app/github_ingest.py` (`bulk_index_issues`): removed dead no-op check
  `if issue_key in {(p, n) for p, n in []}`.
- [23:42] `api/app/github_ingest.py` (`search_repositories`): re-syncing a language overwrote
  `project.languages` with a single-element list, destroying data produced by `enrich-languages`.
  Languages are now merged and de-duplicated (capped at 8).
- [23:43] `scripts/seed_local.py`: replaced Python's per-process randomized `hash()` with stable
  `zlib.crc32(repo_url)` for seeded `github_repo_id`s (was non-deterministic across runs).
- [23:44] `web/app/issues/page.tsx`: card rendered an `<a>` inside another `<a>` — invalid HTML that
  triggers React hydration errors. Outer card remains the link; inner "Open issue" button converted to
  a styled `<span>`. Also removed unused `next/link` import.
- [23:45] `web/app/community/page.tsx`: removed unused `next/link` import (lint noise).
- [23:47] `web/components/SwipeDeck.tsx`: after a successful swipe the React Query cache was never
  updated, so the same card stayed on top and every subsequent swipe returned HTTP 409
  ("Project already swiped"). `onSuccess` now removes the swiped project from the cached deck, letting
  the next card animate in.
- [23:50] `api/app/matching.py` (`calculate_compatibility`): projects with ZERO shared languages still
  earned up to 60 points from experience/activity/demand, producing misleading match scores (e.g. a
  Ruby-only repo scored 50/100 for a Rust developer). Auxiliary signals are now gated on language
  overlap; zero overlap ⇒ score 0. Matches the spec in `api/tests/test_matching.py`.
- [23:51] `api/app/matching.py` (`infer_experience_score`): contribution weight (×2) over-scored
  moderate profiles; (20 repos, 50 followers, 15 contributions) mapped to EXPERT instead of ADVANCED.
  Rebalanced to `repos*1.5 + followers*0.5 + contributions*1.0`.
