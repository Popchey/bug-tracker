/* eslint-disable react-hooks/set-state-in-effect */
"use client";

// What this does:
//   - Fetches all bugs from your API when the page loads
//   - Shows them as cards with status badges and priority colors
//   - Has a "Report Bug" button that links to a /new page (we'll build next)
//   - Each bug card links to a detail page

import { useEffect, useState } from "react";

interface Bug {
  _id: string;
  title: string;
  description: string;
  status: "open" | "in-progress" | "closed";
  priority: "low" | "medium" | "high";
  createdAt: string;
}

export default function Home() {
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [loading, setLoading] = useState(true);

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
      case "open":
        return "bg-red-100 text-red-800";
      case "in-progress":
        return "bg-yellow-100 text-yellow-800";
      case "closed":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Bug Tracker</h1>
          <a
            href="/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Report Bug
          </a>
        </div>

        {bugs.length === 0 ? (
          <p className="text-gray-500 text-center py-12">
            No bugs reported yet. Click &quot;Report Bug&quot; to create one.
          </p>
        ) : (
          <div className="space-y-4">
            {bugs.map((bug) => (
              <a key={bug._id} href={`/bug/${bug._id}`} className="block">
                <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl font-semibold text-gray-900">
                      {bug.title}
                    </h2>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(bug.status)}`}
                    >
                      {bug.status}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-3">{bug.description}</p>
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-3 h-3 rounded-full ${getPriorityColor(bug.priority)}`}
                    ></span>
                    <span className="text-sm text-gray-500">
                      {bug.priority} priority
                    </span>
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
