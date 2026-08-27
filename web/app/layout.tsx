import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/Providers";
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
      <body className="min-h-dvh bg-surface text-white antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
