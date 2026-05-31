import { useState, useEffect, useRef, useCallback } from "react";
import { useSocket } from "./useSocket";
import { useVoiceActivity } from "./useVoiceActivity";

/**
 * Top-level interview orchestrator hook.
 * Composes useSocket (network layer) and useVoiceActivity (audio/VAD layer)
 * to manage the full interview lifecycle.
 */
export function useAISpeech(webcamStream) {
  // ── Interview state ──
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(3);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isInterviewCompleted, setIsInterviewCompleted] = useState(false);

  // ── Stable refs ──
  const audioPlaybackRef = useRef(new Audio());
  const webcamStreamRef = useRef(webcamStream);
  const interviewIdRef = useRef(null);
  const isInterviewCompletedRef = useRef(false);
  const startListeningWrapperRef = useRef(null);

  // Keep refs in sync
  useEffect(() => {
    webcamStreamRef.current = webcamStream;
  }, [webcamStream]);

  useEffect(() => {
    isInterviewCompletedRef.current = isInterviewCompleted;
  }, [isInterviewCompleted]);

  // ── Compose sub-hooks ──
  const { socketRef, isDisconnected, onSocketEvent } = useSocket(
    interviewIdRef,
    isInterviewCompletedRef,
  );

  const {
    startListening,
    stopListeningAndSend,
    cleanupVAD,
    destroyAudioContext,
    audioContextRef,
  } = useVoiceActivity(socketRef, setIsUserSpeaking);

  // Wrapped startListening that injects the current webcamStream
  const startListeningWrapper = useCallback(() => {
    if (isDisconnected) {
      console.warn(
        "[useAISpeech] Cannot start listening: socket is disconnected.",
      );
      return;
    }
    startListening(webcamStreamRef.current);
  }, [startListening, isDisconnected]);

  // Keep the ref version in sync (used inside socket event handlers)
  useEffect(() => {
    startListeningWrapperRef.current = startListeningWrapper;
  }, [startListeningWrapper]);

  // ── Register socket event handlers (runs once before socket connects) ──
  useEffect(() => {
    onSocketEvent("ai_response", (data) => {
      // Stop any active recording & VAD before AI speaks
      cleanupVAD();

      setIsAISpeaking(true);
      setCurrentQuestion(data.text);

      if (typeof data.currentQuestionIndex === "number") {
        setCurrentQuestionIndex(data.currentQuestionIndex);
      }
      if (typeof data.totalQuestions === "number") {
        setTotalQuestions(data.totalQuestions);
      }

      if (data.audioBuffer) {
        try {
          const binaryString = atob(data.audioBuffer);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          if (audioPlaybackRef.current.src)
            URL.revokeObjectURL(audioPlaybackRef.current.src);

          const blob = new Blob([bytes.buffer], { type: "audio/wav" });
          const url = URL.createObjectURL(blob);

          audioPlaybackRef.current.src = url;
          audioPlaybackRef.current.onended = () => {
            setIsAISpeaking(false);
            if (data.isComplete) {
              setIsInterviewCompleted(true);
            } else if (startListeningWrapperRef.current) {
              startListeningWrapperRef.current();
            }
          };
          audioPlaybackRef.current.play();
        } catch (e) {
          console.error("Audio playback error", e);
          setIsAISpeaking(false);
          if (startListeningWrapperRef.current) {
            startListeningWrapperRef.current();
          }
        }
      }
    });

    onSocketEvent("transcript_update", (data) => {
      console.log("Deepgram Live Transcript:", data.transcript);
    });

    onSocketEvent("interview_error", (data) => {
      console.error("Backend Socket Error Line:", data.message);
      setIsAISpeaking(false);
      if (startListeningWrapperRef.current) {
        startListeningWrapperRef.current();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── VAD suspension / resumption based on connection status ──
  useEffect(() => {
    if (isDisconnected) {
      console.log(
        "[useAISpeech] Socket disconnected mid-interview. Pausing VAD loop and media recording.",
      );
      cleanupVAD();
    } else {
      // Reconnected — resume listening if we were mid-interview
      if (
        !isAISpeaking &&
        !isInterviewCompleted &&
        currentQuestion &&
        currentQuestion !== "Initializing Interview..."
      ) {
        console.log(
          "[useAISpeech] Socket reconnected. Resuming VAD and recording.",
        );
        startListeningWrapper();
      }
    }
  }, [
    isDisconnected,
    isAISpeaking,
    isInterviewCompleted,
    currentQuestion,
    startListeningWrapper,
    cleanupVAD,
  ]);

  // ── Public actions ──
  const startInterview = useCallback(
    (interviewId) => {
      interviewIdRef.current = interviewId;
      setCurrentQuestionIndex(0);
      setCurrentQuestion("Initializing Interview...");
      setIsInterviewCompleted(false);

      if (!audioContextRef.current) {
        const AudioContextClass =
          window.AudioContext || window.webkitAudioContext;
        audioContextRef.current = new AudioContextClass();
      }
      if (audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume();
      }

      if (socketRef.current) {
        socketRef.current.emit("start_interview", { interviewId });
      }
    },
    [audioContextRef, socketRef],
  );

  const reportViolation = useCallback(
    (type, desc) => {
      if (socketRef.current && socketRef.current.connected) {
        console.log(`[useAISpeech] Reporting violation: ${type} - ${desc}`);
        socketRef.current.emit("proctor_flag", { type, description: desc });
      }
    },
    [socketRef],
  );

  const resetSpeech = useCallback(() => {
    if (audioPlaybackRef.current) {
      try {
        audioPlaybackRef.current.pause();
        audioPlaybackRef.current.src = "";
      } catch (e) {
        console.error("Error pausing audio playback:", e);
      }
    }
    cleanupVAD();
    destroyAudioContext();
    setIsAISpeaking(false);
    setIsUserSpeaking(false);
  }, [cleanupVAD, destroyAudioContext]);

  return {
    currentQuestion,
    currentQuestionIndex,
    totalQuestions,
    isAISpeaking,
    isUserSpeaking,
    isInterviewCompleted,
    startInterview,
    nextQuestion: stopListeningAndSend,
    reportViolation,
    resetSpeech,
    isDisconnected,
    get socketId() {
      return socketRef.current?.id;
    },
  };
}
