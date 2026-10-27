import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Linkwell — Great talent. Wider possibilities.", template: "%s | Linkwell" },
  description: "Discover work and connect African talent with employers around the world.",
  applicationName: "Linkwell",
  openGraph: {
    title: "Linkwell — Great talent. Wider possibilities.",
    description: "A better way for African talent to meet the world.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}