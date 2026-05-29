import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AIInterviewer from "../components/AIInterviewer";
import CandidateStream from "../components/CandidateStream";
import TranscriptionPanel from "../components/TranscriptionPanel";
import { useInterview } from "../context/InterviewContext";

export default function InterviewPage() {
  const { videoRef, media, proctor, ai, candidateInfo } = useInterview();
  const [countdown, setCountdown] = useState(3);
  const [interviewState, setInterviewState] = useState("countdown"); // 'countdown' | 'interview'
  const navigate = useNavigate();

  // If there's no candidate profile or media isn't configured, redirect them back to setup
  useEffect(() => {
    if (!candidateInfo) {
      console.warn("[InterviewPage] Candidate info is missing, redirecting to /setup");
      navigate("/setup");
    } else if (media.status !== "ready") {
      console.warn("[InterviewPage] Media is not authorized, redirecting to /setup");
      navigate("/setup");
    }
  }, [candidateInfo, media.status, navigate]);

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
  }, [interviewState]); // eslint-disable-next-line react-hooks/exhaustive-deps

  // Watch for interview completion
  useEffect(() => {
    const saveInterview = async () => {
      try {
        console.log("[InterviewPage] Saving interview...");
        const response = await fetch("http://localhost:4000/api/save-interview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            socketId: ai.socketId,
            candidateInfo
          })
        });
        if (!response.ok) {
          console.error("Failed to save interview", await response.text());
        }
      } catch (error) {
        console.error("Error saving interview:", error);
      }
      
      console.log("[InterviewPage] Interview complete, navigating to /result");
      navigate("/result");
    };

    if (ai.isInterviewCompleted && interviewState === "interview") {
      saveInterview();
    }
  }, [ai.isInterviewCompleted, interviewState, navigate, ai.socketId, candidateInfo]);

  return (
    <div className="flex-1 flex flex-col justify-center">
      {interviewState === "countdown" && (
        <div className="flex flex-col items-center justify-center flex-1 space-y-4 py-20">
          <h2 className="text-2xl text-cyan-400 font-mono tracking-widest uppercase animate-pulse">
            Interview starting in
          </h2>
          <div className="text-9xl font-bold text-white tracking-widest font-mono">
            {countdown}
          </div>
        </div>
      )}

      {interviewState === "interview" && (
        <div className="flex flex-col space-y-6">
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
        </div>
      )}
    </div>
  );
}
