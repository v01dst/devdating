import { TopNav } from "@/components/TopNav";

export const metadata = { title: "Community Questions — DevDating" };

async function getQuestions() {
  const response = await fetch(`${process.env.API_URL ?? "http://localhost:8000"}/api/v1/me/community-questions?limit=30`, {
    headers: { Authorization: "Bearer local-development-token" }, cache: "no-store",
  });
  if (!response.ok) return [];
  return response.json();
}

export default async function CommunityPage() {
  const questions = await getQuestions();
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      <TopNav active="/community" />
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Questions from projects like yours</h1>
      <p className="mt-4 max-w-2xl text-white/65">Answer community discussions in public repositories similar to the technologies you already build.</p>
      <div className="mt-10 grid gap-5 md:grid-cols-2">{questions.length === 0 && <div className="glass-card rounded-3xl p-6 text-white/65">No community questions indexed yet.</div>}
        {questions.map((q: any) => (
          <a key={q.issue_id} href={q.url} target="_blank" rel="noreferrer" className="glass-card rounded-3xl p-6 transition hover:border-accent/40">
            <div className="flex justify-between text-xs text-white/55"><span>{q.project_name}</span><span>{q.comments} replies</span></div>
            <h2 className="mt-3 line-clamp-2 font-semibold">{q.title}</h2>
            <p className="mt-3 line-clamp-3 text-sm text-white/60">{q.snippet || "Open this discussion to see the full context."}</p>
          </a>
        ))}
      </div>
    </main>
  );
}
