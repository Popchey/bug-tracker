/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useMemo, useState } from "react";

interface Bug {
  _id: string;
  title: string;
  description: string;
  status: "open" | "in-progress" | "closed";
  priority: "low" | "medium" | "high";
  createdAt: string;
}

type FilterStatus = "all" | "open" | "in-progress" | "closed";

export default function Home() {
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");

  const fetchBugs = async () => {
    const response = await fetch("/api/bugs");
    const data = await response.json();
    setBugs(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchBugs();
  }, []);

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

  const statusCounts = useMemo(() =>
    bugs.reduce((acc, b) => {
      acc[b.status] = (acc[b.status] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  [bugs]);

  const countByStatus = (status: FilterStatus) =>
    status === "all" ? bugs.length : (statusCounts[status] ?? 0);

  const normalizedSearch = search.trim().toLowerCase();

  const filteredBugs = bugs
    .filter((b) => filter === "all" || b.status === filter)
    .filter((b) => !normalizedSearch || b.title.toLowerCase().includes(normalizedSearch));

  const filterOptions: { label: string; value: FilterStatus }[] = [
    { label: "All", value: "all" },
    { label: "Open", value: "open" },
    { label: "In Progress", value: "in-progress" },
    { label: "Closed", value: "closed" },
  ];

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Bug Tracker</h1>
          <a
            href="/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Report Bug
          </a>
        </div>

        <input
          type="text"
          placeholder="Search bugs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
        />

        <div className="flex gap-2 mb-6">
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center gap-2
                ${filter === opt.value
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                }`}
            >
              {opt.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold
                ${filter === opt.value ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600"}`}>
                {countByStatus(opt.value)}
              </span>
            </button>
          ))}
        </div>

        {filteredBugs.length === 0 ? (
          <p className="text-gray-500 text-center py-12">
            {normalizedSearch
              ? `No bugs matching "${search.trim()}".`
              : filter === "all"
              ? `No bugs reported yet. Click "Report Bug" to create one.`
              : `No ${filterOptions.find((o) => o.value === filter)?.label} bugs found.`}
          </p>
        ) : (
          <div className="space-y-4">
            {filteredBugs.map((bug) => (
              <a key={bug._id} href={`/bug/${bug._id}`} className="block">
                <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl font-semibold text-gray-900">{bug.title}</h2>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(bug.status)}`}>
                      {bug.status}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-3">{bug.description}</p>
                  <div className="flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-full ${getPriorityColor(bug.priority)}`}></span>
                    <span className="text-sm text-gray-500">{bug.priority} priority</span>
                    <span className="text-sm text-gray-400">
                      {new Date(bug.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
