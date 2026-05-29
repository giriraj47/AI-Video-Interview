import { useState, useEffect, useRef } from "react";
import { useInterviewMedia } from "./hooks/useInterviewMedia";
import { useProctoring } from "./hooks/useProctoring";
import Navbar from "./components/Navbar";
import AIInterviewer from "./components/AIInterviewer";
import CandidateStream from "./components/CandidateStream";
import TranscriptionPanel from "./components/TranscriptionPanel";
import ExitModal from "./components/ExitModal";
import { useAISpeech } from "./hooks/useAISpeech";

function App() {
  const videoRef = useRef(null);

  const [showExitModal, setShowExitModal] = useState(false);
  const [currentTime, setCurrentTime] = useState("");

  // New States for Flow Control
  const [interviewState, setInterviewState] = useState("setup"); // 'setup' | 'countdown' | 'interview'
  const [countdown, setCountdown] = useState(3);

  // Consume custom architectural hooks
  const media = useInterviewMedia();
  const proctor = useProctoring(media.status);
  const ai = useAISpeech(media.webcamStream);

  // Live clock effect
  useEffect(() => {
    const updateTime = () => {
      const date = new Date();
      let hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      setCurrentTime(`${hours}:${minutes} ${ampm}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 60000);
    return () => clearInterval(timer);
  }, []);

  // Countdown effect
  useEffect(() => {
    if (interviewState === "countdown") {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        setInterviewState("interview");
      }
    }
  }, [interviewState, countdown]);

  // Trigger interview start
  useEffect(() => {
    if (interviewState === "interview") {
      ai.startInterview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewState]);

  // Watch for interview completion
  useEffect(() => {
    if (ai.isInterviewCompleted && interviewState === "interview") {
      setInterviewState("results");
      media.handleConfirmExit();
    }
  }, [ai.isInterviewCompleted, interviewState, media]);

  const handleCandidateAnswer = async (candidateTranscript) => {
    const newHistory = [
      ...conversationHistory,
      { role: "user", content: candidateTranscript },
    ];
    setConversationHistory(newHistory);

    const response = await fetch("http://localhost:5000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobDescription: "Frontend Developer",
        conversationHistory: newHistory,
        mainQuestionCount: currentMainQuestion,
        hadFollowUpForCurrent: hasAskedFollowUp,
      }),
    });

    const aiData = await response.json();
    // aiData looks like: { spoken_response: "...", is_follow_up: true, is_interview_complete: false }

    // Update your counters perfectly based on the AI's internal decision
    if (aiData.is_follow_up) {
      setHasAskedFollowUp(true);
    } else {
      // If it's not a follow-up, it must be a new main question
      setCurrentMainQuestion((prev) => prev + 1);
      setHasAskedFollowUp(false); // Reset follow-up tracker for the new question
    }

    if (aiData.is_interview_complete) {
      endInterview();
    } else {
      setConversationHistory((prev) => [
        ...prev,
        { role: "assistant", content: aiData.spoken_response },
      ]);
      speak(aiData.spoken_response);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col antialiased">
      {/* FLOATING PROCTORING WARNING TOAST */}
      {proctor.showWarning && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
          <div className="bg-red-950/90 border border-red-500/40 rounded-xl p-4 shadow-2xl backdrop-blur-md flex items-start space-x-3">
            <div className="flex-1">
              <h5 className="text-sm font-bold text-red-200 uppercase tracking-wide">
                Proctoring Violation
              </h5>
              <p className="text-xs text-slate-300 mt-1">
                {proctor.latestViolation}
              </p>
              <span className="text-[10px] text-red-400 font-mono">
                Strikes: {proctor.strikeCount}
              </span>
            </div>
          </div>
        </div>
      )}

      <Navbar
        currentTime={currentTime}
        onExitClick={() => setShowExitModal(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 flex flex-col space-y-6">
        {interviewState === "setup" && (
          <div className="flex flex-col items-center justify-center space-y-8 flex-1">
            <h1 className="text-3xl font-bold text-white tracking-wide">
              Interview Setup
            </h1>
            <p className="text-slate-400 max-w-md text-center text-sm">
              Please authorize your camera and microphone to ensure a smooth
              interview experience.
            </p>
            <div className="w-full max-w-2xl">
              <CandidateStream
                videoRef={videoRef}
                status={media.status}
                webcamStream={media.webcamStream}
                errorMessage={media.errorMessage}
                initInterviewMedia={media.initInterviewMedia}
                isMicOn={media.isMicOn}
                isCamOn={media.isCamOn}
                onToggleMic={media.handleToggleMic}
                onToggleCam={media.handleToggleCam}
                strikeCount={proctor.strikeCount}
              />
            </div>
            <button
              disabled={media.status !== "ready"}
              onClick={() => setInterviewState("countdown")}
              className={`px-8 py-3 rounded-xl font-bold text-lg tracking-wider uppercase transition-all duration-300 shadow-lg ${media.status === "ready" ? "bg-gradient-to-r from-cyan-500 to-blue-600 hover:scale-[1.03] text-white cursor-pointer shadow-cyan-500/20" : "bg-slate-800 text-slate-500 cursor-not-allowed shadow-none"}`}
            >
              Start Interview
            </button>
          </div>
        )}

        {interviewState === "countdown" && (
          <div className="flex flex-col items-center justify-center flex-1 space-y-4">
            <h2 className="text-2xl text-cyan-400 font-mono tracking-widest uppercase">
              Interview starting in
            </h2>
            <div className="text-9xl font-bold text-white animate-pulse">
              {countdown}
            </div>
          </div>
        )}

        {interviewState === "interview" && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              <AIInterviewer
                isAISpeaking={ai.isAISpeaking}
                currentQuestion={ai.currentQuestion}
                currentQuestionIndex={ai.currentQuestionIndex}
                totalQuestions={ai.totalQuestions}
                onStartInterview={ai.startInterview}
                onNextQuestion={ai.nextQuestion}
              />

              <CandidateStream
                videoRef={videoRef}
                status={media.status}
                webcamStream={media.webcamStream}
                errorMessage={media.errorMessage}
                initInterviewMedia={media.initInterviewMedia}
                isMicOn={media.isMicOn}
                isCamOn={media.isCamOn}
                onToggleMic={media.handleToggleMic}
                onToggleCam={media.handleToggleCam}
                strikeCount={proctor.strikeCount}
              />
            </div>

            <TranscriptionPanel currentQuestion={ai.currentQuestion} />
          </>
        )}

        {interviewState === "results" && (
          <div className="flex flex-col items-center justify-center flex-1 space-y-6 text-center max-w-lg mx-auto py-12">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/5 ">
              <svg
                className="w-10 h-10"
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
            <h1 className="text-3xl font-extrabold text-white tracking-wide">
              Interview Completed
            </h1>
            <p className="text-slate-300 leading-relaxed text-base">
              Your interview is completed. We'll let you know how you performed
              soon.
            </p>
            <div className="pt-4"></div>
          </div>
        )}
      </main>

      <ExitModal
        isOpen={showExitModal}
        onClose={() => setShowExitModal(false)}
        onConfirm={media.handleConfirmExit}
      />
    </div>
  );
}

export default App;
