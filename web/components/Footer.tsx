import Link from "next/link";
import { IconDiscord, IconFastapi, IconGithub, IconMit, IconNext } from "@/components/BrandIcons";

const REPO_URL = "https://github.com/v01dst/devdating";
const LICENSE_URL = `${REPO_URL}/blob/main/LICENSE`;
const NPM_URL = "https://www.npmjs.com/package/@v01dst/devdating";
const NEXT_URL = "https://nextjs.org";
const FASTAPI_URL = "https://fastapi.tiangolo.com";
// Points at the maintainer's Discord profile (9p.1).
const DISCORD_URL = "https://discord.com/users/9p.1";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-line-soft bg-surface">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="flex items-center gap-2 font-round text-sm font-bold tracking-tight text-ink">
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <rect x="3" y="7" width="19" height="21" rx="5" stroke="#7c5cff" strokeWidth="1.5" />
              <rect x="10" y="3" width="19" height="21" rx="5" fill="#f2ecdf" />
              <path d="M19.5 10.2c1.9 0 3.3 1.4 3.3 3.2 0 2.5-2.9 4.5-3.3 4.7-.4-.2-3.3-2.2-3.3-4.7 0-1.8 1.4-3.2 3.3-3.2z" fill="#ff3d92" />
            </svg>
            devdating
          </p>
          <p className="mt-1 max-w-xs text-xs text-ink-dim">
            Swipe. Match. Contribute. Find open-source projects and beginner-friendly issues worth solving.
          </p>
        </div>

        <nav className="flex flex-wrap gap-x-5 gap-y-2 font-mono text-xs text-ink-dim">
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="transition hover:text-ink">
            github
          </a>
          <a href={NPM_URL} target="_blank" rel="noreferrer" className="transition hover:text-ink">
            npm
          </a>
          <Link href="/discover" className="transition hover:text-ink">discover</Link>
          <Link href="/issues" className="transition hover:text-ink">issues</Link>
          <a href={`${REPO_URL}/issues`} target="_blank" rel="noreferrer" className="transition hover:text-ink">
            report issue
          </a>
        </nav>

        <div className="flex flex-col gap-2">
          <span className="flex flex-wrap gap-x-4 gap-y-2 font-mono text-[11px] text-ink-dim">
            <a href={REPO_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 transition hover:text-ink">
              <IconGithub className="size-3.5 fill-current" /> github
            </a>
            <a href={LICENSE_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 transition hover:text-ink">
              <IconMit className="size-3.5 fill-current" /> MIT
            </a>
            <a href={NEXT_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 transition hover:text-ink">
              <IconNext className="size-3.5 fill-current" /> next.js
            </a>
            <a href={FASTAPI_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 transition hover:text-ink">
              <IconFastapi className="size-3.5 fill-current" /> fastapi
            </a>
            <a href={DISCORD_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 transition hover:text-ink">
              <IconDiscord className="size-3.5 fill-current" /> discord: 9p.1
            </a>
          </span>
          <p className="font-mono text-[11px] text-ink-dim">© {new Date().getFullYear()} devdating · MIT</p>
        </div>
      </div>
    </footer>
  );
}
