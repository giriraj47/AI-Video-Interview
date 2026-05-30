import React from "react";
import { formatDateTime, getHiringBadgeStyle } from "./adminUtils";

export default function InterviewSidebar({
  filteredInterviews,
  selectedInterview,
  setSelectedInterview,
  searchQuery,
  setSearchQuery,
  filterDecision,
  setFilterDecision,
  sortOrder,
  setSortOrder,
}) {
  return (
    <div className="w-96 border-r border-slate-900 flex flex-col bg-slate-950">
      {/* Search & Filtering Inputs */}
      <div className="p-4 space-y-3 border-b border-slate-900 bg-slate-950/50">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search email, skills, phone..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 focus:border-cyan-500/80 text-slate-200 placeholder-slate-500 focus:outline-none transition-colors"
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-4 h-4 text-slate-500 absolute left-3 top-2.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z"
            />
          </svg>
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <select
              value={filterDecision}
              onChange={(e) => setFilterDecision(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-slate-400 text-xxs px-2 py-1.5 rounded-lg focus:outline-none focus:border-cyan-500/80"
            >
              <option value="All">All Decisions</option>
              <option value="Strong Hire">Strong Hire</option>
              <option value="Hire">Hire</option>
              <option value="No Hire">No Hire</option>
            </select>
          </div>

          <div className="flex-1">
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-slate-400 text-xxs px-2 py-1.5 rounded-lg focus:outline-none focus:border-cyan-500/80"
            >
              <option value="newest">Newest First</option>
              <option value="score-high">Highest Score</option>
              <option value="score-low">Lowest Score</option>
            </select>
          </div>
        </div>
      </div>

      {/* Candidate List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-900/60 custom-scrollbar">
        {filteredInterviews.length === 0 ? (
          <div className="p-8 text-center text-slate-600 text-xs">
            No applications match filters.
          </div>
        ) : (
          filteredInterviews.map((item) => {
            const isSelected = selectedInterview?._id === item._id;
            const score = item.evaluation?.overallScore;
            return (
              <div
                key={item._id}
                onClick={() => setSelectedInterview(item)}
                className={`p-4 cursor-pointer transition-all border-l-2 flex flex-col gap-2 hover:bg-slate-900/40 relative ${
                  isSelected
                    ? "bg-slate-900/80 border-cyan-500"
                    : "border-transparent"
                }`}
              >
                <div className="flex justify-between items-start">
                  <span
                    className="text-xs font-semibold text-slate-200 truncate max-w-[170px]"
                    title={item.candidateEmail}
                  >
                    {item.candidateEmail}
                  </span>
                  {score !== undefined && (
                    <span
                      className={`text-xxs font-mono font-bold px-2 py-0.5 rounded-md border ${
                        score >= 8
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : score >= 5
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      }`}
                    >
                      {score}/10
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-center text-xxs text-slate-500">
                  <span>{item.phoneNumber || "No Phone"}</span>
                  <span>{formatDateTime(item.createdAt)}</span>
                </div>

                {item.evaluation?.hiringDecision && (
                  <div className="flex gap-1.5 mt-0.5">
                    <span
                      className={`text-3xxs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${getHiringBadgeStyle(item.evaluation.hiringDecision)}`}
                    >
                      {item.evaluation.hiringDecision}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
