from dataclasses import asdict, dataclass


@dataclass(frozen=True)
class MatchFeatures:
    shared_language_ratio: float
    level_distance: float
    activity_score: float
    contribution_pressure: float


def clamp(value: float, minimum: float = 0.0, maximum: float = 1.0) -> float:
    return max(minimum, min(maximum, value))


def calculate_compatibility(
    *,
    user_tech_stack: list[str],
    project_languages: list[str],
    user_experience_level: int,
    project_difficulty_level: float,
    project_activity_score: float,
    project_contributor_count: int,
    project_issue_count: int,
) -> tuple[float, dict]:
    normalized_user_stack = {item.lower() for item in user_tech_stack}
    normalized_languages = {item.lower() for item in project_languages}
    shared_languages = normalized_user_stack & normalized_languages
    total_languages = len(normalized_user_stack | normalized_languages)
    shared_ratio = len(shared_languages) / total_languages if total_languages else 0

    # Projects with no technology overlap are never recommended regardless of
    # activity or size, so auxiliary signals stay gated on shared languages.
    relevant = bool(shared_languages)

    level_distance = abs(float(user_experience_level) - clamp(project_difficulty_level, 0, 4)) / 4
    activity = clamp(float(project_activity_score) / 100)
    pressure_denominator = max(project_issue_count, 1)
    pressure = clamp(project_contributor_count / pressure_denominator)

    language_points = shared_ratio * 40
    experience_points = (1 - level_distance) * 30 if relevant else 0
    activity_points = activity * 20 if relevant else 0
    demand_points = (1 - pressure) * 10 if relevant else 0
    score = round(language_points + experience_points + activity_points + demand_points, 2)

    breakdown = {
        "language": round(language_points, 2),
        "experience": round(experience_points, 2),
        "activity": round(activity_points, 2),
        "demand": round(demand_points, 2),
        "features": asdict(
            MatchFeatures(shared_ratio, level_distance, activity, pressure)
        ),
    }
    return score, breakdown


def build_reasons(breakdown: dict) -> list[str]:
    reasons: list[str] = []
    if breakdown["language"] >= 15:
        reasons.append("Strong overlap with your tech stack")
    if breakdown["activity"] >= 12:
        reasons.append("Project has recent healthy activity")
    if breakdown["experience"] >= 20:
        reasons.append("Difficulty aligns with your experience level")
    if breakdown["demand"] >= 6:
        reasons.append("Open issues exceed current contributor capacity")
    return reasons or ["General discovery candidate based on your preferences"]


def infer_experience_score(public_repos: int, followers: int, contributions: int) -> float:
    return min(100, public_repos * 1.5 + followers * 0.5 + contributions * 1.0)


def experience_level_from_score(score: float) -> str:
    if score >= 80:
        return "EXPERT"
    if score >= 55:
        return "ADVANCED"
    if score >= 30:
        return "INTERMEDIATE"
    if score >= 10:
        return "BEGINNER"
    return "NEWCOMER"
