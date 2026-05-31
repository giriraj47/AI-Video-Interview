import React, { useEffect } from "react";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  Lock,
  Sparkles,
} from "lucide-react";

export default function CandidateStream({
  status,
  videoRef,
  webcamStream,
  errorMessage,
  initInterviewMedia,
  isMicOn,
  isCamOn,
  onToggleMic,
  onToggleCam,
}) {
  // 3. Add this localized side-effect inside the component
  useEffect(() => {
    if (status === "ready" && videoRef.current && webcamStream) {
      videoRef.current.srcObject = webcamStream;
      videoRef.current
        .play()
        .catch((e) =>
          console.error("Error playing video stream inside child:", e),
        );
    }
  }, [status, webcamStream, videoRef]);
  return (
    <div className="relative rounded-2xl glass-panel p-6 flex flex-col items-center justify-center min-h-[360px] sm:min-h-[420px] border-slate-800/80 transition-all duration-300 overflow-hidden group">
      {/* Live Camera Feed or Permissions Fallbacks */}
      {status === "idle" && (
        <div className="absolute inset-0 bg-[#0a0d16] flex flex-col items-center justify-center p-6 space-y-6">
          {/* Decorative center camera target */}
          <div className="relative w-20 h-20 rounded-full bg-slate-900/60 border border-slate-800 flex items-center justify-center text-slate-500 shadow-inner">
            <Video className="w-8 h-8 animate-pulse text-cyan-400/60" />
            <div className="absolute inset-0 rounded-full border border-dashed border-cyan-500/25 animate-[spin_60s_linear_infinite]" />
          </div>

          <div className="text-center space-y-2 max-w-xs">
            <h4 className="text-base font-bold text-slate-200">
              Start Interview Media
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Grant access to your camera, microphone, and screen share
              proctoring to begin.
            </p>
          </div>

          <button
            onClick={initInterviewMedia}
            className="relative group px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm tracking-wide transition-all duration-300 hover:scale-[1.03] shadow-lg shadow-cyan-500/20 active:scale-[0.98] cursor-pointer"
          >
            <div className="absolute inset-0 rounded-xl bg-cyan-400 blur opacity-25 group-hover:opacity-40 transition-opacity" />
            <span className="relative flex items-center justify-center space-x-2">
              <span>Authorize Media Access</span>
              <Sparkles className="w-4 h-4" />
            </span>
          </button>
        </div>
      )}

      {status === "requesting" && (
        <div className="absolute inset-0 bg-[#0a0d16] flex flex-col items-center justify-center p-6 space-y-4">
          {/* Pulse loading animation */}
          <div className="relative flex items-center justify-center w-16 h-16">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400/20 opacity-75"></span>
            <div className="relative rounded-full bg-slate-900 border border-cyan-500/60 p-4">
              <Monitor className="w-6 h-6 text-cyan-400 animate-pulse" />
            </div>
          </div>
          <div className="text-center space-y-1.5 max-w-xs">
            <span className="text-xs font-bold font-mono tracking-widest text-cyan-400 uppercase">
              Awaiting Authorization
            </span>
            <p className="text-xs text-slate-400 leading-relaxed">
              Please approve camera, microphone, and screen sharing access in
              the browser.
            </p>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 bg-[#160b0e] flex flex-col items-center justify-center p-6 space-y-5">
          <div className="w-14 h-14 rounded-full bg-red-950/40 border border-red-500/30 flex items-center justify-center text-red-400 shadow-inner shadow-red-950/50">
            <Lock className="w-6 h-6 animate-bounce" />
          </div>

          <div className="text-center space-y-2 max-w-xs">
            <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider">
              Verification Blocked
            </h4>
            <p className="text-[11px] text-slate-300 leading-relaxed bg-red-950/20 border border-red-950/50 p-3 rounded-xl max-h-28 overflow-y-auto custom-scrollbar">
              {errorMessage ||
                "Camera, microphone, and screen share access are required."}
            </p>
          </div>

          <button
            onClick={initInterviewMedia}
            className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-xs tracking-wider uppercase transition-all duration-200 active:scale-95 cursor-pointer shadow-md shadow-red-950/40"
          >
            Retry Setup
          </button>
        </div>
      )}

      {status === "ready" && (
        <div className="absolute inset-0 bg-black flex flex-col items-center justify-center">
          {/* Live Video Element */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain scale-x-[-1]"
          />

          {/* High-tech overlay focus frame */}
          <div className="absolute inset-4 border border-dashed border-cyan-500/15 rounded-xl pointer-events-none">
            <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t border-l border-cyan-500/40" />
            <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t border-r border-cyan-500/40" />
            <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b border-l border-cyan-500/40" />
            <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b border-r border-cyan-500/40" />
          </div>

          {/* Floating mini interactive toolbar on top of the live video */}
          <div className="absolute bottom-4 right-4 z-20 flex items-center space-x-2 bg-slate-950/80 border border-slate-800/85 px-2.5 py-1.5 rounded-xl backdrop-blur-md">
            <button
              onClick={onToggleMic}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isMicOn ? "text-slate-300 hover:text-white hover:bg-slate-800" : "text-red-400 hover:bg-red-950/30"}`}
              title={isMicOn ? "Mute Mic" : "Unmute Mic"}
            >
              {isMicOn ? (
                <Mic className="w-4 h-4" />
              ) : (
                <MicOff className="w-4 h-4" />
              )}
            </button>

            <button
              onClick={onToggleCam}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isCamOn ? "text-slate-300 hover:text-white hover:bg-slate-800" : "text-red-400 hover:bg-red-950/30"}`}
              title={isCamOn ? "Stop Camera" : "Start Camera"}
            >
              {isCamOn ? (
                <Video className="w-4 h-4" />
              ) : (
                <VideoOff className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Top-Right Corner: Recording Badge (Always Overlaying) */}
      <div className="absolute top-4 right-4 z-20 flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800/80 backdrop-blur-md">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500 record-pulse-dot"></span>
        </span>
        <span className="text-xs font-bold tracking-widest text-slate-300 font-mono uppercase">
          REC
        </span>
      </div>

      {/* Bottom-Left Corner: Candidate Label */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center space-x-2 px-3 py-1.5 rounded-lg glass-pill">
        <span className="text-xs font-semibold tracking-wide text-slate-200">
          candidate
        </span>
      </div>

      {/* Top-Left Audio feedback indicator (Only overlays if status is ready and mic is on) */}
      {status === "ready" && isMicOn && (
        <div className="absolute top-4 left-4 z-20 flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800/80">
          <Mic className="w-3 h-3 text-cyan-400" />
          <div className="flex items-center space-x-0.5 h-3 px-0.5">
            <div className="w-0.5 h-1.5 bg-cyan-400/80 rounded-full animate-pulse" />
            <div className="w-0.5 h-2 bg-cyan-400/80 rounded-full animate-pulse [animation-delay:0.2s]" />
            <div className="w-0.5 h-1 bg-cyan-400/80 rounded-full animate-pulse [animation-delay:0.4s]" />
          </div>
        </div>
      )}
    </div>
  );
}
