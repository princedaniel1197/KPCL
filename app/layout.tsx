import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/shell/AppShell";
import { getLang } from "@/lib/params";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-cormorant",
});

const dmsans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dmsans",
});

export const metadata: Metadata = {
  title: "Sentinel — Oversight & Intelligence Ledger",
  description:
    "Single ledger, obligation register and entity graph for state power generation. Synthetic demonstration data.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = getLang();
  return (
    <html lang={lang === "kn" ? "kn" : "en"} className={`${cormorant.variable} ${dmsans.variable}`}>
      <body className="font-sans bg-paper text-ink antialiased">
        <AppShell lang={lang}>{children}</AppShell>
      </body>
    </html>
  );
}
