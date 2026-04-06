"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";

interface ProfileMenuProps {
  username?: string | null;
  email?: string | null;
}

export default function ProfileMenu({ username, email }: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const displayName = username ?? email ?? "?";
  const initial = displayName[0].toUpperCase();

  // Fetch avatar from API (too large to store in JWT cookie)
  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.avatar) setAvatar(data.avatar); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 group"
        aria-label="Profile menu"
        aria-expanded={open}
      >
        {avatar ? (
          <img src={avatar} alt={displayName} className="w-7 h-7 rounded-full object-cover ring-2 ring-white/20 dark:ring-gray-700" />
        ) : (
          <span className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
            {initial}
          </span>
        )}
        <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors max-w-[120px] truncate">
          {displayName}
        </span>
        <svg className={`w-3 h-3 text-gray-400 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-52 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl py-1.5 z-50">
          <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              {avatar ? (
                <img src={avatar} alt={displayName} className="w-8 h-8 rounded-full object-cover shrink-0" />
              ) : (
                <span className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                  {initial}
                </span>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{displayName}</p>
                {username && email && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{email}</p>
                )}
              </div>
            </div>
          </div>

          <a href="/profile" onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Profile settings
          </a>

          <div className="border-t border-gray-100 dark:border-gray-800 mt-1 pt-1">
            <button onClick={() => signOut()}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
