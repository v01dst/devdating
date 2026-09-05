import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/Providers";
import { TopNav } from "@/components/TopNav";
import { Footer } from "@/components/Footer";
import { Sidebar } from "@/components/Sidebar";
import { AuthBanner } from "@/components/AuthBanner";
import "./globals.css";

export const metadata: Metadata = {
  title: "DevDating — Match with open source",
  description:
    "Swipe on open-source projects and match with maintainers through skill-aware recommendations.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col bg-surface text-white antialiased">
        <Providers>
          <TopNav />
          <AuthBanner />
          <div className="mx-auto flex w-full max-w-7xl flex-1 gap-4 px-4 sm:px-6">
            <Sidebar />
            <div className="min-w-0 flex-1">{children}</div>
          </div>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
