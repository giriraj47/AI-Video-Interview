import React from "react";

export default function AdminLoginGate({
  passcodeVal,
  setPasscodeVal,
  handleManualLogin,
  loading,
  error,
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.06)_0%,rgba(15,23,42,1)_100%)] flex items-center justify-center p-4">
      <div className="w-full max-w-md backdrop-blur-xl bg-slate-950/40 border border-slate-800/80 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Subtle top decoration light */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent blur-xs" />

        <div className="flex flex-col items-center text-center space-y-4 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-cyan-950/50 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10 mb-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-8 h-8"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-wide bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Admin Gateway
          </h2>
          <p className="text-slate-400 text-sm max-w-xs">
            This terminal is locked. Please enter your secret query key to
            synchronize database sessions.
          </p>
        </div>

        <form onSubmit={handleManualLogin} className="space-y-6">
          <div>
            <label className="block text-xs font-bold font-mono tracking-widest text-slate-400 uppercase mb-2">
              Secret Passphrase
            </label>
            <input
              type="password"
              value={passcodeVal}
              onChange={(e) => setPasscodeVal(e.target.value)}
              placeholder="Enter passphrase..."
              className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-800 focus:border-cyan-500/80 text-slate-100 placeholder-slate-600 focus:outline-none transition-all duration-300"
            />
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl bg-rose-950/30 border border-rose-500/20 text-rose-400 text-xs font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:scale-[1.02] text-white active:scale-[0.98] transition-all duration-300 shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
          >
            {loading ? "Authenticating..." : "Authorize Terminal"}
          </button>
        </form>
      </div>
    </div>
  );
}
