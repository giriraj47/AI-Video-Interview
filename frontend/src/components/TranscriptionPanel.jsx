import React from 'react'
import { Sparkles, Lock } from 'lucide-react'

export default function TranscriptionPanel({ currentQuestion }) {
  return (
    <div className="w-full rounded-2xl glass-panel p-6 relative flex flex-col space-y-4 shadow-xl">
      {/* Header row of the transcription */}
      <div className="flex items-center justify-between">
        {/* Top-Left Inside: Badge and indicator */}
        <div className="flex items-center space-x-2.5">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800/80">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-500"></span>
            </span>
            <span className="text-xs font-semibold tracking-wide text-slate-300">Transcription</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500 uppercase hidden sm:inline-block">LIVE FEED</span>
        </div>

        {/* Speech to Text metadata */}
        <div className="flex items-center space-x-2 text-xs text-slate-450">
          <span className="font-mono text-slate-500">LANGUAGE: EN-US</span>
        </div>
      </div>

      {/* Main Body Text Container */}
      <div className="relative rounded-xl bg-slate-950/60 border border-slate-800/60 p-4 min-h-[90px] flex items-start space-x-4">
        {/* AI Avatar circle graphic next to speech to indicate source */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-950 to-slate-900 border border-cyan-800/40 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-cyan-400" />
        </div>
        
        <div className="flex-1 space-y-2">
          <span className="text-[10px] font-bold text-cyan-400 font-mono tracking-widest uppercase block">AI RECRUITER</span>
          <p className="text-slate-200 text-sm sm:text-base leading-relaxed tracking-wide font-medium custom-scrollbar max-h-36 overflow-y-auto">
            {currentQuestion ? `"${currentQuestion}"` : "Waiting for AI..."}
          </p>
        </div>
      </div>
    </div>
  )
}
