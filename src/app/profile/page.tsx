"use client";

import { useRef, useState } from "react";
import { useSession } from "next-auth/react";
import Toast from "@/components/Toast";

export default function ProfilePage() {
  const { data: session } = useSession();

  const [newUsername, setNewUsername] = useState("");
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingSecurity, setSavingSecurity] = useState(false);
  const [securityError, setSecurityError] = useState<string | null>(null);

  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayName = session?.user?.username ?? session?.user?.email ?? "?";
  const initial = displayName[0].toUpperCase();

  const showToast = (message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  };

  const handleAccountSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountError(null);
    if (!newUsername.trim()) { setAccountError("Enter a new username."); return; }
    setSavingAccount(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newUsername }),
      });
      const data = await res.json();
      if (!res.ok) { setAccountError(data.error ?? "Something went wrong."); return; }
      showToast("Username updated! Re-login to see it in the header.");
      setNewUsername("");
    } catch {
      setAccountError("Network error. Please try again.");
    } finally {
      setSavingAccount(false);
    }
  };

  const handleSecuritySave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError(null);
    if (newPassword && newPassword !== confirmPassword) {
      setSecurityError("New passwords do not match.");
      return;
    }
    setSavingSecurity(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newEmail: newEmail || undefined,
          newPassword: newPassword || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setSecurityError(data.error ?? "Something went wrong."); return; }
      showToast("Security settings updated! Re-login to apply.");
      setCurrentPassword("");
      setNewEmail("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setSecurityError("Network error. Please try again.");
    } finally {
      setSavingSecurity(false);
    }
  };

  return (
    <main className="min-h-screen bg-transparent p-8">
      <div className="max-w-md mx-auto">
        <a href="/" className="text-blue-600 dark:text-blue-400 hover:underline text-sm mb-8 block">
          ← Back to bugs
        </a>

        {/* Avatar card */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-6 mb-4 flex flex-col items-center text-center border border-gray-100 dark:border-gray-800">
          <div className="w-20 h-20 rounded-full bg-blue-800 text-white flex items-center justify-center text-3xl font-bold mb-3 ring-4 ring-blue-900/20 dark:ring-blue-900/40">
            {initial}
          </div>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">{displayName}</p>
          {session?.user?.username && session?.user?.email && (
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">{session.user.email}</p>
          )}
        </div>

        {/* Account — no password needed */}
        <form onSubmit={handleAccountSave} className="bg-white dark:bg-gray-900 rounded-xl shadow p-6 mb-4 border border-gray-100 dark:border-gray-800 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Account</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800 text-sm"
              placeholder={session?.user?.username ?? "Set a username"}
            />
          </div>
          {accountError && <p className="text-sm text-red-600 dark:text-red-400">{accountError}</p>}
          <button type="submit" disabled={savingAccount}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-sm transition-colors">
            {savingAccount ? "Saving..." : "Save Username"}
          </button>
        </form>

        {/* Security — current password required */}
        <form onSubmit={handleSecuritySave} className="bg-white dark:bg-gray-900 rounded-xl shadow p-6 border border-gray-100 dark:border-gray-800 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Security</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Current Password <span className="text-red-500">*</span>
            </label>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required
              className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800 text-sm"
              placeholder="Confirm your identity" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Email</label>
            <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800 text-sm"
              placeholder={session?.user?.email ?? "New email"} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800 text-sm"
              placeholder="Min. 8 characters" />
          </div>
          {newPassword && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm New Password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800 text-sm"
                placeholder="Repeat new password" />
            </div>
          )}
          {securityError && <p className="text-sm text-red-600 dark:text-red-400">{securityError}</p>}
          <button type="submit" disabled={savingSecurity}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-sm transition-colors">
            {savingSecurity ? "Saving..." : "Save Security Settings"}
          </button>
        </form>
      </div>

      <Toast message={toast ?? ""} visible={!!toast} />
    </main>
  );
}
