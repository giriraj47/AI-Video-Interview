import React, { useEffect } from "react";
import { useInterview } from "../context/InterviewContext";
import { useNavigate } from "react-router-dom";

export default function ResultsPage() {
  const { media } = useInterview();
  const navigate = useNavigate();

  // Exit interview (release media streams) automatically on mount
  useEffect(() => {
    console.log("[ResultsPage] Exiting interview and releasing media streams...");
    if (media && typeof media.handleConfirmExit === "function") {
      media.handleConfirmExit();
    }
  }, []); // eslint-disable-next-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col items-center justify-center flex-1 space-y-6 text-center max-w-xl mx-auto py-16 px-6 glass-panel border-slate-800/80 rounded-3xl my-8">
      {/* Animated Success Badge */}
      <div className="relative w-24 h-24 rounded-full bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10 group overflow-hidden">
        {/* Subtle spinning glow ring */}
        <div className="absolute inset-0 rounded-full border border-dashed border-emerald-500/20 animate-[spin_40s_linear_infinite]" />
        
        <svg
          className="w-12 h-12 transition-transform duration-500 group-hover:scale-110"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>

      <div className="space-y-3">
        <h1 className="text-3xl font-black text-white tracking-wide bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
          Interview Completed
        </h1>
        <div className="h-1 w-20 bg-gradient-to-r from-emerald-500 to-teal-500 mx-auto rounded-full" />
      </div>

      <p className="text-slate-300 leading-relaxed text-sm max-w-sm">
        Thank you for completing your evaluation. Your responses and video recordings have been processed.
      </p>
      
      <p className="text-xs text-slate-500 bg-slate-950/50 border border-slate-900 px-4 py-2.5 rounded-xl font-mono">
        Recruitment team review status: <span className="text-emerald-400 font-bold uppercase animate-pulse">Pending</span>
      </p>

      <div className="pt-6 w-full max-w-xs">
        <button
          onClick={() => {
            navigate("/setup");
          }}
          className="w-full px-6 py-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-950 text-slate-300 font-semibold text-sm transition-all duration-200 cursor-pointer hover:text-white"
        >
          Restart Simulation
        </button>
      </div>
    </div>
  );
}
