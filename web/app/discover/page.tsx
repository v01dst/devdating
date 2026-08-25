import { Providers } from "@/components/Providers";
import { SwipeDeck } from "@/components/SwipeDeck";

export const metadata = { title: "Discover — DevDating" };

export default function DiscoverPage() {
  return (
    <Providers>
      <main className="relative min-h-dvh overflow-hidden px-4 pt-6">
        <header className="mx-auto flex w-full max-w-md items-center justify-between">
          <Link className="text-lg font-semibold tracking-tight" href="/">
            Dev<span className="text-accent-soft">Dating</span>
          </Link>
          <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/60">Local alpha</span>
        </header>
        <SwipeDeck />
      </main>
    </Providers>
  );
}
