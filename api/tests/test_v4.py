import os
import stat


def _mod():
    import app.github_token as module

    return module


def test_token_status_unconfigured_by_default(client, monkeypatch, tmp_path):
    monkeypatch.setattr(_mod(), "get_env_file", lambda: tmp_path / "devdating.env")
    monkeypatch.delenv("GITHUB_TOKEN", raising=False)
    body = client.get("/api/v1/settings/github-token").json()
    assert body["configured"] is False
    assert "token" not in body and "value" not in body and "secret" not in body


def test_token_rejects_invalid_token(client, monkeypatch, tmp_path):
    async def fake_check(token):
        raise ValueError("GitHub rejected this token (401). Double-check it and try again.")

    monkeypatch.setattr(_mod(), "get_env_file", lambda: tmp_path / "devdating.env")
    monkeypatch.setattr(_mod(), "check_github_token", fake_check)
    monkeypatch.delenv("GITHUB_TOKEN", raising=False)
    response = client.put("/api/v1/settings/github-token", json={"token": "bad-token"})
    assert response.status_code == 401
    assert not (tmp_path / "devdating.env").exists()
    assert "GITHUB_TOKEN" not in os.environ


def test_token_save_masks_and_removes(client, monkeypatch, tmp_path):
    async def fake_check(token):
        assert token == "ghp_valid123"
        return {"login": "demo-dev", "scopes": "public_repo", "rate_limit": 5000, "rate_remaining": 4999}

    env_file = tmp_path / "devdating.env"
    env_file.write_text("DATABASE_URL=sqlite:///x.db\n")
    monkeypatch.setattr(_mod(), "get_env_file", lambda: env_file)
    monkeypatch.setattr(_mod(), "check_github_token", fake_check)
    monkeypatch.delenv("GITHUB_TOKEN", raising=False)

    saved = client.put("/api/v1/settings/github-token", json={"token": "ghp_valid123"}).json()
    assert saved["configured"] is True
    assert saved["login"] == "demo-dev"
    assert "ghp_valid123" not in str(saved)
    assert os.environ.get("GITHUB_TOKEN") == "ghp_valid123"
    content = env_file.read_text()
    assert "GITHUB_TOKEN=ghp_valid123" in content
    assert "DATABASE_URL=sqlite:///x.db" in content
    mode = stat.S_IMODE(env_file.stat().st_mode)
    assert mode == 0o600

    status = client.get("/api/v1/settings/github-token").json()
    assert status["configured"] is True
    assert status["login"] == "demo-dev"
    assert "ghp_valid123" not in str(status)

    deleted = client.delete("/api/v1/settings/github-token").json()
    assert deleted["configured"] is False
    assert "GITHUB_TOKEN" not in env_file.read_text()
    assert "GITHUB_TOKEN" not in os.environ
