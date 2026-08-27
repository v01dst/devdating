import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-white/10 bg-black/30">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-bold tracking-tight">
            Dev<span className="text-accent-soft">Dating</span>
          </p>
          <p className="mt-1 max-w-xs text-xs text-white/45">
            Swipe. Match. Contribute. Find open-source projects and beginner-friendly issues worth solving.
          </p>
        </div>

        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/60">
          <a href="https://github.com/v01dst/devdating" target="_blank" rel="noreferrer" className="transition hover:text-white">
            GitHub
          </a>
          <a href="https://www.npmjs.com/package/@v01dst/devdating" target="_blank" rel="noreferrer" className="transition hover:text-white">
            npm
          </a>
          <Link href="/discover" className="transition hover:text-white">Discover</Link>
          <Link href="/issues" className="transition hover:text-white">Issues</Link>
          <a href="https://github.com/v01dst/devdating/issues" target="_blank" rel="noreferrer" className="transition hover:text-white">
            Report issue
          </a>
        </nav>

        <div className="text-sm text-white/60">
          <p>
            Discord: <span className="font-semibold text-white">9p.1</span>
          </p>
          <p className="mt-1 text-xs text-white/40">© {new Date().getFullYear()} DevDating · MIT</p>
        </div>
      </div>
    </footer>
  );
}