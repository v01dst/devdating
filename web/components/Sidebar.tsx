"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/discover", label: "Discover", icon: "◈" },
  { href: "/projects", label: "Projects", icon: "▦" },
  { href: "/issues", label: "Issues", icon: "●" },
  { href: "/inbox", label: "Inbox", icon: "✉" },
  { href: "/matches", label: "Matches", icon: "💜" },
  { href: "/contributions", label: "Tracking", icon: "✓" },
  { href: "/profile", label: "Profile", icon: "○" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-56 shrink-0 flex-col gap-1 border-r border-black/10 p-3 dark:border-white/10 lg:flex">
      {links.map(({ href, label, icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link key={href} href={href} className={active ? "nav-active" : "nav-link"}>
            <span aria-hidden>{icon}</span> {label}
          </Link>
        );
      })}
      <div className="mt-auto rounded-xl bg-black/5 p-3 text-xs dark:bg-white/5">
        <div className="font-semibold">Tip: press Ctrl-K</div>
        <div className="opacity-70">Search projects, issues, actions</div>
      </div>
    </aside>
  );
}
