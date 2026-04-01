"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const BUGS_PER_PAGE = 10;

interface Bug {
  _id: string;
  title: string;
  description: string;
  status: "open" | "in-progress" | "closed";
  priority: "low" | "medium" | "high";
  dueDate?: string;
  tags: string[];
  createdAt: string;
}

type FilterStatus = "all" | "open" | "in-progress" | "closed";
type FilterPriority = "all" | "low" | "medium" | "high";
type SortOption = "newest" | "oldest" | "priority-high" | "priority-low";

const PRIORITY_ORDER: Record<Bug["priority"], number> = { high: 3, medium: 2, low: 1 };

export default function Home() {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [priorityFilter, setPriorityFilter] = useState<FilterPriority>("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [page, setPage] = useState(1);

  const fetchBugs = async () => {
    const response = await fetch("/api/bugs");
    const data = await response.json();
    setBugs(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    fetchBugs();
  }, []);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, priorityFilter, tagFilter, search, sort]);

  // Keyboard shortcuts: n = new bug, / = focus search
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "n") { e.preventDefault(); router.push("/new"); }
      if (e.key === "/") { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [router]);

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

  const statusCounts = useMemo(() =>
    bugs.reduce((acc, b) => {
      acc[b.status] = (acc[b.status] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  [bugs]);

  // Tab title: show open bug count
  useEffect(() => {
    const n = statusCounts["open"] ?? 0;
    document.title = n > 0 ? `Bug Tracker (${n} open)` : "Bug Tracker";
  }, [statusCounts]);

  const countByStatus = (status: FilterStatus) =>
    status === "all" ? bugs.length : (statusCounts[status] ?? 0);

  const allTags = useMemo(() =>
    Array.from(new Set(bugs.flatMap((b) => b.tags ?? []))).sort(),
  [bugs]);

  const normalizedSearch = search.trim().toLowerCase();

  const filteredBugs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bugs
      .filter((b) => statusFilter === "all" || b.status === statusFilter)
      .filter((b) => priorityFilter === "all" || b.priority === priorityFilter)
      .filter((b) => tagFilter === "all" || (b.tags ?? []).includes(tagFilter))
      .filter((b) => !q || b.title.toLowerCase().includes(q))
      .sort((a, b) => {
        switch (sort) {
          case "oldest": return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          case "priority-high": return PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
          case "priority-low": return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
          default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
      });
  }, [bugs, statusFilter, priorityFilter, tagFilter, search, sort]);

  const totalPages = Math.ceil(filteredBugs.length / BUGS_PER_PAGE);
  const paginatedBugs = filteredBugs.slice((page - 1) * BUGS_PER_PAGE, page * BUGS_PER_PAGE);

  const isOverdue = (bug: Bug): boolean => {
    if (!bug.dueDate || bug.status === "closed") return false;
    const parts = bug.dueDate.split("-");
    if (parts.length !== 3) return false;
    const [y, m, d] = parts.map(Number);
    const due = new Date(y, m - 1, d);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return due < today;
  };

  const statusFilterOptions: { label: string; value: FilterStatus }[] = [
    { label: "All", value: "all" },
    { label: "Open", value: "open" },
    { label: "In Progress", value: "in-progress" },
    { label: "Closed", value: "closed" },
  ];

  const priorityFilterOptions: { label: string; value: FilterPriority }[] = [
    { label: "All Priority", value: "all" },
    { label: "High", value: "high" },
    { label: "Medium", value: "medium" },
    { label: "Low", value: "low" },
  ];

  if (loading) return <div className="p-8 text-center dark:text-gray-400">Loading...</div>;

  return (
    <main className="min-h-screen bg-transparent p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Bug Tracker</h1>
          <a href="/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            Report Bug
          </a>
        </div>

        {/* Dashboard summary */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total", count: bugs.length, color: "text-gray-900 dark:text-white" },
            { label: "Open", count: statusCounts["open"] ?? 0, color: "text-red-600 dark:text-red-400" },
            { label: "In Progress", count: statusCounts["in-progress"] ?? 0, color: "text-yellow-600 dark:text-yellow-400" },
            { label: "Closed", count: statusCounts["closed"] ?? 0, color: "text-green-600 dark:text-green-400" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white dark:bg-gray-900 rounded-lg shadow p-4 text-center border border-gray-100 dark:border-gray-800">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.count}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Search + Sort */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <input
              ref={searchRef}
              type="text"
              placeholder="Search bugs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white bg-white dark:bg-gray-900"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-600 pointer-events-none hidden sm:block">
              <kbd className="font-mono">/</kbd> search · <kbd className="font-mono">n</kbd> new
            </span>
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="priority-high">High priority first</option>
            <option value="priority-low">Low priority first</option>
          </select>
        </div>

        {/* Status filter */}
        <div className="flex gap-2 mb-3">
          {statusFilterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center gap-2
                ${statusFilter === opt.value
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
            >
              {opt.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold
                ${statusFilter === opt.value ? "bg-blue-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"}`}>
                {countByStatus(opt.value)}
              </span>
            </button>
          ))}
        </div>

        {/* Priority filter + Tag filter */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {priorityFilterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPriorityFilter(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
                ${priorityFilter === opt.value
                  ? "bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 border-gray-800 dark:border-gray-200"
                  : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
            >
              {opt.label}
            </button>
          ))}

          <span className="text-gray-300 dark:text-gray-700 text-xs">|</span>
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            disabled={allTags.length === 0}
            className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="all">{allTags.length === 0 ? "No tags yet" : "All Tags"}</option>
            {allTags.map((tag) => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </div>

        {filteredBugs.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-12">
            {normalizedSearch
              ? `No bugs matching "${search.trim()}".`
              : statusFilter === "all" && priorityFilter === "all" && tagFilter === "all"
              ? `No bugs reported yet. Click "Report Bug" to create one.`
              : `No bugs match the current filters.`}
          </p>
        ) : (
          <div className="space-y-4">
            {paginatedBugs.map((bug) => (
              <a key={bug._id} href={`/bug/${bug._id}`} className="block">
                <div className={`bg-white dark:bg-gray-900 rounded-lg shadow p-6 hover:shadow-md transition-shadow border ${isOverdue(bug) ? "border-red-300 dark:border-red-700" : "border-transparent dark:border-gray-800"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{bug.title}</h2>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(bug.status)}`}>
                      {bug.status}
                    </span>
                  </div>
                  {(bug.tags ?? []).length > 0 && (
                    <div className="flex gap-1 flex-wrap mb-2">
                      {bug.tags.map((tag) => (
                        <span key={tag} className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs rounded-full font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-gray-600 dark:text-gray-400 mb-3">{bug.description}</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`w-3 h-3 rounded-full ${getPriorityColor(bug.priority)}`}></span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{bug.priority} priority</span>
                    <span className="text-sm text-gray-400 dark:text-gray-500">
                      {new Date(bug.createdAt).toLocaleDateString()}
                    </span>
                    {bug.dueDate && (
                      <span className={`text-sm font-medium ${isOverdue(bug) ? "text-red-600 dark:text-red-400" : "text-gray-500 dark:text-gray-400"}`}>
                        · Due: {new Date(bug.dueDate).toLocaleDateString()}{isOverdue(bug) && " (overdue)"}
                      </span>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Prev
            </button>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
