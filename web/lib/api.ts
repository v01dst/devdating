const BASE = "/backend";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (response.status === 401) {
    window.location.href = `${BASE}/api/v1/auth/github/login`;
    throw new Error("Authentication required");
  }

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export type DiscoveryCard = {
  project: {
    id: string;
    repo_url: string;
    owner_login: string;
    name: string;
    description?: string | null;
    languages: string[];
    topics: string[];
    stars: number;
    forks: number;
    issue_count: number;
    activity_score: number;
    difficulty_level: number;
  };
  compatibility_score: number;
  reasons: string[];
};

export const api = {
  cards: () => request<DiscoveryCard[]>("/api/v1/discovery/cards?limit=20"),
  swipe: (projectId: string, direction: "LIKE" | "PASS" | "SUPER_LIKE") =>
    request<{ match_created: boolean; compatibility_score: number; match_id: string | null; match_status: string | null }>(
      "/api/v1/swipes",
      {
        method: "POST",
        body: JSON.stringify({ project_id: projectId, direction }),
      },
    ),
  undo: () => request<{ undone: boolean; project_id: string | null; removed_match: boolean }>(
    "/api/v1/swipes/last",
    { method: "DELETE" },
  ),
  issueRec: (matchId: string) =>
    request<{ status: string; title?: string; url?: string; rationale?: string; difficulty_score?: number }>(
      `/api/v1/matches/${matchId}/issue-recommendation`,
    ),
};

export type Status = { project_count: number; issue_count: number; needs_onboarding: boolean; seeded: boolean };
export type Notification = { id: string; type: string; title: string; body: string; link: string; read: boolean; created_at: string };
export type Contribution = { id: string; repo: string; issue_number: number; state: string; pr_url: string | null; created_at: string };
export type SyncRun = { id: string; state: string; target: number; indexed: number; languages: string[]; error: string; created_at: string; updated_at: string };

Object.assign(api, {
  status: () => request<Status>("/api/v1/status"),
  notifications: () => request<Notification[]>("/api/v1/notifications"),
  markRead: (id: string) => request<Notification>(`/api/v1/notifications/${id}/read`, { method: "PATCH" }),
  readAll: () => request<{ ok: boolean }>("/api/v1/notifications/read-all", { method: "POST" }),
  contributions: () => request<Contribution[]>("/api/v1/contributions"),
  claim: (repo: string, issue_number: number) => request<Contribution>("/api/v1/contributions/claim", { method: "POST", body: JSON.stringify({ repo, issue_number }) }),
  onboarding: (prefs: Record<string, unknown>) => request<unknown>("/api/v1/me/preferences", { method: "PATCH", body: JSON.stringify(prefs) }),
  syncStart: (target: number) => request<SyncRun>("/api/v1/admin/sync", { method: "POST", body: JSON.stringify({ target }) }),
  syncLatest: () => request<SyncRun | null>("/api/v1/admin/sync/runs/latest"),
});
