import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getServerSession } from "next-auth/next";
import "./globals.css";
import ThemeToggle from "@/components/ThemeToggle";
import Providers from "@/components/Providers";
import ShaderBackground from "@/components/ShaderBackground";
import SignOutButton from "@/components/SignOutButton";
import { authOptions } from "@/lib/auth";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

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
        <Providers>
          <ShaderBackground />
          <header className="bg-white/10 dark:bg-gray-900/30 backdrop-blur-md border-b border-white/20 dark:border-gray-800/50 px-8 py-3 sticky top-0 z-10">
            <div className="max-w-4xl mx-auto flex justify-between items-center">
              {session?.user?.email && (
                <span className="text-sm text-gray-600 dark:text-gray-400">{session.user.email ?? ""}</span>
              )}
              <div className="flex items-center gap-4 ml-auto">
                {session && <SignOutButton />}
                <ThemeToggle />
              </div>
            </div>
          </header>
          {children}
        </Providers>
      </body>
    </html>
  );
}
