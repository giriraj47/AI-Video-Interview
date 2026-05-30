import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AIInterviewer from "../components/AIInterviewer";
import CandidateStream from "../components/CandidateStream";
import TranscriptionPanel from "../components/TranscriptionPanel";
import { useInterview } from "../context/InterviewContext";
import { BACKEND_URL } from "../config";

export default function InterviewPage() {
  const { videoRef, media, proctor, ai, candidateInfo, setCandidateInfo } = useInterview();
  const [countdown, setCountdown] = useState(3);
  const [interviewState, setInterviewState] = useState(media.status === "ready" ? "countdown" : "media-setup");
  const navigate = useNavigate();

  // If there's no candidate profile, redirect them back to setup
  useEffect(() => {
    if (!candidateInfo && !ai.isInterviewCompleted) {
      console.warn("[InterviewPage] Candidate info is missing, redirecting to /setup");
      navigate("/setup");
    }
  }, [candidateInfo, ai.isInterviewCompleted, navigate]);

  useEffect(() => {
    if (interviewState === "media-setup" && media.status === "ready") {
      setInterviewState("countdown");
    }
  }, [media.status, interviewState]);

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

  // Trigger interview start and video recording
  useEffect(() => {
    if (interviewState === "interview" && candidateInfo?.interviewId) {
      ai.startInterview(candidateInfo.interviewId);
      media.startVideoRecording(media.webcamStream);
    }
  }, [interviewState, candidateInfo, media, ai]);

  // Watch for interview completion
  useEffect(() => {
    const saveInterview = async () => {
      console.log("[InterviewPage] Interview complete, wrapping up...");
      try {
        console.log("[InterviewPage] Stopping video recording and uploading...");
        await media.stopVideoRecordingAndUpload(candidateInfo.interviewId);
      } catch (uploadError) {
        console.error("[InterviewPage] Failed to upload video recording:", uploadError);
      }

      try {
        console.log("[InterviewPage] Saving interview...");
        const response = await fetch(`${BACKEND_URL}/api/save-interview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            interviewId: candidateInfo.interviewId
          })
        });
        if (!response.ok) {
          console.error("Failed to save interview", await response.text());
        }
      } catch (error) {
        console.error("Error saving interview:", error);
      }
      
      console.log("[InterviewPage] Interview complete, navigating to /result");
      ai.resetSpeech();
      media.handleConfirmExit();
      setCandidateInfo(null);
      navigate("/result");
    };

    if (ai.isInterviewCompleted && interviewState === "interview" && candidateInfo?.interviewId) {
      saveInterview();
    }
  }, [ai.isInterviewCompleted, interviewState, navigate, candidateInfo, setCandidateInfo, media, ai]);

  return (
    <div className="flex-1 flex flex-col justify-center w-full">
      {/* CONNECTION LOST WARNING TOAST */}
      {ai.isDisconnected && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 animate-pulse">
          <div className="bg-amber-950/90 border border-amber-500/40 rounded-xl p-4 shadow-2xl backdrop-blur-md flex items-start space-x-3">
            <div className="flex-1 text-center">
              <h5 className="text-sm font-bold text-amber-200 uppercase tracking-wide">
                ⚠️ Connection Lost
              </h5>
              <p className="text-xs text-slate-300 mt-1">
                Reconnecting to server... Please wait.
              </p>
            </div>
          </div>
        </div>
      )}

      {interviewState === "media-setup" && (
        <div className="w-full max-w-2xl mx-auto py-12">
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
      )}

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
