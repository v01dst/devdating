# Tests — 2026-08-25

## Backend (pytest)

- Command: `PYTHONPATH=api .venv/bin/python -m pytest api/tests -q`
- Before fixes: `2 failed, 2 passed in 1.56s`
  - `test_scores_are_bounded` — expected 0 for zero-overlap mismatch, got 50.0
    (experience/activity/demand points were not gated on shared languages).
  - `test_experience_inference_levels` — expected ADVANCED for score from (20, 50, 15), got EXPERT
    (contribution weight too high).
- After fixes: `4 passed in 0.46s`

Coverage note: suite covers matching only. No tests yet for routes, ingest, or issues difficulty.
- [23:57:39] pytest api/tests -q: 4 passed (after matching.py fixes)(no message)
