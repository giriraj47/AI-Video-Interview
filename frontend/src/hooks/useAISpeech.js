import { useState, useEffect, useRef, useCallback } from "react";
import io from "socket.io-client";

export function useAISpeech(webcamStream) {
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [totalQuestions] = useState(10);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isInterviewCompleted, setIsInterviewCompleted] = useState(false);

  const socketRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Web Audio API refs for conflict-free silence detection
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const vadIntervalRef = useRef(null);

  const audioPlaybackRef = useRef(new Audio());

  const webcamStreamRef = useRef(webcamStream);
  const startListeningRef = useRef(null);

  const stopListeningAndSend = useCallback(() => {
    console.log("[Frontend] stopListeningAndSend() triggered.");

    // Clear the volume monitor loop instantly
    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.requestData();
      mediaRecorderRef.current.stop();
    }
  }, []);

  const startListening = useCallback(() => {
    const stream = webcamStreamRef.current;
    if (!stream) {
      console.warn("[Frontend] No active webcam stream stream found.");
      return;
    }

    console.log("[Frontend] AI turn complete. Listening to candidate track...");

    // 1. Initialize safe, audio-only MediaRecorder
    if (
      !mediaRecorderRef.current ||
      mediaRecorderRef.current.state === "inactive"
    ) {
      audioChunksRef.current = [];
      try {
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length === 0) {
          console.error("[Frontend] Zero audio tracks available in stream!");
          return;
        }
        const audioOnlyStream = new MediaStream(audioTracks);

        const options = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? { mimeType: "audio/webm;codecs=opus" }
          : { mimeType: "audio/webm" };

        mediaRecorderRef.current = new MediaRecorder(audioOnlyStream, options);
        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = () => {
          console.log(
            `[Frontend] Processing ${audioChunksRef.current.length} collected chunks...`,
          );
          if (audioChunksRef.current.length === 0) return;

          const audioBlob = new Blob(audioChunksRef.current, {
            type: mediaRecorderRef.current.mimeType,
          });

          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => {
            const base64Audio = reader.result.split(",")[1];
            console.log(
              "[Frontend] Emitting 'submit_audio' transmission block to backend.",
            );

            socketRef.current.emit("submit_audio", {
              audioBuffer: base64Audio,
              mimetype: mediaRecorderRef.current.mimeType,
            });
            setCurrentQuestionIndex((prev) => prev + 1);
          };
        };

        mediaRecorderRef.current.start(1000);
      } catch (err) {
        console.error("[Frontend] MediaRecorder init crash:", err);
      }
    }

    // 2. Hardware-Safe Decibel VAD Tracker
    try {
      if (!audioContextRef.current) {
        const AudioContextClass =
          window.AudioContext || window.webkitAudioContext;
        const audioContext = new AudioContextClass();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256; // Light footprint for fast execution

        const audioTracks = stream.getAudioTracks();
        const audioOnlyStream = new MediaStream(audioTracks);
        const source = audioContext.createMediaStreamSource(audioOnlyStream);

        source.connect(analyser);
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
      }

      // Resume context if browser flagged it as suspended due to autoplay policy
      if (audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume();
      }

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let silenceStart = Date.now();
      const SILENCE_TIMEOUT = 3000; // 3 seconds floor
      const VOLUME_THRESHOLD = 15; // Base noise filter floor (adjust if mic is hot)

      if (vadIntervalRef.current) clearInterval(vadIntervalRef.current);

      vadIntervalRef.current = setInterval(() => {
        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate the real-time average amplitude
        let totalAmplitude = 0;
        for (let i = 0; i < bufferLength; i++) {
          totalAmplitude += dataArray[i];
        }
        const averageVolume = totalAmplitude / bufferLength;

        if (averageVolume > VOLUME_THRESHOLD) {
          // User is actively answering
          setIsUserSpeaking(true);
          silenceStart = Date.now(); // Continuously push out the window
        } else {
          // Ambient quiet or complete silence
          setIsUserSpeaking(false);
          if (Date.now() - silenceStart > SILENCE_TIMEOUT) {
            console.log(
              `[VAD] ${SILENCE_TIMEOUT / 1000}s silence window cleared. Flushing buffer...`,
            );
            clearInterval(vadIntervalRef.current);
            stopListeningAndSend();
          }
        }
      }, 100); // Sample context levels every 100ms
    } catch (e) {
      console.error("[Frontend] Failed to mount Decibel VAD Analyser Node:", e);
    }
  }, [stopListeningAndSend]);

  useEffect(() => {
    webcamStreamRef.current = webcamStream;
  }, [webcamStream]);

  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  useEffect(() => {
    socketRef.current = io("http://localhost:4000");

    socketRef.current.on("ai_response", (data) => {
      setIsAISpeaking(true);
      setCurrentQuestion(data.text);

      if (data.audioBuffer) {
        try {
          const binaryString = atob(data.audioBuffer);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes.buffer], { type: "audio/wav" });
          const url = URL.createObjectURL(blob);

          audioPlaybackRef.current.src = url;
          audioPlaybackRef.current.onended = () => {
            setIsAISpeaking(false);
            if (data.isComplete) {
              setIsInterviewCompleted(true);
            } else {
              if (startListeningRef.current) {
                startListeningRef.current();
              }
            }
          };
          audioPlaybackRef.current.play();
        } catch (e) {
          console.error("Audio playback error", e);
          setIsAISpeaking(false);
          if (startListeningRef.current) startListeningRef.current();
        }
      }
    });

    socketRef.current.on("transcript_update", (data) => {
      console.log("Deepgram Live Transcript:", data.transcript);
    });

    socketRef.current.on("interview_error", (data) => {
      console.error("Backend Socket Error Line:", data.message);
      setIsAISpeaking(false);
      if (startListeningRef.current) startListeningRef.current();
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (audioPlaybackRef.current) audioPlaybackRef.current.pause();
      if (vadIntervalRef.current) clearInterval(vadIntervalRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const startInterview = useCallback(() => {
    setCurrentQuestionIndex(0);
    setCurrentQuestion("Initializing Interview...");
    setIsInterviewCompleted(false);
    if (socketRef.current) {
      socketRef.current.emit("start_interview");
    }
  }, []);

  return {
    currentQuestion,
    currentQuestionIndex,
    totalQuestions,
    isAISpeaking,
    isUserSpeaking,
    isInterviewCompleted,
    startInterview,
    nextQuestion: stopListeningAndSend,
    get socketId() { return socketRef.current?.id; }
  };
}
