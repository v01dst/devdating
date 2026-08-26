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
  swipe: (projectId: string, direction: "LIKE" | "PASS") =>
    request<{ match_created: boolean; compatibility_score: number }>("/api/v1/swipes", {
      method: "POST",
      body: JSON.stringify({ project_id: projectId, direction }),
    }),
};
