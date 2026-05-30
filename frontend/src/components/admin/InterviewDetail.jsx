import React from "react";
import { formatDateTime, getHiringBadgeStyle } from "./adminUtils";

// ─── Sub-sections ──────────────────────────────────────────────────────────────

function ProfileHeader({ interview }) {
  return (
    <div className="glass-panel p-6 border-slate-900 rounded-3xl flex flex-col md:flex-row justify-between items-stretch gap-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col justify-between space-y-4">
        <div>
          <span className="text-xxs font-mono tracking-widest text-cyan-400 font-bold uppercase">
            Candidate Profile
          </span>
          <h2 className="text-2xl font-extrabold text-white mt-1 select-all">
            {interview.candidateEmail}
          </h2>

          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mt-4 text-xs">
            <span className="text-slate-500">Phone Number:</span>
            <span className="text-slate-300 font-mono font-medium">
              {interview.phoneNumber || "N/A"}
            </span>

            <span className="text-slate-500">Interview Session:</span>
            <span className="text-slate-300 font-mono">
              {formatDateTime(interview.createdAt)}
            </span>

            <span className="text-slate-500">Status:</span>
            <span className="text-emerald-400 font-mono font-bold capitalize">
              {interview.status || "Completed"}
            </span>
            <div className="cursor-pointer">
              <a href={`${interview.videoUrl}`} target="_blank" rel="noreferrer">
                Candidate's camera feed
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-slate-900 pt-6 md:pt-0 md:pl-8">
        {interview.evaluation?.overallScore !== undefined && (
          <div className="flex flex-col items-center text-center">
            <div className="relative flex items-center justify-center">
              <div className="w-24 h-24 rounded-full bg-slate-900 border-2 border-slate-800 flex flex-col items-center justify-center shadow-inner relative">
                <span className="text-3xl font-extrabold text-white leading-none font-mono">
                  {interview.evaluation.overallScore}
                </span>
                <span className="text-[10px] text-slate-500 font-bold mt-1 font-mono uppercase tracking-wider">
                  Score
                </span>
              </div>
            </div>
          </div>
        )}

        {interview.evaluation?.hiringDecision && (
          <div className="flex flex-col justify-center space-y-1.5">
            <span className="text-3xxs font-bold font-mono tracking-widest text-slate-500 uppercase">
              Hiring Recommendation
            </span>
            <span
              className={`text-sm font-extrabold tracking-wider px-3 py-1 rounded-xl border text-center uppercase ${getHiringBadgeStyle(interview.evaluation.hiringDecision)}`}
            >
              {interview.evaluation.hiringDecision}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function FeedbackAndSkills({ interview }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Summary Block */}
      <div className="glass-panel p-6 border-slate-900 rounded-3xl space-y-4">
        <h3 className="text-sm font-bold font-mono tracking-widest text-slate-400 uppercase flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-4 h-4 text-cyan-400"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
            />
          </svg>
          Recruiter Feedback
        </h3>
        <p className="text-slate-300 text-sm leading-relaxed italic font-light bg-slate-900/30 p-4 rounded-xl border border-slate-900/60">
          "
          {interview.evaluation?.summary ||
            "No assessment evaluation summary was populated for this interview."}
          "
        </p>
      </div>

      {/* Skills Block */}
      <div className="glass-panel p-6 border-slate-900 rounded-3xl space-y-4">
        <h3 className="text-sm font-bold font-mono tracking-widest text-slate-400 uppercase flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-4 h-4 text-purple-400"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
            />
          </svg>
          Skill Matrix
        </h3>

        <div>
          <span className="text-[10px] font-bold font-mono tracking-wider text-slate-500 uppercase block mb-2">
            Technical Matrix
          </span>
          <div className="flex flex-wrap gap-1.5">
            {interview.evaluation?.technicalSkills?.length ? (
              interview.evaluation.technicalSkills.map((skill, idx) => (
                <span
                  key={idx}
                  className="text-xxs px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-medium"
                >
                  {skill}
                </span>
              ))
            ) : (
              <span className="text-xxs text-slate-500 italic">
                No skills flagged
              </span>
            )}
          </div>
        </div>

        <div className="pt-2">
          <span className="text-[10px] font-bold font-mono tracking-wider text-slate-500 uppercase block mb-2">
            Soft Capacities
          </span>
          <div className="flex flex-wrap gap-1.5">
            {interview.evaluation?.softSkills?.length ? (
              interview.evaluation.softSkills.map((skill, idx) => (
                <span
                  key={idx}
                  className="text-xxs px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium"
                >
                  {skill}
                </span>
              ))
            ) : (
              <span className="text-xxs text-slate-500 italic">
                No skills flagged
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProctoringFlags({ flags }) {
  return (
    <div className="glass-panel p-6 border-slate-900 rounded-3xl space-y-4">
      <h3 className="text-sm font-bold font-mono tracking-widest text-slate-400 uppercase flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="w-4 h-4 text-rose-500"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          />
        </svg>
        Proctoring &amp; Integrity Flags
      </h3>

      {!flags || flags.length === 0 ? (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/25 text-emerald-400 text-xs animate-fade-in">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
            className="w-5 h-5 flex-shrink-0"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
          <div>
            <span className="font-bold">Clear Integrity Record:</span> No
            suspicious candidate activity, tab switching, copy-pasting, or video
            framing violations were logged for this session.
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="p-3 rounded-2xl bg-rose-950/20 border border-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-2">
            <span className="bg-rose-500/20 border border-rose-500/30 px-2 py-0.5 rounded text-xxs font-mono">
              {flags.length} VIOLATIONS
            </span>
            <span>Potential academic integrity warnings recorded.</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
            {flags.map((flag, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-900/60 border border-slate-900 flex flex-col gap-1.5 hover:border-slate-800 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <span className="text-xxs font-extrabold text-rose-400 font-mono uppercase tracking-wider">
                    {flag.type}
                  </span>
                  <span className="text-3xxs text-slate-500 font-mono">
                    {formatDateTime(flag.timestamp)}
                  </span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed font-light">
                  {flag.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TranscriptLedger({ transcript }) {
  return (
    <div className="glass-panel p-6 border-slate-900 rounded-3xl space-y-6">
      <div className="border-b border-slate-900 pb-4 flex justify-between items-center">
        <h3 className="text-sm font-bold font-mono tracking-widest text-slate-400 uppercase flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-4 h-4 text-emerald-400"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 12.75V12A9.75 9.75 0 0 1 12 2.25h.09A9.75 9.75 0 0 1 22 12v.75m-3 .375a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm-3 0a2.25 2.25 0 1 0-4.5 0 2.25 2.25 0 0 0 4.5 0ZM12 7.875c.621 0 1.125-.504 1.125-1.125V3.375c0-.621-.504-1.125-1.125-1.125h-.09c-.621 0-1.125.504-1.125 1.125v3.375c0 .621.504 1.125 1.125 1.125H12ZM4.5 12.75a3.375 3.375 0 0 0-3.375-3.375H.75m3.75 3.375a1.125 1.125 0 0 1-1.125 1.125h-1.5a3.375 3.375 0 0 0-3.375 3.375v1.5a1.125 1.125 0 0 1-1.125 1.125H12m10.5-3.75a3.375 3.375 0 0 1-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125 1.125h-1.5a3.375 3.375 0 0 0-3.375 3.375v1.5a1.125 1.125 0 0 1-1.125 1.125H12"
            />
          </svg>
          Detailed Transcript Ledger
        </h3>
        <span className="text-xxs text-slate-500 font-mono">
          {transcript?.length || 0} messages audited
        </span>
      </div>

      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
        {transcript?.length === 0 ? (
          <div className="text-center py-8 text-slate-600 text-xs italic">
            Empty transcript ledger.
          </div>
        ) : (
          transcript.map((msg, index) => {
            if (msg.role === "system") {
              if (
                msg.content.includes("complete") ||
                msg.content.includes("answered")
              ) {
                return (
                  <div key={index} className="flex justify-center my-2">
                    <span className="text-3xxs font-bold font-mono tracking-wider bg-slate-900 border border-slate-800 text-slate-500 px-3 py-1 rounded-full uppercase">
                      {msg.content.includes("complete")
                        ? "🏁 System: Interview Concluded"
                        : "📋 System Checkpoint"}
                    </span>
                  </div>
                );
              }
              return null;
            }

            const isUser = msg.role === "user";

            let displayText = msg.content;
            if (!isUser) {
              try {
                const parsed = JSON.parse(msg.content);
                displayText = parsed.spoken_response || msg.content;
              } catch (e) {
                // Fallback to raw text
              }
            }

            return (
              <div
                key={index}
                className={`flex items-start gap-3.5 max-w-[85%] ${
                  isUser ? "ml-auto flex-row-reverse" : "mr-auto"
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-xs ${
                    isUser
                      ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
                      : "bg-slate-900 border border-slate-800 text-cyan-400 font-mono"
                  }`}
                >
                  {isUser ? "C" : "AI"}
                </div>

                {/* Message bubble */}
                <div className="space-y-1">
                  <div
                    className={`px-4 py-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                      isUser
                        ? "bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-tr-none"
                        : "bg-slate-900/90 border border-slate-900 text-slate-200 rounded-tl-none"
                    }`}
                  >
                    {displayText}
                  </div>
                  <span
                    className={`block text-[9px] text-slate-500 font-mono ${isUser ? "text-right" : "text-left"}`}
                  >
                    {msg.timestamp
                      ? new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Live"}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Main Exported Component ───────────────────────────────────────────────────

export default function InterviewDetail({ interview }) {
  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto w-full">
      <ProfileHeader interview={interview} />
      <FeedbackAndSkills interview={interview} />
      <ProctoringFlags flags={interview.flags} />
      <TranscriptLedger transcript={interview.transcript} />
    </div>
  );
}
