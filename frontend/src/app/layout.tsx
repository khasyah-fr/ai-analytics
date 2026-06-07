import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AI Analytics",
  description: "AI analytics dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen bg-[#fafafa] font-sans text-slate-900 antialiased">
        <header className="border-b border-slate-200/60 bg-white">
          <div className="mx-auto max-w-6xl px-6 py-4">
            <nav className="grid grid-cols-2 gap-6 md:gap-12 w-full">
              <NavLink href="/dashboard">
                <span className="text-base font-semibold">Analytics Dashboard</span>
              </NavLink>
              <NavLink href="/ask">
                <span className="text-base font-semibold">Ask AI</span>
              </NavLink>
            </nav>
          </div>
        </header>
        
        <main className="mx-auto max-w-6xl px-6 py-10">
          {children}
        </main>
        
        <footer className="mx-auto max-w-6xl px-6 py-8 text-xs font-mono text-slate-400 border-t border-slate-200/50 mt-20">
          Made with love 2026.
        </footer>
      </body>
    </html>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block w-full text-center p-4 rounded-xl border border-slate-200/70 bg-[#fafafa] transition-all hover:border-emerald-800 hover:text-emerald-800"
    >
      {children}
    </Link>
  );
}