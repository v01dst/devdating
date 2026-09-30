# Core Data Model

The local database separates source data from contributor interactions.

## Repository

Stores GitHub identity, description, languages, stars, forks, issue counts, license metadata, and synchronization timestamps.

## Issue

Stores repository ownership, GitHub issue identity, title, labels, state, timestamps, and derived difficulty signals.

## Contributor profile

Stores normalized technology preferences and interaction history. Learned affinity should be derived from explicit interactions rather than silently inferred from unrelated data.

## Match and interaction records

Likes, passes, matches, and maintainer approvals form an append-oriented interaction history. This makes recommendation changes explainable and allows future ranking logic to be evaluated against prior behavior.

## Synchronization

External identifiers should be unique. Sync jobs must tolerate repeated input and update existing records instead of creating duplicates.
