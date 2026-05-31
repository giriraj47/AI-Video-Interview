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

  const BACKEND_URL =
    process.env.NODE_ENV === "production"
      ? "https://ai-video-interview-1-ca9s.onrender.com"
      : "http://localhost:4000";

  // Helper: Upload a single chunk to Cloudinary
  const uploadChunk = async (
    chunk, chunkNumber, totalChunks, signedData, interviewId) => {
    const formData = new FormData();
    formData.append("file", chunk, `interview-part-${chunkNumber}`);
    formData.append("api_key", signedData.apiKey);
    formData.append("timestamp", signedData.timestamp);
    formData.append("signature", signedData.signature);
    formData.append("public_id", signedData.publicId);
    formData.append("resource_type", "video");
    formData.append("eager", "w_640,h_480,c_limit,f_mp4");
    formData.append("eager_async", "true");
    formData.append("chunk_size", signedData.chunkSize.toString());
    formData.append("total_chunks", totalChunks.toString());
    formData.append("chunk_index", chunkNumber.toString());

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${signedData.cloudName}/video/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error(`Chunk ${chunkNumber} upload failed`);
    }

    return await response.json();
  };

  // Helper: Chunk and upload the full video
  const chunkedSignedUpload = async (videoBlob, signedData, interviewId) => {
    const chunkSize = signedData.chunkSize;
    const totalChunks = Math.ceil(videoBlob.size / chunkSize);
    console.log(`[Media] Starting chunked upload: ${totalChunks} chunks total`);

    for (let i = 1; i <= totalChunks; i++) {
      const start = (i - 1) * chunkSize;
      const end = Math.min(i * chunkSize, videoBlob.size);
      const chunk = videoBlob.slice(start, end);

      console.log(`[Media] Uploading chunk ${i}/${totalChunks}`);
      const result = await uploadChunk(chunk, i, totalChunks, signedData, interviewId);

      // If this is the last chunk, return the final result
      if (i === totalChunks) {
        return result;
      }
    }
  };

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

  // 🛑 Stop recording and return server upload confirmation back to page context lifecycle
  const stopVideoRecordingAndUpload = async (interviewId) => {
    return new Promise((resolve, reject) => {
      if (
        !videoRecorderRef.current ||
        videoRecorderRef.current.state === "inactive"
      ) {
        console.warn("[Media] Cannot stop recording: Recorder is not active.");
        return resolve(null);
      }

      videoRecorderRef.current.onstop = async () => {
        console.log("[Media] Building final video blob...");
        const videoBlob = new Blob(videoChunksRef.current, {
          type: "video/webm",
        });
        console.log(`[Media] Final video size: ${(videoBlob.size / (1024 * 1024)).toFixed(2)} MB`);

        try {
          // First try signed CHUNKED upload to Cloudinary (way more reliable for large files
          const signedUrlResponse = await fetch(
            `${BACKEND_URL}/api/signed-upload-url?interviewId=${interviewId}`
          );

          if (signedUrlResponse.ok) {
            const signedData = await signedUrlResponse.json();
            console.log("[Media] Using signed chunked upload to Cloudinary...");
            try {
              const cloudinaryData = await chunkedSignedUpload(videoBlob, signedData, interviewId);
              console.log("[Media] Signed chunked upload complete!");
              resolve({
                success: true,
                videoUrl: cloudinaryData.secure_url,
                message: "Video uploaded successfully"
              });
              return;
            } catch (uploadErr) {
              console.warn("[Media] Chunked upload failed, falling back to backend upload:", uploadErr);
            }
          }
        } catch (signedErr) {
          console.warn(
            "[Media] Signed upload attempt failed, falling back to backend upload:",
            signedErr
          );
        }

        // Fallback to backend upload (Inngest will handle it reliably!)
        try {
          console.log("[Media] Using fallback backend upload...");
          const formData = new FormData();
          formData.append("video", videoBlob, "interview.webm");
          formData.append("interviewId", interviewId);

          const response = await fetch(`${BACKEND_URL}/api/upload-recording`, {
            method: "POST",
            body: formData,
          });
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
