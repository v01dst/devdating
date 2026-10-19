import { TopNav } from "@/components/TopNav";
import { Footer } from "@/components/Footer";
import { Sidebar } from "@/components/Sidebar";
import { AuthBanner } from "@/components/AuthBanner";
import { CommandPalette } from "@/components/CommandPalette";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopNav />
      <AuthBanner />
      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-4 px-4 sm:px-6">
        <Sidebar />
        <CommandPalette />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      <Footer />
    </>
  );
}
