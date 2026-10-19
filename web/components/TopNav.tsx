"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { IndexButton } from "@/components/IndexButton";
import { UnreadBadge, useNotificationStream } from "@/components/NotificationBell";
import { TokenButton } from "@/components/TokenButton";

const allLinks = [
  { href: "/discover", label: "Discover" },
  { href: "/projects", label: "Projects" },
  { href: "/issues", label: "Issues" },
  { href: "/inbox", label: "Inbox" },
  { href: "/matches", label: "Matches" },
  { href: "/contributions", label: "Tracking" },
  { href: "/community", label: "Contributions" },
  { href: "/maintainer", label: "Maintainer" },
  { href: "/profile", label: "Profile" },
  { href: "/onboarding", label: "Onboarding" },
];

export function TopNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useNotificationStream();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));

  const openPalette = () => {
    window.dispatchEvent(new CustomEvent("devdating:open-palette"));
  };

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-raised/85 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/discover" className="flex items-center gap-2 font-round text-lg font-bold tracking-tight text-ink">
          <svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <rect x="3" y="7" width="19" height="21" rx="5" stroke="#7c5cff" strokeWidth="1.5" />
            <rect x="10" y="3" width="19" height="21" rx="5" fill="#f2ecdf" />
            <path d="M19.5 10.2c1.9 0 3.3 1.4 3.3 3.2 0 2.5-2.9 4.5-3.3 4.7-.4-.2-3.3-2.2-3.3-4.7 0-1.8 1.4-3.2 3.3-3.2z" fill="#ff3d92" />
          </svg>
          <span>devdating</span>
        </Link>

        <button
          type="button"
          onClick={openPalette}
          className="hidden w-96 items-center justify-between rounded-2xl border border-line bg-ghost px-4 py-2.5 font-mono text-xs tracking-wide text-ink-dim transition hover:border-ink/30 md:flex"
        >
          <span>search projects, issues…</span>
          <span className="rounded-md bg-ink/10 px-2 py-0.5 text-[11px] font-semibold text-ink-dim">⌘K</span>
        </button>

        <div className="hidden items-center gap-1 md:flex">
          <IndexButton compact />
          <TokenButton />
          <Link
            href="/inbox"
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              isActive("/inbox") ? "bg-accent/10 text-accent-soft" : "text-ink-soft hover:text-ink"
            }`}
          >
            Inbox
            <UnreadBadge />
          </Link>
          <Link
            href="/profile"
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              isActive("/profile") ? "bg-accent/10 text-accent-soft" : "text-ink-soft hover:text-ink"
            }`}
          >
            Profile
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-label="Toggle navigation"
          aria-expanded={open}
          className="grid size-10 place-items-center rounded-xl border border-line bg-raised text-lg text-ink-soft md:hidden"
        >
          {open ? "✕" : "☰"}
        </button>
      </nav>

      {open && (
        <div className="border-t border-line bg-raised px-4 pb-4 pt-2 md:hidden">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              openPalette();
            }}
            className="mb-2 flex w-full items-center justify-between rounded-2xl border border-line bg-ghost px-4 py-2.5 font-mono text-xs text-ink-dim"
          >
            <span>search projects, issues…</span>
            <span className="rounded-md bg-ink/10 px-2 py-0.5 text-[11px] font-semibold text-ink-dim">⌘K</span>
          </button>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 px-1 py-2">
              <TokenButton />
            </div>
            <div className="px-1 py-2">
              <IndexButton compact />
            </div>
            {allLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  isActive(href)
                    ? "bg-accent text-white"
                    : "text-ink-soft hover:bg-ghost hover:text-ink"
                }`}
              >
                {label}
                {href === "/inbox" && <UnreadBadge />}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
