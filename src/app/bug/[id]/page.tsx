/* eslint-disable @next/next/no-html-link-for-pages */
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

interface Bug {
  _id: string;
  title: string;
  description: string;
  status: "open" | "in-progress" | "closed";
  priority: "low" | "medium" | "high";
  createdAt: string;
  updatedAt: string;
}

export default function BugDetail() {
  const router = useRouter();
  const { id } = useParams();
  const [bug, setBug] = useState<Bug | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", description: "", priority: "" });

  useEffect(() => {
    fetch(`/api/bugs/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setBug(data);
        setEditForm({ title: data.title, description: data.description, priority: data.priority });
        setLoading(false);
      });
  }, [id]);

  const updateStatus = async (newStatus: Bug["status"]) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/bugs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        console.error("Failed to update bug status", res.status, res.statusText);
        return;
      }
      const updated: Bug = await res.json();
      setBug(updated);
    } catch (error) {
      console.error("Error while updating bug status", error);
    } finally {
      setUpdating(false);
    }
  };

  const saveEdit = async () => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/bugs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) {
        console.error("Failed to update bug", res.status, res.statusText);
        return;
      }
      const updated: Bug = await res.json();
      setBug(updated);
      setEditing(false);
    } catch (error) {
      console.error("Error while updating bug", error);
    } finally {
      setUpdating(false);
    }
  };

  const deleteBug = async () => {
    if (!confirm("Are you sure you want to delete this bug?")) return;
    await fetch(`/api/bugs/${id}`, { method: "DELETE" });
    router.push("/");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-red-100 text-red-800";
      case "in-progress": return "bg-yellow-100 text-yellow-800";
      case "closed": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-500";
      case "medium": return "bg-yellow-500";
      case "low": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!bug) return <div className="p-8 text-center">Bug not found.</div>;

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <a href="/" className="text-blue-600 hover:underline text-sm mb-6 block">
          ← Back to all bugs
        </a>

        <div className="bg-white rounded-lg shadow p-6">
          {editing ? (
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows={4}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={editForm.priority}
                  onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={saveEdit}
                  disabled={updating}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                >
                  {updating ? "Saving..." : "Save changes"}
                </button>
                <button
                  onClick={() => {
                    setEditForm({ title: bug.title, description: bug.description, priority: bug.priority });
                    setEditing(false);
                  }}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold text-gray-900">{bug.title}</h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(bug.status)}`}>
                  {bug.status}
                </span>
              </div>

              <p className="text-gray-600 mb-6">{bug.description}</p>

              <div className="flex items-center gap-3 mb-6 text-sm text-gray-500">
                <span className={`w-3 h-3 rounded-full ${getPriorityColor(bug.priority)}`}></span>
                <span>{bug.priority} priority</span>
                <span>·</span>
                <span>Reported {new Date(bug.createdAt).toLocaleDateString()}</span>
              </div>
            </>
          )}

          <div className="border-t pt-6">
            <p className="text-sm font-medium text-gray-700 mb-3">Update Status</p>
            <div className="flex gap-2 mb-6">
              {(["open", "in-progress", "closed"] as Bug["status"][]).map((s) => (
                <button
                  key={s}
                  onClick={() => updateStatus(s)}
                  disabled={updating || bug.status === s}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors
                    ${bug.status === s
                      ? "bg-gray-100 text-gray-400 border-gray-200 cursor-default"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="flex gap-4">
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="text-blue-600 text-sm hover:underline"
                >
                  Edit bug
                </button>
              )}
              <button
                onClick={deleteBug}
                className="text-red-600 text-sm hover:underline"
              >
                Delete this bug
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
