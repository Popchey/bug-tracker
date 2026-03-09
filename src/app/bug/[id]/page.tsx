/* eslint-disable @next/next/no-html-link-for-pages */
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Toast from "@/components/Toast";

interface Comment {
  _id: string;
  text: string;
  createdAt: string;
}

interface Bug {
  _id: string;
  title: string;
  description: string;
  status: "open" | "in-progress" | "closed";
  priority: "low" | "medium" | "high";
  dueDate?: string;
  tags: string[];
  comments: Comment[];
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
  const [editForm, setEditForm] = useState({ title: "", description: "", priority: "", dueDate: "" });
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editTagInput, setEditTagInput] = useState("");
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    fetch(`/api/bugs/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setBug(data);
        setEditForm({
          title: data.title,
          description: data.description,
          priority: data.priority,
          dueDate: data.dueDate ? new Date(data.dueDate).toISOString().split("T")[0] : "",
        });
        setEditTags(data.tags ?? []);
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (!editing) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [editing]);

  const showToast = (message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  };

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
      showToast("Status updated!");
    } catch (error) {
      console.error("Error while updating bug status", error);
    } finally {
      setUpdating(false);
    }
  };

  const saveEdit = async () => {
    setUpdating(true);
    try {
      const payload = { ...editForm, tags: editTags, dueDate: editForm.dueDate || null };
      const res = await fetch(`/api/bugs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        console.error("Failed to update bug", res.status, res.statusText);
        return;
      }
      const updated: Bug = await res.json();
      setBug(updated);
      setEditing(false);
      showToast("Bug saved!");
    } catch (error) {
      console.error("Error while updating bug", error);
    } finally {
      setUpdating(false);
    }
  };

  const addEditTag = () => {
    const t = editTagInput.trim().toLowerCase();
    if (t && !editTags.includes(t)) setEditTags([...editTags, t]);
    setEditTagInput("");
  };

  const removeEditTag = (tag: string) => setEditTags(editTags.filter((t) => t !== tag));

  const submitComment = async () => {
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/bugs/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: commentText.trim() }),
      });
      if (!res.ok) {
        console.error("Failed to add comment", res.status, res.statusText);
        return;
      }
      const updated: Bug = await res.json();
      setBug(updated);
      setCommentText("");
      showToast("Comment added!");
    } catch (error) {
      console.error("Error adding comment", error);
    } finally {
      setSubmittingComment(false);
    }
  };

  const deleteBug = async () => {
    if (!confirm("Are you sure you want to delete this bug?")) return;
    await fetch(`/api/bugs/${id}`, { method: "DELETE" });
    router.push("/");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      case "in-progress": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "closed": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
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

  const getDateOnly = (dateStr: string): Date | null => {
    const parts = dateStr.split("-");
    if (parts.length !== 3) return null;
    const [y, m, d] = parts.map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const isOverdue = !!bug && !!bug.dueDate && bug.status !== "closed" && (() => {
    const due = getDateOnly(bug.dueDate!);
    return due ? due < today : false;
  })();

  if (loading) return <div className="p-8 text-center dark:text-gray-400">Loading...</div>;
  if (!bug) return <div className="p-8 text-center dark:text-gray-400">Bug not found.</div>;

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8">
      <div className="max-w-2xl mx-auto">
        <a href="/" className="text-blue-600 dark:text-blue-400 hover:underline text-sm mb-6 block">
          ← Back to all bugs
        </a>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 mb-6">
          {editing ? (
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  rows={4}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                <select
                  value={editForm.priority}
                  onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Due Date <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="date"
                  value={editForm.dueDate}
                  onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={editTagInput}
                    onChange={(e) => setEditTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addEditTag(); } }}
                    className="flex-1 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
                    placeholder="Add a tag..."
                  />
                  <button
                    type="button"
                    onClick={addEditTag}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-medium"
                  >
                    Add
                  </button>
                </div>
                {editTags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {editTags.map((tag) => (
                      <span key={tag} className="flex items-center gap-1 px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs rounded-full">
                        {tag}
                        <button type="button" onClick={() => removeEditTag(tag)} className="hover:text-indigo-900 dark:hover:text-indigo-100">×</button>
                      </span>
                    ))}
                  </div>
                )}
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
                    setEditForm({
                      title: bug.title,
                      description: bug.description,
                      priority: bug.priority,
                      dueDate: bug.dueDate ? new Date(bug.dueDate).toISOString().split("T")[0] : "",
                    });
                    setEditTags(bug.tags ?? []);
                    setEditing(false);
                  }}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{bug.title}</h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(bug.status)}`}>
                  {bug.status}
                </span>
              </div>

              {(bug.tags ?? []).length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {bug.tags.map((tag) => (
                    <span key={tag} className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs rounded-full font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <p className="text-gray-600 dark:text-gray-400 mb-4">{bug.description}</p>

              <div className="flex items-center gap-3 mb-4 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
                <span className={`w-3 h-3 rounded-full ${getPriorityColor(bug.priority)}`}></span>
                <span>{bug.priority} priority</span>
                <span>·</span>
                <span>Reported {new Date(bug.createdAt).toLocaleDateString()}</span>
                {bug.dueDate && (
                  <>
                    <span>·</span>
                    <span className={`font-medium ${isOverdue ? "text-red-600 dark:text-red-400" : ""}`}>
                      Due: {new Date(bug.dueDate).toLocaleDateString()}{isOverdue && " (overdue)"}
                    </span>
                  </>
                )}
              </div>
            </>
          )}

          <div className="border-t dark:border-gray-800 pt-6">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Update Status</p>
            <div className="flex gap-2 mb-6">
              {(["open", "in-progress", "closed"] as Bug["status"][]).map((s) => (
                <button
                  key={s}
                  onClick={() => updateStatus(s)}
                  disabled={updating || bug.status === s}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors
                    ${bug.status === s
                      ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 border-gray-200 dark:border-gray-700 cursor-default"
                      : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
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
                  className="text-blue-600 dark:text-blue-400 text-sm hover:underline"
                >
                  Edit bug
                </button>
              )}
              <button
                onClick={deleteBug}
                className="text-red-600 dark:text-red-400 text-sm hover:underline"
              >
                Delete this bug
              </button>
            </div>
          </div>
        </div>

        {/* Comments section */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Notes {(bug.comments ?? []).length > 0 && <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({bug.comments.length})</span>}
          </h2>

          {(bug.comments ?? []).length > 0 && (
            <div className="space-y-4 mb-6">
              {bug.comments.map((comment) => (
                <div key={comment._id} className="border-l-2 border-indigo-300 dark:border-indigo-700 pl-4">
                  <p className="text-gray-700 dark:text-gray-300 text-sm">{comment.text}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {new Date(comment.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3">
            <textarea
              rows={3}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a note..."
              className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800 text-sm"
            />
            <button
              onClick={submitComment}
              disabled={submittingComment || !commentText.trim()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              {submittingComment ? "Adding..." : "Add Note"}
            </button>
          </div>
        </div>
      </div>

      <Toast message={toast ?? ""} visible={!!toast} />
    </main>
  );
}
