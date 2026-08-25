from app.issues import estimate_issue_difficulty


def test_good_first_issue_is_low_difficulty_and_confident():
    difficulty, confidence, rationale = estimate_issue_difficulty(
        title="Fix typo",
        labels=["good first issue", "documentation"],
        comments_count=1,
        body_length=400,
    )
    assert difficulty < 45
    assert confidence >= 0.65
    assert "beginner-friendly" in rationale
