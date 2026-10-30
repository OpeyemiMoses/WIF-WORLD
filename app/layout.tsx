import type { Metadata } from "next";
import { Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "@/components/wallet/Web3Provider";
import { TopNav } from "@/components/layout/TopNav";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://wif-world.vercel.app"),
  title: "WIF WORLDS — The Living Map",
  description:
    "A persistent shared onchain strategy world powered by $WIF on Robinhood Chain. Claim territory, build settlements, and shape the living map.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${manrope.variable} ${jetbrainsMono.variable} h-full`}>
      <body className="h-full min-h-screen bg-obsidian font-sans text-ink-primary flex flex-col selection:bg-crimson selection:text-white">
        <Web3Provider>
          <TopNav />
          <div className="flex-1 flex flex-col min-h-0 pt-14 sm:pt-16 max-lg:landscape:pt-12">{children}</div>
        </Web3Provider>
      </body>
    </html>
  );
}

