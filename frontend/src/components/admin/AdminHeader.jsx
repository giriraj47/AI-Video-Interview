import React from "react";
import { useNavigate } from "react-router-dom";

export default function AdminHeader({ logout }) {
  const navigate = useNavigate();

  return (
    <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white shadow-md shadow-cyan-500/20 font-mono">
          Ω
        </div>
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            AI Recruiter Ledger{" "}
            <span className="text-xs bg-cyan-500/10 text-cyan-400 font-mono px-2 py-0.5 border border-cyan-500/20 rounded-md">
              ADMIN
            </span>
          </h1>
          <p className="text-xs text-slate-500">
            Video &amp; audio interview session explorer
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/setup")}
          className="px-4 py-2 text-sm font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
        >
          Start New Candidate Mock
        </button>
        <button
          onClick={logout}
          className="px-4 py-2 text-sm font-semibold rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
        >
          Lock Screen
        </button>
      </div>
    </header>
  );
}
