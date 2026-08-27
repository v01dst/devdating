import { SwipeDeck } from "@/components/SwipeDeck";
import { TopNav } from "@/components/TopNav";

export const metadata = { title: "Discover — DevDating" };

export default function DiscoverPage() {
  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-6 py-10">
      <TopNav active="/discover" />
      <h1 className="mt-6 text-center text-4xl font-semibold tracking-tight sm:text-5xl">Find your project</h1>
      <p className="mt-3 text-center text-white/65">Swipe right to match, left to pass. Matches unlock a starter issue.</p>
      <div className="relative mt-8 flex-1">
        <SwipeDeck />
      </div>
    </main>
  );
}
