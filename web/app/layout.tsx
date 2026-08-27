import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/Providers";
import { TopNav } from "@/components/TopNav";
import { Footer } from "@/components/Footer";
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
          <div className="flex-1">{children}</div>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
