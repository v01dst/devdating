"""Secure storage for the user's GitHub personal access token.

Security properties (do not weaken these):
- The token value is NEVER returned by any API, log, or error message.
- It is persisted only in devdating.env with mode 0600, written atomically.
- It is validated against api.github.com BEFORE it is saved anywhere.
- In-process consumers read os.environ at call time, so saving also
  activates the token without a restart.
"""

import os
from pathlib import Path

import httpx

TOKEN_KEY = "GITHUB_TOKEN"
LOGIN_KEY = "GITHUB_TOKEN_LOGIN"


def get_env_file() -> Path:
    """Locate devdating.env: explicit home, then upward search, then ~/.devdating."""
    home = os.environ.get("DEVDATING_HOME")
    if home:
        return Path(home) / "devdating.env"
    here = Path.cwd().resolve()
    for parent in (here, *here.parents):
        candidate = parent / "devdating.env"
        if candidate.exists():
            return candidate
    return Path.home() / ".devdating" / "devdating.env"


def token_configured() -> bool:
    return bool(os.environ.get(TOKEN_KEY))


async def check_github_token(token: str) -> dict:
    """Validate a token against GitHub. Returns login/scopes/rate info.

    Raises ValueError with a safe message (no token content) when invalid.
    """
    cleaned = (token or "").strip()
    if not cleaned:
        raise ValueError("Token is empty.")
    try:
        async with httpx.AsyncClient(base_url="https://api.github.com", timeout=15) as client:
            user_response = await client.get(
                "/user",
                headers={"Authorization": f"Bearer {cleaned}", "Accept": "application/vnd.github+json"},
            )
            if user_response.status_code == 401:
                raise ValueError("GitHub rejected this token (401). Double-check it and try again.")
            if user_response.status_code == 403:
                raise ValueError("GitHub rate-limited the check (403). Wait a minute and try again.")
            user_response.raise_for_status()
            rate_response = await client.get(
                "/rate_limit", headers={"Authorization": f"Bearer {cleaned}"}
            )
            rate_response.raise_for_status()
    except ValueError:
        raise
    except Exception as exc:
        raise ValueError(f"Could not reach GitHub to validate the token: {type(exc).__name__}.") from exc
    login = user_response.json().get("login", "")
    scopes = user_response.headers.get("x-oauth-scopes", "")
    core = rate_response.json().get("resources", {}).get("core", {})
    return {
        "login": login,
        "scopes": scopes,
        "rate_limit": int(core.get("limit", 0)),
        "rate_remaining": int(core.get("remaining", 0)),
    }


def _read_lines(path: Path) -> list[str]:
    if not path.exists():
        return []
    return path.read_text().splitlines()


def save_token(token: str, login: str = "") -> None:
    """Validate-then-save is enforced by callers; this only persists + activates."""
    path = get_env_file()
    path.parent.mkdir(parents=True, exist_ok=True)
    kept = [line for line in _read_lines(path) if not line.startswith((TOKEN_KEY + "=", LOGIN_KEY + "="))]
    kept.append(f"{TOKEN_KEY}={token}")
    if login:
        kept.append(f"{LOGIN_KEY}={login}")
    tmp = path.with_suffix(".env.tmp")
    tmp.write_text("\n".join(kept) + "\n")
    os.chmod(tmp, 0o600)
    os.replace(tmp, path)
    os.chmod(path, 0o600)
    os.environ[TOKEN_KEY] = token


def stored_login() -> str:
    for line in _read_lines(get_env_file()):
        if line.startswith(LOGIN_KEY + "="):
            return line.split("=", 1)[1].strip()
    return ""


def remove_token() -> None:
    path = get_env_file()
    if path.exists():
        kept = [line for line in _read_lines(path) if not line.startswith((TOKEN_KEY + "=", LOGIN_KEY + "="))]
        tmp = path.with_suffix(".env.tmp")
        tmp.write_text("\n".join(kept) + ("\n" if kept else ""))
        os.chmod(tmp, 0o600)
        os.replace(tmp, path)
    os.environ.pop(TOKEN_KEY, None)
