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
      if (
        videoRecorderRef.current &&
        videoRecorderRef.current.state !== "inactive"
      ) {
        try {
          videoRecorderRef.current.stop();
        } catch (e) {
          console.error("Error stopping video recorder on unmount:", e);
        }
      }
      if (streamRef.current)
        streamRef.current.getTracks().forEach((t) => t.stop());
      if (screenStreamRef.current)
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startVideoRecording = (stream) => {
    if (!stream) {
      console.warn("[MediaRecorder] startVideoRecording: no stream provided.");
      return;
    }
    videoChunksRef.current = [];
    try {
      let options = { mimeType: "video/webm;codecs=vp9,opus" };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: "video/webm" };
      }

      console.log(`[MediaRecorder] Starting video recording with options:`, options);
      const recorder = new MediaRecorder(stream, options);
      videoRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          console.log(`[MediaRecorder] Video chunk captured: ${(event.data.size / 1024).toFixed(2)} KB`);
          videoChunksRef.current.push(event.data);
        }
      };

      recorder.start(5000);
    } catch (err) {
      console.error("[MediaRecorder] Failed to start video recording:", err);
    }
  };

  const stopVideoRecordingAndUpload = async (interviewId) => {
    return new Promise((resolve, reject) => {
      if (!videoRecorderRef.current || videoRecorderRef.current.state === "inactive") {
        console.warn("[MediaRecorder] No active video recorder found to stop.");
        resolve({ success: false, error: "No active video recorder" });
        return;
      }

      console.log("[MediaRecorder] Stopping video recorder...");
      
      videoRecorderRef.current.onstop = async () => {
        try {
          console.log(`[MediaRecorder] Stopped. Compiling ${videoChunksRef.current.length} chunks...`);
          const videoBlob = new Blob(videoChunksRef.current, { type: "video/webm" });
          
          console.log(`[MediaRecorder] Video Blob size: ${(videoBlob.size / 1024 / 1024).toFixed(2)} MB`);
          
          const formData = new FormData();
          formData.append("video", videoBlob, "interview-recording.webm");
          formData.append("interviewId", interviewId);

          const { BACKEND_URL } = await import("../config");

          console.log(`[MediaRecorder] Uploading recording to ${BACKEND_URL}/api/upload-recording...`);
          const response = await fetch(`${BACKEND_URL}/api/upload-recording`, {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`Upload failed with status: ${response.statusText}`);
          }

          const data = await response.json();
          console.log("[MediaRecorder] Upload success:", data);
          resolve(data);
        } catch (err) {
          console.error("[MediaRecorder] Error during video upload:", err);
          reject(err);
        }
      };

      videoRecorderRef.current.stop();
    });
  };

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
