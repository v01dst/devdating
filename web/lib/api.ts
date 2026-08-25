const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer local-development-token",
      ...init?.headers,
    },
  });

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
