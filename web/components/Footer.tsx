import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-zinc-200 bg-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-bold tracking-tight text-zinc-900">
            DevDating
          </p>
          <p className="mt-1 max-w-xs text-xs text-zinc-500">
            Swipe. Match. Contribute. Find open-source projects and beginner-friendly issues worth solving.
          </p>
        </div>

        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-500">
          <a href="https://github.com/v01dst/devdating" target="_blank" rel="noreferrer" className="transition hover:text-zinc-900">
            GitHub
          </a>
          <a href="https://www.npmjs.com/package/@v01dst/devdating" target="_blank" rel="noreferrer" className="transition hover:text-zinc-900">
            npm
          </a>
          <Link href="/discover" className="transition hover:text-zinc-900">Discover</Link>
          <Link href="/issues" className="transition hover:text-zinc-900">Issues</Link>
          <a href="https://github.com/v01dst/devdating/issues" target="_blank" rel="noreferrer" className="transition hover:text-zinc-900">
            Report issue
          </a>
        </nav>

        <div className="text-sm text-zinc-500">
          <p>
            Discord: <span className="font-semibold text-zinc-900">9p.1</span>
          </p>
          <p className="mt-1 text-xs text-zinc-500">© {new Date().getFullYear()} DevDating · MIT</p>
        </div>
      </div>
    </footer>
  );
}
