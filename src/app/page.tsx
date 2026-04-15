/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

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
  order?: number;
}

type FilterStatus = "all" | "open" | "in-progress" | "closed";
type FilterPriority = "all" | "low" | "medium" | "high";
type SortOption = "newest" | "oldest" | "priority-high" | "priority-low" | "custom";

const PRIORITY_ORDER: Record<Bug["priority"], number> = { high: 3, medium: 2, low: 1 };

function getDueDateBadge(bug: Bug): { label: string; className: string } | null {
  if (!bug.dueDate || bug.status === "closed") return null;
  const [y, m, d] = bug.dueDate.split("-").map(Number);
  const due = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0)
    return { label: `Overdue ${Math.abs(diffDays)}d`, className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" };
  if (diffDays === 0)
    return { label: "Due today", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" };
  if (diffDays === 1)
    return { label: "Due tomorrow", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" };
  if (diffDays <= 7)
    return { label: `Due in ${diffDays}d`, className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" };
  return { label: `Due ${due.toLocaleDateString()}`, className: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400" };
}

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
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const fetchBugs = async () => {
    const response = await fetch("/api/bugs");
    const data = await response.json();
    setBugs(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { fetchBugs(); }, []);

  useEffect(() => { setPage(1); }, [statusFilter, priorityFilter, tagFilter, search, sort]);

  useEffect(() => { setSelectedIds(new Set()); }, [page]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "n") { e.preventDefault(); router.push("/new"); }
      if (e.key === "/") { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "Escape" && selectionMode) { setSelectionMode(false); setSelectedIds(new Set()); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [router, selectionMode]);

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
          case "custom": return (a.order ?? 0) - (b.order ?? 0);
          default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
      });
  }, [bugs, statusFilter, priorityFilter, tagFilter, search, sort]);

  // In custom sort mode, show all (no pagination) so drag order is meaningful
  const isCustomSort = sort === "custom";
  const totalPages = isCustomSort ? 1 : Math.ceil(filteredBugs.length / BUGS_PER_PAGE);
  const paginatedBugs = isCustomSort
    ? filteredBugs
    : filteredBugs.slice((page - 1) * BUGS_PER_PAGE, page * BUGS_PER_PAGE);

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

  const pageIds = paginatedBugs.map((b) => b._id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pageIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => new Set([...prev, ...pageIds]));
    }
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const bulkUpdateStatus = async (status: Bug["status"]) => {
    setBulkProcessing(true);
    await Promise.all(
      [...selectedIds].map((id) =>
        fetch(`/api/bugs/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        })
      )
    );
    setSelectedIds(new Set());
    await fetchBugs();
    setBulkProcessing(false);
  };

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} bug${selectedIds.size > 1 ? "s" : ""}? This cannot be undone.`)) return;
    setBulkProcessing(true);
    await Promise.all([...selectedIds].map((id) => fetch(`/api/bugs/${id}`, { method: "DELETE" })));
    exitSelectionMode();
    await fetchBugs();
    setBulkProcessing(false);
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination || result.destination.index === result.source.index) return;

    const reordered = Array.from(filteredBugs);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);

    // Assign new order values and update local state optimistically
    const updated = reordered.map((bug, i) => ({ ...bug, order: i }));
    setBugs((prev) => {
      const map = new Map(updated.map((b) => [b._id, b]));
      return prev.map((b) => map.get(b._id) ?? b);
    });

    // Persist to API
    await fetch("/api/bugs/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: updated.map((b) => b._id) }),
    });
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
            <option value="custom">Custom order</option>
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
          /* ── Empty states ─────────────────────────────────────────────── */
          bugs.length === 0 ? (
            /* No bugs at all */
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-blue-400 dark:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">You&apos;re all clear!</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-xs">No bugs reported yet. Start tracking your first issue.</p>
              <a href="/new" className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors">
                Report your first bug
              </a>
            </div>
          ) : (
            /* Filters active but no results */
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-20 h-20 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">No results found</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-xs">
                {normalizedSearch
                  ? `No bugs match "${search.trim()}".`
                  : "No bugs match the current filters."}
              </p>
              <button
                onClick={() => { setSearch(""); setStatusFilter("all"); setPriorityFilter("all"); setTagFilter("all"); }}
                className="border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 px-5 py-2.5 rounded-lg font-medium transition-colors"
              >
                Clear all filters
              </button>
            </div>
          )
        ) : (
          <>
            {/* Bulk action bar */}
            {selectedIds.size > 0 && (
              <div className="bg-white dark:bg-gray-900 border-2 border-blue-400 dark:border-blue-500 rounded-xl px-5 py-4 mb-4 flex flex-wrap items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {selectedIds.size}
                  </span>
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    bug{selectedIds.size > 1 ? "s" : ""} selected
                  </span>
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                  >
                    ✕ clear
                  </button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-400 dark:text-gray-500">Set status:</span>
                  <button onClick={() => bulkUpdateStatus("open")} disabled={bulkProcessing}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors disabled:opacity-50">
                    Open
                  </button>
                  <button onClick={() => bulkUpdateStatus("in-progress")} disabled={bulkProcessing}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900/60 transition-colors disabled:opacity-50">
                    In Progress
                  </button>
                  <button onClick={() => bulkUpdateStatus("closed")} disabled={bulkProcessing}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/60 transition-colors disabled:opacity-50">
                    Closed
                  </button>
                  <div className="w-px h-4 bg-gray-200 dark:bg-gray-700" />
                  <button onClick={bulkDelete} disabled={bulkProcessing}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors disabled:opacity-50">
                    Delete selected
                  </button>
                </div>
              </div>
            )}

            {/* Selection mode toolbar */}
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => {
                  if (selectionMode) { exitSelectionMode(); } else { setSelectionMode(true); }
                }}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors
                  ${selectionMode
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
              >
                {selectionMode ? "Cancel" : "Select"}
              </button>
              {selectionMode && (
                <button
                  onClick={toggleSelectAll}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors
                    ${allPageSelected
                      ? "bg-gray-700 dark:bg-gray-200 text-white dark:text-gray-900 border-gray-700 dark:border-gray-200"
                      : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                >
                  {allPageSelected ? "Deselect all" : `Select all (${pageIds.length})`}
                </button>
              )}
              {selectionMode && (
                <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
                  Press <kbd className="font-mono">Esc</kbd> to cancel
                </span>
              )}
              {isCustomSort && !selectionMode && (
                <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" />
                  </svg>
                  Drag to reorder
                </span>
              )}
            </div>

            {/* Bug list */}
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="bugs" isDropDisabled={!isCustomSort || selectionMode}>
                {(provided) => (
                  <div
                    className="space-y-3"
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                  >
                    {paginatedBugs.map((bug, index) => {
                      const selected = selectedIds.has(bug._id);
                      const dueBadge = getDueDateBadge(bug);
                      return (
                        <Draggable
                          key={bug._id}
                          draggableId={bug._id}
                          index={index}
                          isDragDisabled={!isCustomSort || selectionMode}
                        >
                          {(dragProvided, dragSnapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              className="relative group"
                            >
                              <a
                                href={selectionMode ? undefined : `/bug/${bug._id}`}
                                onClick={selectionMode ? (e) => { e.preventDefault(); toggleSelect(bug._id); } : undefined}
                                className={`block ${selectionMode ? "cursor-pointer" : ""}`}
                              >
                                <div className={`bg-white dark:bg-gray-900 rounded-xl shadow p-6 transition-all
                                  ${dragSnapshot.isDragging ? "shadow-xl ring-2 ring-blue-400 dark:ring-blue-500 rotate-1" : ""}
                                  ${selected
                                    ? "ring-2 ring-blue-500 dark:ring-blue-400 ring-offset-1"
                                    : isOverdue(bug)
                                      ? "border border-red-300 dark:border-red-700"
                                      : "border border-transparent dark:border-gray-800"
                                  }`}>
                                  <div className="flex items-start justify-between mb-2 gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                      {/* Drag handle — only in custom sort mode */}
                                      {isCustomSort && !selectionMode && (
                                        <span
                                          {...dragProvided.dragHandleProps}
                                          className="shrink-0 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 cursor-grab active:cursor-grabbing touch-none"
                                          aria-label="Drag to reorder"
                                        >
                                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
                                          </svg>
                                        </span>
                                      )}
                                      {/* Selection indicator */}
                                      {selectionMode && (
                                        <span className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                                          ${selected
                                            ? "bg-blue-600 border-blue-600"
                                            : "border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-800"
                                          }`}>
                                          {selected && (
                                            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                          )}
                                        </span>
                                      )}
                                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white truncate">{bug.title}</h2>
                                    </div>
                                    <span className={`shrink-0 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(bug.status)}`}>
                                      {bug.status}
                                    </span>
                                  </div>
                                  {(bug.tags ?? []).length > 0 && (
                                    <div className={`flex gap-1 flex-wrap mb-2 ${selectionMode || isCustomSort ? "pl-9" : ""}`}>
                                      {bug.tags.map((tag) => (
                                        <span key={tag} className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs rounded-full font-medium">
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  <p className={`text-gray-600 dark:text-gray-400 mb-3 ${selectionMode || isCustomSort ? "pl-9" : ""}`}>{bug.description}</p>
                                  <div className={`flex items-center gap-3 flex-wrap ${selectionMode || isCustomSort ? "pl-9" : ""}`}>
                                    <span className={`w-3 h-3 rounded-full ${getPriorityColor(bug.priority)}`}></span>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">{bug.priority} priority</span>
                                    <span className="text-sm text-gray-400 dark:text-gray-500">
                                      {new Date(bug.createdAt).toLocaleDateString()}
                                    </span>
                                    {dueBadge && (
                                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${dueBadge.className}`}>
                                        {dueBadge.label}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </a>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </>
        )}

        {!isCustomSort && totalPages > 1 && (
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
