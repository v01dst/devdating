# Contribution Discovery Pipeline

DevDating turns public GitHub metadata into a focused contribution feed.

## Pipeline

1. Ingest repository and issue metadata.
2. Normalize languages, labels, timestamps, and activity signals.
3. Enrich repositories where search results lack complete language metadata.
4. Score project and issue compatibility against the contributor profile.
5. Filter using explicit user preferences.
6. Present the result with reasons instead of an unexplained number.

## Scoring principles

Compatibility should be explainable. A recommendation should be able to answer why a project appeared: language overlap, difficulty fit, activity, demand, or learned affinity.

Scores are discovery signals, not guarantees about project quality or issue difficulty.

## Data freshness

GitHub metadata changes continuously. Sync commands should record timestamps and avoid treating stale data as current. Bulk ingestion should be restartable and safe to run repeatedly.
