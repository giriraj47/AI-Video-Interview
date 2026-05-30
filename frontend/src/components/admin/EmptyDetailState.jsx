import React from "react";

export default function EmptyDetailState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-600 space-y-3">
      <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1}
          stroke="currentColor"
          className="w-9 h-9 animate-pulse text-cyan-500/60"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-6.75h.008v.008H10.5v-.008Zm0 2.25h.008v.008H10.5v-.008Zm0 2.25h.008v.008H10.5v-.008Zm3 0h.008v.008h-.008v-.008Zm0-2.25h.008v.008h-.008v-.008Zm0-2.25h.008v.008h-.008v-.008Zm-9.75 18c0 1.242 1.008 2.25 2.25 2.25h12c1.242 0 2.25-1.008 2.25-2.25V11.25M3.75 4.5h16.5"
          />
        </svg>
      </div>
      <h4 className="text-white font-semibold tracking-wide">
        No Candidate Selected
      </h4>
      <p className="text-xs max-w-sm">
        Click on an interview submission inside the left panel to inspect the
        candidate's core metrics, skills list, recruiter summary, and dialog
        transcripts.
      </p>
    </div>
  );
}
