import React, { createContext, useContext, useState, useRef, useEffect } from "react";
import { useInterviewMedia } from "../hooks/useInterviewMedia";
import { useProctoring } from "../hooks/useProctoring";
import { useAISpeech } from "../hooks/useAISpeech";

const InterviewContext = createContext(null);

export function InterviewProvider({ children }) {
  const videoRef = useRef(null);
  const [candidateInfo, setCandidateInfoState] = useState(() => {
    const saved = localStorage.getItem("candidateInfo");
    return saved ? JSON.parse(saved) : null;
  });

  const setCandidateInfo = (info) => {
    if (info) {
      localStorage.setItem("candidateInfo", JSON.stringify(info));
    } else {
      localStorage.removeItem("candidateInfo");
    }
    setCandidateInfoState(info);
  };
  
  const media = useInterviewMedia();
  
  // Bridge ref to forward proctor violations to useAISpeech's socket
  const violationRef = useRef(null);
  const proctor = useProctoring(media.status, videoRef, (type, desc) => {
    if (violationRef.current) {
      violationRef.current(type, desc);
    }
  });

  const ai = useAISpeech(media.webcamStream);

  // Bind the reporter ref once useAISpeech exposes reportViolation
  useEffect(() => {
    violationRef.current = ai.reportViolation;
  }, [ai.reportViolation]);

  return (
    <InterviewContext.Provider
      value={{
        videoRef,
        candidateInfo,
        setCandidateInfo,
        media,
        proctor,
        ai,
      }}
    >
      {children}
    </InterviewContext.Provider>
  );
}

export function useInterview() {
  const context = useContext(InterviewContext);
  if (!context) {
    throw new Error("useInterview must be used within an InterviewProvider");
  }
  return context;
}
