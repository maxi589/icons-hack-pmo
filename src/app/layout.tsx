import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Michroma } from "next/font/google";
import { THEME_SCRIPT } from "@/lib/theme";
import { SIDEBAR_SCRIPT } from "@/lib/sidebar";
import "./globals.css";

// next/font lädt Michroma beim Build herunter und liefert sie selbst aus (kein Abruf bei Google zur Laufzeit).
const michroma = Michroma({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-michroma",
});

export const metadata: Metadata = {
  title: "icons Hackathon PMO",
  description: "Steuerung für den icons Hackathon 2027",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1f1f2" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0b" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="de"
      className={`${GeistSans.variable} ${GeistMono.variable} ${michroma.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: `${THEME_SCRIPT};${SIDEBAR_SCRIPT}` }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
