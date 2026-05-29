import React from "react";
import { Sparkles, Volume2 } from "lucide-react";

export default function AIInterviewer({ isAISpeaking, onToggleSpeech }) {
  return (
    <div
      className={`relative rounded-2xl glass-panel p-6 flex flex-col items-center justify-center min-h-[360px] sm:min-h-[420px] transition-all duration-300 ease-in-out ${isAISpeaking ? "speaking-glow" : "border-slate-800"}`}
    >
      {/* Holographic glowing ring surrounding the avatar */}
      <div className="relative flex items-center justify-center">
        {/* Outer pulsing ring */}
        <div
          className={`absolute rounded-full border border-cyan-500/30 transition-all duration-1000 ${isAISpeaking ? "w-48 h-48 animate-ping opacity-25" : "w-40 h-40 opacity-0"}`}
        />
        {/* Middle glowing shadow */}
        <div
          className={`absolute rounded-full bg-cyan-500/5 filter blur-md transition-all duration-500 ${isAISpeaking ? "w-44 h-44 opacity-100" : "w-0 h-0 opacity-0"}`}
        />

        {/* Center circular avatar */}
        <div className="relative w-36 h-36 rounded-full bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-slate-700/60 p-1 flex items-center justify-center overflow-hidden shadow-inner group">
          {/* Tech target grid lines */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#06b6d412_1px,transparent_1px)] bg-[size:12px_12px]" />

          {/* Voice soundwave visualization layer */}
          {isAISpeaking ? (
            <div className="absolute inset-0 flex items-center justify-center bg-cyan-950/20 backdrop-blur-[1px]">
              <div className="flex items-end space-x-1.5 h-10">
                <div className="w-1.5 bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-full wave-bar-1" />
                <div className="w-1.5 bg-gradient -to-t from-cyan-600 to-cyan-400 rounded-full wave-bar-2" />
                <div className="w-1.5 bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-full wave-bar-3" />
                <div className="w-1.5 bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-full wave-bar-4" />
                <div className="w-1.5 bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-full wave-bar-5" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-1 text-slate-500 group-hover:text-cyan-400 transition-colors duration-300">
              <Volume2 className="w-8 h-8 animate-pulse" />
              <span className="text-[10px] uppercase tracking-widest font-mono">
                Idle
              </span>
            </div>
          )}

          {/* Animated tech ring border */}
          <div className="absolute inset-0 border border-cyan-500/10 rounded-full animate-[spin_40s_linear_infinite]" />
        </div>
      </div>

      {/* AI Voice Activity Trigger for testing interactivity */}
      <div className="mt-6 flex flex-col items-center">
        <button
          onClick={onToggleSpeech}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-full border text-xs font-mono tracking-wider transition-all duration-300 cursor-pointer ${isAISpeaking ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400 shadow-sm shadow-cyan-950/30" : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"}`}
        >
          <span>Voice Status:</span>
          <span className="font-bold uppercase tracking-widest">
            {isAISpeaking ? "Speaking" : "Muted"}
          </span>
        </button>
      </div>

      {/* Bottom-Left Tag: Interviewer */}
      <div className="absolute bottom-4 left-4 flex items-center space-x-2 px-3 py-1.5 rounded-lg glass-pill">
        <div
          className={`w-2 h-2 rounded-full transition-colors duration-300 ${isAISpeaking ? "bg-cyan-400 animate-pulse" : "bg-slate-500"}`}
        />
        <span className="text-xs font-semibold tracking-wide text-slate-300">
          Interviewer
        </span>
      </div>

      {/* Top-Right Voice Status Bar */}
      <div className="absolute top-4 right-4 flex items-center space-x-1.5">
        <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">
          SYS STABLE
        </span>
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      </div>
    </div>
  );
}
