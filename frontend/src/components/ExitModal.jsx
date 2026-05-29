import React from 'react'
import { X, Lock } from 'lucide-react'

export default function ExitModal({ isOpen, onClose, onConfirm }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out_forwards]">
      <div className="w-full max-w-md rounded-2xl glass-panel p-6 relative flex flex-col space-y-6 shadow-2xl border-slate-700/60">
        {/* Exit dialog header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
            <span>Exit Interview Room?</span>
          </h3>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Exit warning content */}
        <div className="text-slate-300 text-sm space-y-2">
          <p>Are you sure you want to end and exit this session?</p>
          <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-xl text-red-400 flex items-start space-x-2.5">
            <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="text-xs">Your responses will be automatically autosaved. Unfinished parts cannot be re-accessed once you finalize your exit.</span>
          </div>
        </div>

        {/* Exit action buttons */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 font-medium text-sm transition duration-200 cursor-pointer"
          >
            Cancel
          </button>
          <button 
            onClick={() => {
              onClose()
              if (onConfirm) onConfirm()
              alert("Session ended. Redirecting...")
            }}
            className="px-4 py-2 rounded-lg text-white bg-red-600 hover:bg-red-500 font-medium text-sm transition duration-200 shadow-md shadow-red-950/50 cursor-pointer"
          >
            Confirm Exit
          </button>
        </div>
      </div>
    </div>
  )
}
