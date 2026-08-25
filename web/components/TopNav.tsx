import Link from "next/link";

const links = [
  { href: "/projects", label: "Projects" },
  { href: "/issues", label: "Issues" },
  { href: "/community", label: "Community" },
];

export function TopNav({ active }: { active?: string }) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07070c]/85 backdrop-blur-xl">
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-4">
        <Link href="/projects" className="text-lg font-bold tracking-tight">
          Dev<span className="text-accent-soft">Dating</span>
        </Link>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {links.map(({ href, label }) => {
            const isActive = active === href;
            return (
              <Link key={href} href={href} className={`rounded-full px-4 py-2 text-sm font-bold transition sm:px-5 ${isActive ? "bg-accent text-white shadow-glow" : "bg-white text-black hover:bg-accent-soft"}`}>
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
