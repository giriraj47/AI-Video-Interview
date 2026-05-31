import { useState, useEffect, useRef } from "react";

export function useInterviewMedia() {
  const [webcamStream, setWebcamStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [status, setStatus] = useState("idle"); // 'idle' | 'requesting' | 'ready' | 'error'
  const [errorMessage, setErrorMessage] = useState("");
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);

  const streamRef = useRef(null);
  const screenStreamRef = useRef(null);

  // 📦 Maintained mutable references for recording cleanly without React state crashes
  const videoRecorderRef = useRef(null);
  const videoChunksRef = useRef([]);

  // 🚀 Start session recording using clean lightweight configuration
  const startVideoRecording = (stream) => {
    if (!stream) return;

    if (
      videoRecorderRef.current &&
      videoRecorderRef.current.state !== "inactive"
    ) {
      console.warn(
        "[Media] Video recorder already running. Aborting duplicate spawn."
      );
      return;
    }

    videoChunksRef.current = [];

    // Lightweight VP8 instead of heavy VP9 to keep CPU usage minimal
    let options = { mimeType: "video/webm;codecs=vp8,opus" };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options.mimeType = "video/webm";
    }

    try {
      videoRecorderRef.current = new MediaRecorder(stream, options);

      videoRecorderRef.current.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          const timestamp = new Date().toLocaleTimeString();
          console.log(
            `[MediaRecorder] 📦 Chunk captured safely! Size: ${(e.data.size / 1024).toFixed(2)} KB at ${timestamp}`
          );
          videoChunksRef.current.push(e.data);
        }
      };

      // Check chunks every 5 seconds to keep memory buffer light but stable
      videoRecorderRef.current.start(5000);
      console.log(
        "[Media] Full session video recording started safely with lightweight codec."
      );
    } catch (error) {
      console.error("Failed to spin up MediaRecorder:", error);
    }
  };

  // 🛑 Stop recording (NO UPLOAD - we removed Cloudinary!)
  const stopVideoRecordingAndUpload = async (interviewId) => {
    return new Promise((resolve) => {
      if (
        !videoRecorderRef.current ||
        videoRecorderRef.current.state === "inactive"
      ) {
        console.warn("[Media] Cannot stop recording: Recorder is not active.");
        return resolve(null);
      }

      videoRecorderRef.current.onstop = () => {
        console.log("[Media] Recording stopped, skipping Cloudinary upload (disabled for now).");
        resolve({ success: true, message: "Recording stopped successfully" });
      };

      videoRecorderRef.current.stop();
    });
  };

  useEffect(() => {
    streamRef.current = webcamStream;
  }, [webcamStream]);

  useEffect(() => {
    screenStreamRef.current = screenStream;
  }, [screenStream]);

  // 🔌 Initialize streams safely
  const initInterviewMedia = async () => {
    setStatus("requesting");
    setErrorMessage("");
    try {
      const webcam = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
        audio: true,
      });

      const screen = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });

      setScreenStream(screen);
      setWebcamStream(webcam);
      setIsMicOn(true);
      setIsCamOn(true);
      setStatus("ready");

      // 💡 Start the correct recording engine right away!
      startVideoRecording(webcam);
    } catch (error) {
      console.error("Error during media setup:", error);
      setStatus("error");
      setErrorMessage(
        error.name === "NotAllowedError"
          ? "Permission Denied: Access blocked."
          : error.message
      );
    }
  };

  const handleToggleMic = () => {
    if (webcamStream?.getAudioTracks()[0]) {
      webcamStream.getAudioTracks()[0].enabled = !isMicOn;
      setIsMicOn(!isMicOn);
    }
  };

  const handleToggleCam = () => {
    if (webcamStream?.getVideoTracks()[0]) {
      webcamStream.getVideoTracks()[0].enabled = !isCamOn;
      setIsCamOn(!isCamOn);
    }
  };

  const handleConfirmExit = () => {
    if (
      videoRecorderRef.current &&
      videoRecorderRef.current.state !== "inactive"
    ) {
      try {
        videoRecorderRef.current.stop();
      } catch (err) {
        console.error("Error stopping media recorder on exit:", err);
      }
    }
    if (streamRef.current)
      streamRef.current.getTracks().forEach((t) => t.stop());
    if (screenStreamRef.current)
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
    setWebcamStream(null);
    setScreenStream(null);
    setStatus("idle");
  };

  useEffect(() => {
    return () => {
      if (
        videoRecorderRef.current &&
        videoRecorderRef.current.state !== "inactive"
      ) {
        videoRecorderRef.current.stop();
      }
      if (streamRef.current)
        streamRef.current.getTracks().forEach((t) => t.stop());
      if (screenStreamRef.current)
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return {
    webcamStream,
    screenStream,
    status,
    errorMessage,
    isMicOn,
    isCamOn,
    initInterviewMedia,
    handleToggleMic,
    handleToggleCam,
    handleConfirmExit,
    startVideoRecording,
    stopVideoRecordingAndUpload,
  };
}
