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

  const videoRecorderRef = useRef(null);
  const videoChunksRef = useRef([]);

  const startVideoRecording = (stream) => {
    if (!stream) return;

    // 🛑 SAFETY GUARD: If a recorder is already open/running, exit immediately!
    if (
      videoRecorderRef.current &&
      videoRecorderRef.current.state !== "inactive"
    ) {
      console.warn(
        "[Media] Video recorder already running. Aborting duplicate spawn.",
      );
      return;
    }

    videoChunksRef.current = [];

    // 🚀 PERFORMANCE FIX: Use lightweight VP8 instead of heavy VP9
    let options = { mimeType: "video/webm;codecs=vp8,opus" };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options.mimeType = "video/webm"; // Browser default configuration
    }

    try {
      videoRecorderRef.current = new MediaRecorder(stream, options);

      videoRecorderRef.current.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          videoChunksRef.current.push(e.data);
        }
      };

      // Increase timeslice to 10 seconds (10000) to fire the thread less frequently
      videoRecorderRef.current.start(10000);
      console.log(
        "[Media] Full session video recording started safely with lightweight codec.",
      );
    } catch (error) {
      console.error("Failed to spin up MediaRecorder:", error);
    }
  };

  const stopVideoRecordingAndUpload = async (interviewId) => {
    return new Promise((resolve, reject) => {
      if (
        !videoRecorderRef.current ||
        videoRecorderRef.current.state === "inactive"
      ) {
        return resolve(null);
      }

      videoRecorderRef.current.onstop = async () => {
        console.log("[Media] Building final video blob...");
        const videoBlob = new Blob(videoChunksRef.current, {
          type: "video/webm",
        });

        const formData = new FormData();
        formData.append("video", videoBlob, "interview.webm");
        formData.append("interviewId", interviewId);

        try {
          const response = await fetch(
            "http://localhost:4000/api/upload-recording",
            {
              method: "POST",
              body: formData, // Automatically sets multi-part headers
            },
          );
          const data = await response.json();
          resolve(data);
        } catch (err) {
          console.error("Failed to upload video stream to server:", err);
          reject(err);
        }
      };

      videoRecorderRef.current.stop();
    });
  };

  // Make sure to expose these two functions in your hook's return statement!

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
    startVideoRecording,
    stopVideoRecordingAndUpload,
  };
}
