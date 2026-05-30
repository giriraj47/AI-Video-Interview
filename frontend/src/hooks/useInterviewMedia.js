import { useState, useEffect, useRef } from "react";

export function useInterviewMedia() {
  const [webcamStream, setWebcamStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [status, setStatus] = useState("idle"); // 'idle' | 'requesting' | 'ready' | 'error'
  const [errorMessage, setErrorMessage] = useState("");
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [recordedChunks, setRecordedChunks] = useState([]);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const screenStreamRef = useRef(null);

  // Keep refs up-to-date for safe unmount cleanup
  useEffect(() => {
    streamRef.current = webcamStream;
  }, [webcamStream]);
  useEffect(() => {
    screenStreamRef.current = screenStream;
  }, [screenStream]);

  const startMediaRecording = (stream) => {
    if (!stream) return;
    try {
      let options = { mimeType: "video/webm;codecs=vp9,opus" };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: "video/webm" };
      }

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          const timestamp = new Date().toLocaleTimeString();
          console.log(
            `[MediaRecorder] 📦 Chunk captured! Size: ${(event.data.size / 1024).toFixed(2)} KB at ${timestamp}`,
          );
          setRecordedChunks((prev) => [...prev, event.data]);
        }
      };

      recorder.start(3000);
    } catch (err) {
      console.error("Failed to initialize MediaRecorder:", err);
    }
  };

  const initInterviewMedia = async () => {
    setStatus("requesting");
    setErrorMessage("");
    try {
      const webcam = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
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
      startMediaRecording(webcam);
    } catch (error) {
      console.error("Error during media setup:", error);
      setStatus("error");
      setErrorMessage(
        error.name === "NotAllowedError"
          ? "Permission Denied: Access blocked."
          : error.message,
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
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      try {
        mediaRecorderRef.current.stop();
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

  // Safe global unmount hook
  useEffect(() => {
    return () => {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
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
  };
}
