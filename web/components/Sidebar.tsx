"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

const links = [
  { href: "/discover", label: "Discover", icon: "◈" },
  { href: "/projects", label: "Projects", icon: "▦" },
  { href: "/issues", label: "Issues", icon: "●" },
  { href: "/inbox", label: "Inbox", icon: "✉" },
  { href: "/matches", label: "Matches", icon: "💜" },
  { href: "/contributions", label: "Tracking", icon: "✓" },
  { href: "/profile", label: "Profile", icon: "○" },
  { href: "/onboarding", label: "Onboarding", icon: "✦" },
];

type Notification = { id: string; read: boolean };

export function Sidebar() {
  const pathname = usePathname();
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: async (): Promise<Notification[]> => {
      try {
        const r = await fetch("/backend/api/v1/notifications", { credentials: "same-origin" });
        if (!r.ok) return [];
        return (await r.json()) as Notification[];
      } catch {
        return [];
      }
    },
  });
  const unread = (data ?? []).filter((n) => !n.read).length;
  return (
    <aside className="hidden w-56 shrink-0 flex-col gap-1 p-3 lg:flex">
      {links.map(({ href, label, icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link key={href} href={href} className={active ? "nav-active" : "nav-link"}>
            <span aria-hidden>{icon}</span> {label}
            {href === "/inbox" && unread > 0 && (
              <span className="ml-auto rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-white">
                {unread}
              </span>
            )}
          </Link>
        );
      })}
      <div className="mt-auto rounded-xl border border-zinc-200 bg-white p-3 text-xs text-zinc-600">
        <div className="font-semibold text-zinc-900">Tip: press Ctrl-K</div>
        <div className="text-zinc-500">Search projects, issues, actions</div>
      </div>
    </aside>
  );
}
