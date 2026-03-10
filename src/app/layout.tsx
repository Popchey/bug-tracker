import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeToggle from "@/components/ThemeToggle";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bug Tracker App",
  description: "A simple bug tracking application built with Next.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme'),d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(!t&&d))document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <div aria-hidden="true" className="bg-lines">
          <div className="line line-1" />
          <div className="line line-2" />
          <div className="line line-3" />
          <div className="line line-4" />
          <div className="line line-5" />
          <div className="line line-6" />
          <div className="line line-7" />
          <div className="line line-8" />
          <div className="line line-9" />
        </div>
        <header className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-800/50 px-8 py-3 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto flex justify-end">
            <ThemeToggle />
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
