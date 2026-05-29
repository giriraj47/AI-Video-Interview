import { useRef, useState, useEffect } from "react";
import AIInterviewer from "./components/AIInterviewer";
import CandidateStream from "./components/CandidateStream";
import ExitModal from "./components/ExitModal";
import Navbar from "./components/Navbar";
import TranscriptionPanel from "./components/TranscriptionPanel";
import { useInterviewMedia } from "./hooks/useInterviewMedia";
import { useProctoring } from "./hooks/useProctoring";

export function App() {
  const videoRef = useRef(null);

  const [showExitModal, setShowExitModal] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [isAISpeaking, setIsAISpeaking] = useState(true);

  // Consume custom architectural hooks
  const media = useInterviewMedia();
  const proctor = useProctoring(media.status);

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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          <AIInterviewer
            isAISpeaking={isAISpeaking}
            onToggleSpeech={() => setIsAISpeaking(!isAISpeaking)}
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

        <TranscriptionPanel
          status={media.status}
          errorMessage={media.errorMessage}
          initInterviewMedia={media.initInterviewMedia}
        />
      </main>

      <ExitModal
        isOpen={showExitModal}
        onClose={() => setShowExitModal(false)}
        onConfirm={media.handleConfirmExit}
      />
    </div>
  );
}
