from app.matching import affinity_boost, language_affinity


def test_affinity_neutral_without_history():
    assert language_affinity([]) == {}


def test_affinity_liked_language_scores_above_neutral():
    rows = [("LIKE", "Python"), ("LIKE", "python"), ("PASS", "Rust")]
    affinity = language_affinity(rows)
    assert affinity["python"] > 0.5
    assert affinity["rust"] < 0.5


def test_boost_zero_for_unseen_languages():
    boost, lang = affinity_boost(["Ruby"], {"python": 0.9})
    assert boost == 0.0
    assert lang is None


def test_boost_approaches_max_without_reaching_it():
    affinity = language_affinity([("LIKE", "Go")] * 20)
    boost, lang = affinity_boost(["go"], affinity, max_points=10)
    # smoothing keeps ratio below 1.0: (20+1)/(20+2) ≈ 0.9545 → ≈ 9.09 points
    assert 9.0 < boost < 10.0
    assert lang == "go"


def test_mixed_history_gives_partial_boost():
    affinity = language_affinity([("LIKE", "Go")] * 3 + [("PASS", "Go")] * 1)
    boost, _ = affinity_boost(["Go"], affinity, max_points=10)
    # (3+1)/(3+1+2) = 2/3 → (2/3 - 1/2) * 2 * 10 = 3.33
    assert boost == 3.33
