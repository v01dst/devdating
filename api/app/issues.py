GOOD_FIRST_LABELS = {"good first issue", "beginner", "easy", "documentation", "help wanted"}


def estimate_issue_difficulty(
    *, title: str, labels: list[str], comments_count: int, body_length: int, linked_pr_count: int = 0
) -> tuple[float, float, str]:
    label_set = {label.lower().strip() for label in labels}
    good_label_bonus = len(label_set & GOOD_FIRST_LABELS)
    difficulty = (
        35
        + min(comments_count * 4, 20)
        + min(body_length / 500, 15)
        + linked_pr_count * 10
        - good_label_bonus * 8
    )
    difficulty = max(0, min(100, difficulty))
    confidence = min(0.9, 0.45 + good_label_bonus * 0.12 + (0.05 if comments_count < 10 else 0))
    rationale_bits = []
    if good_label_bonus:
        rationale_bits.append("has beginner-friendly labels")
    if comments_count <= 3:
        rationale_bits.append("low discussion overhead")
    if linked_pr_count == 0:
        rationale_bits.append("no competing pull request")
    rationale = ", ".join(rationale_bits) or "estimated from issue size and activity"
    _ = title.lower()
    return round(difficulty, 2), round(confidence, 3), rationale
