import React from "react";

export default function AdminMetrics({ metrics }) {
  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 border-b border-slate-900 bg-slate-950/30">
      {/* Total Submissions */}
      <div className="glass-panel p-5 border-slate-900 rounded-2xl flex items-center justify-between">
        <div>
          <span className="text-xs font-bold font-mono tracking-widest text-slate-500 uppercase">
            Total Submissions
          </span>
          <h3 className="text-3xl font-extrabold text-white mt-1">
            {metrics.total}
          </h3>
        </div>
        <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A2.25 2.25 0 0 1 12.75 21.5h-1.5a2.25 2.25 0 0 1-2.25-2.263V19.13m4.13-3.07c-.6-.414-1.275-.688-2.008-.8M13.5 13.5a1.5 1.5 0 0 1-3 0 1.5 1.5 0 0 1 3 0Zm-5.32 2.57c-.6-.414-1.275-.688-2.008-.8M6.75 16.5A4.125 4.125 0 0 0 2.25 19v1.5a2.25 2.25 0 0 0 2.25 2.25h1.5a2.25 2.25 0 0 0 2.25-2.25V19a4.125 4.125 0 0 0-4.125-4.125ZM8.25 10.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z"
            />
          </svg>
        </div>
      </div>

      {/* Hiring Ratio */}
      <div className="glass-panel p-5 border-slate-900 rounded-2xl flex items-center justify-between">
        <div>
          <span className="text-xs font-bold font-mono tracking-widest text-slate-500 uppercase">
            Hiring Ratio
          </span>
          <h3 className="text-3xl font-extrabold text-cyan-400 mt-1">
            {metrics.hireRate}%
          </h3>
        </div>
        <div className="w-12 h-12 rounded-xl bg-cyan-950/30 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z"
            />
          </svg>
        </div>
      </div>

      {/* Average Overall Score */}
      <div className="glass-panel p-5 border-slate-900 rounded-2xl flex items-center justify-between">
        <div>
          <span className="text-xs font-bold font-mono tracking-widest text-slate-500 uppercase">
            Avg Overall Score
          </span>
          <h3 className="text-3xl font-extrabold text-purple-400 mt-1">
            {metrics.avgScore}{" "}
            <span className="text-sm font-medium text-slate-500">/ 10</span>
          </h3>
        </div>
        <div className="w-12 h-12 rounded-xl bg-purple-950/30 border border-purple-500/20 flex items-center justify-center text-purple-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
            />
          </svg>
        </div>
      </div>
    </section>
  );
}
