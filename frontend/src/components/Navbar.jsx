import React from "react";
import { Sparkles, LogOut } from "lucide-react";

export default function Navbar({ currentTime, onExitClick }) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#07090e]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left Side: Logo */}
        <div className="flex items-center space-x-3">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20">
            <Sparkles className="w-5 h-5 text-white" />
            <div className="absolute inset-0 rounded-lg bg-cyan-400 blur-sm opacity-30 animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="text-md font-bold tracking-wider uppercase bg-gradient-to-r from-white via-slate-100 to-cyan-300 bg-clip-text text-transparent">
              AI Interviewer
            </span>
            <span className="text-[10px] text-cyan-400 font-medium tracking-widest uppercase">
              Active Assessment
            </span>
          </div>
        </div>

        {/* Center: Live indicator and clock */}
        <div className="hidden md:flex items-center space-x-4 bg-slate-900/50 px-4 py-1.5 rounded-full border border-slate-800/60">
          <div className="flex items-center space-x-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            {/* <span className="text-xs font-semibold text-emerald-400 tracking-wide">
              SECURE LINK
            </span> */}
          </div>
          <span className="h-3 w-px bg-slate-800" />
          <span className="text-xs text-slate-400 font-mono tracking-tight">
            {currentTime || "18:14 PM"}
          </span>
        </div>
      </div>
    </header>
  );
}
