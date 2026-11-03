import type { Metadata } from "next";
import { Figtree, Space_Mono } from "next/font/google";

import "./globals.css";
import { cn } from "@/lib/utils";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  variable: "--font-space-mono",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Noah Prototypes",
  description:
    "Noah prototypes: diagnostic and placement tests, learning plans and the mastery loop.",
  other: {
    "darkreader-lock": "",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      style={{ colorScheme: "light" }}
      className={cn(
        "min-h-full antialiased",
        figtree.variable,
        spaceMono.variable,
      )}
    >
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
