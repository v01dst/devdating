from app.matching import calculate_compatibility, experience_level_from_score, infer_experience_score


def test_perfect_alignment_scores_above_match_threshold():
    score, breakdown = calculate_compatibility(
        user_tech_stack=["Python"],
        project_languages=["Python", "Docker"],
        user_experience_level=3,
        project_difficulty_level=3,
        project_activity_score=100,
        project_contributor_count=1,
        project_issue_count=100,
    )
    assert score > 65
    assert breakdown["language"] == 20


def test_scores_are_bounded():
    score, _ = calculate_compatibility(
        user_tech_stack=["Rust"],
        project_languages=["Ruby"],
        user_experience_level=4,
        project_difficulty_level=99,
        project_activity_score=999,
        project_contributor_count=999_999,
        project_issue_count=1,
    )
    assert score == 0


def test_experience_inference_levels():
    score = infer_experience_score(20, 50, 15)
    assert experience_level_from_score(score) == "ADVANCED"
    assert experience_level_from_score(200) == "EXPERT"
