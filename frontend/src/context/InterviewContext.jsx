import React, { createContext, useContext, useState, useRef } from "react";
import { useInterviewMedia } from "../hooks/useInterviewMedia";
import { useProctoring } from "../hooks/useProctoring";
import { useAISpeech } from "../hooks/useAISpeech";

const InterviewContext = createContext(null);

export function InterviewProvider({ children }) {
  const videoRef = useRef(null);
  const [candidateInfo, setCandidateInfo] = useState(null);
  
  const media = useInterviewMedia();
  const proctor = useProctoring(media.status);
  const ai = useAISpeech(media.webcamStream);

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
