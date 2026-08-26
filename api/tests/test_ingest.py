from app.github_ingest import apply_issue_fields
from app.models import Issue


def _issue_with_payload(payload):
    issue = Issue(project_id=None, issue_number=payload["number"])
    apply_issue_fields(issue, payload)
    return issue


def test_difficulty_is_low_for_labeled_small_issue():
    issue = _issue_with_payload({
        "number": 1,
        "title": "Fix typo in README",
        "body": "Small documentation fix." * 5,
        "html_url": "https://github.com/x/y/issues/1",
        "state": "open",
        "labels": [{"name": "good first issue"}],
        "assignees": [],
        "comments": 0,
    })
    assert 0 < float(issue.difficulty_score) < 45
    assert float(issue.difficulty_confidence) >= 0.5


def test_difficulty_rises_with_discussion_and_size():
    easy = _issue_with_payload({
        "number": 1, "title": "bug", "body": "short",
        "html_url": "", "state": "open", "labels": [], "assignees": [], "comments": 0,
    })
    hard = _issue_with_payload({
        "number": 2, "title": "complex regression", "body": "detail " * 400,
        "html_url": "", "state": "open", "labels": [], "assignees": ["a", "b"], "comments": 9,
    })
    assert float(hard.difficulty_score) > float(easy.difficulty_score)


def test_label_filter_narrows_stored_labels():
    issue = Issue(project_id=None, issue_number=3)
    apply_issue_fields(
        issue,
        {
            "number": 3, "title": "t", "body": "", "html_url": "", "state": "open",
            "labels": [{"name": "help wanted"}, {"name": "wontfix"}],
            "assignees": [], "comments": 0,
        },
        label_filter={"help wanted"},
    )
    assert issue.labels == ["help wanted"]
