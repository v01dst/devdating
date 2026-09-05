"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { IndexButton } from "@/components/IndexButton";
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

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));

  const openPalette = () => {
    window.dispatchEvent(new CustomEvent("devdating:open-palette"));
  };

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/85 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/discover" className="flex items-center gap-2 text-lg font-bold tracking-tight text-zinc-900">
          <span className="grid size-8 place-items-center rounded-xl bg-violet-100 text-sm text-[#5b3df0]">◈</span>
          <span>DevDating</span>
        </Link>

        <button
          type="button"
          onClick={openPalette}
          className="hidden w-96 items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-400 transition hover:border-zinc-300 md:flex"
        >
          <span>Search projects, issues…</span>
          <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-500">⌘K</span>
        </button>

        <div className="hidden items-center gap-1 md:flex">
          <IndexButton compact />
          <TokenButton />
          <Link
            href="/inbox"
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              isActive("/inbox") ? "bg-violet-100 text-[#5b3df0]" : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Inbox
          </Link>
          <Link
            href="/profile"
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              isActive("/profile") ? "bg-violet-100 text-[#5b3df0]" : "text-zinc-600 hover:text-zinc-900"
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
          className="grid size-10 place-items-center rounded-xl border border-zinc-200 bg-white text-lg text-zinc-700 md:hidden"
        >
          {open ? "✕" : "☰"}
        </button>
      </nav>

      {open && (
        <div className="border-t border-zinc-200 bg-white px-4 pb-4 pt-2 md:hidden">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              openPalette();
            }}
            className="mb-2 flex w-full items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-400"
          >
            <span>Search projects, issues…</span>
            <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-500">⌘K</span>
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
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
