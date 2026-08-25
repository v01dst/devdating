def learning_paths(tech_stack: list[str], experience_level: str):
    primary = tech_stack[0].lower() if tech_stack else "typescript"
    base = {
        "current_level": experience_level,
        "primary_language": primary,
        "paths": [],
    }
    paths = [
        {
            "id": "first-pr",
            "title": "Ship Your First Pull Request",
            "outcome": "Understand fork → branch → commit → pull request without fear.",
            "steps": ["Pick documentation issue", "Set up repository locally", "Create focused branch", "Open linked PR"],
            "estimated_days": 1,
        },
        {
            "id": "tests-confidence",
            "title": "Learn Through Tests",
            "outcome": "Use failing tests to understand code safely.",
            "steps": ["Find test-labeled issue", "Run existing tests", "Add one missing test", "Refactor only what the test proves"],
            "estimated_days": 2,
        },
        {
            "id": "small-bug",
            "title": "Fix a Small Bug",
            "outcome": "Practice reproducing, isolating, and fixing behavior.",
            "steps": ["Reproduce the bug", "Locate relevant module", "Change one thing", "Verify before and after"],
            "estimated_days": 3,
        },
        {
            "id": "community-triage",
            "title": "Learn by Community Triage",
            "outcome": "Build project context while helping maintainers.",
            "steps": ["Answer a beginner question", "Improve unclear docs", "Reproduce reported bugs", "Summarize findings"],
            "estimated_days": 2,
        },
    ]
    language_hint = {
        "typescript": "Start with typed utility functions or UI copy fixes.",
        "javascript": "Start with browser console errors or small UI improvements.",
        "python": "Start with docstrings, examples, or pytest coverage.",
        "rust": "Start with error messages, examples, or clippy warnings.",
        "go": "Start with table-driven tests or documentation comments.",
    }.get(primary, "Start with documentation or test-only changes.")
    base["recommended_first_step"] = language_hint
    base["paths"] = paths
    return base


def contribution_readiness(issues: list, tech_stack: list[str]):
    stack = {item.lower() for item in tech_stack}
    easy = [i for i in issues if i.assignees == 0 and i.comments_count <= 3]
    matched_language = []
    for issue in issues:
        if not issue.project or not stack.intersection({lang.lower() for lang in issue.project.languages}):
            continue
        matched_language.append(issue)
    unassigned = [i for i in issues if i.assignees == 0]
    score = min(100, len(stack) * 12 + len(easy) / 10 + len(matched_language) / 20)
    return {
        "readiness_score": round(score),
        "indexed_issues": len(issues),
        "unassigned_easy": len(easy),
        "language_matched": len(matched_language),
        "advice": [
            "Choose an issue with fewer than five comments.",
            "Prefer documentation or test-only changes for your first PR.",
            "Comment on the issue before writing significant code.",
        ],
    }
