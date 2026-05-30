import { useRef, useCallback } from "react";

/**
 * Handles MediaRecorder creation, Web Audio API analyser setup,
 * and the VAD (Voice Activity Detection) silence-timeout loop.
 *
 * @param {React.MutableRefObject<object|null>} socketRef - ref to the Socket.io instance
 * @param {Function} setIsUserSpeaking - state setter for user speaking indicator
 * @returns {{ startListening, stopListeningAndSend, cleanupVAD, audioContextRef }}
 */
export function useVoiceActivity(socketRef, setIsUserSpeaking) {
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const vadIntervalRef = useRef(null);

  // ── Stop recording + ship audio to backend ──
  const stopListeningAndSend = useCallback(() => {
    console.log("[Frontend] stopListeningAndSend() triggered.");

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

  // ── Start recording + launch VAD loop ──
  const startListening = useCallback(
    (webcamStream) => {
      const stream = webcamStream;
      if (!stream) {
        console.warn("[Frontend] No active webcam stream found.");
        return;
      }

      console.log(
        "[Frontend] AI turn complete. Listening to candidate track...",
      );

      // Extract audio tracks once — shared by MediaRecorder and VAD analyser
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        console.error("[Frontend] Zero audio tracks available in stream!");
        return;
      }
      const audioOnlyStream = new MediaStream(audioTracks);

      // 1. Initialize audio-only MediaRecorder
      if (
        !mediaRecorderRef.current ||
        mediaRecorderRef.current.state === "inactive"
      ) {
        audioChunksRef.current = [];
        try {

          const options = MediaRecorder.isTypeSupported(
            "audio/webm;codecs=opus",
          )
            ? { mimeType: "audio/webm;codecs=opus" }
            : { mimeType: "audio/webm" };

          mediaRecorderRef.current = new MediaRecorder(
            audioOnlyStream,
            options,
          );

          mediaRecorderRef.current.ondataavailable = (event) => {
            if (event.data.size > 0) audioChunksRef.current.push(event.data);
          };

          mediaRecorderRef.current.onstop = async () => {
            console.log(
              `[Frontend] Processing ${audioChunksRef.current.length} collected chunks...`,
            );
            if (audioChunksRef.current.length === 0) return;

            const audioBlob = new Blob(audioChunksRef.current, {
              type: mediaRecorderRef.current.mimeType,
            });

            // Send raw binary via Socket.io (no base64 inflation)
            const rawBuffer = await audioBlob.arrayBuffer();
            console.log(
              "[Frontend] Emitting 'submit_audio' binary transmission to backend.",
            );

            if (socketRef.current && socketRef.current.connected) {
              socketRef.current.emit("submit_audio", {
                audioBuffer: rawBuffer,
                mimetype: mediaRecorderRef.current.mimeType,
              });
            } else {
              console.warn(
                "[useAISpeech] Socket disconnected. Discarding audio chunk.",
              );
            }
          };

          mediaRecorderRef.current.start(1000);
        } catch (err) {
          console.error("[Frontend] MediaRecorder init crash:", err);
        }
      }

      // 2. Hardware-Safe Decibel VAD Tracker
      // AudioContext is created once in useAISpeech.startInterview (on user gesture)
      try {
        if (audioContextRef.current?.state === "suspended") {
          audioContextRef.current.resume();
        }
        if (!analyserRef.current && audioContextRef.current) {
          analyserRef.current = audioContextRef.current.createAnalyser();
          analyserRef.current.fftSize = 256;

          const source =
            audioContextRef.current.createMediaStreamSource(audioOnlyStream);
          source.connect(analyserRef.current);
        }

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        let silenceStart = Date.now();
        const SILENCE_TIMEOUT = 3000;
        const VOLUME_THRESHOLD = 15;

        if (vadIntervalRef.current) clearInterval(vadIntervalRef.current);

        vadIntervalRef.current = setInterval(() => {
          analyserRef.current.getByteFrequencyData(dataArray);

          let totalAmplitude = 0;
          for (let i = 0; i < bufferLength; i++) {
            totalAmplitude += dataArray[i];
          }
          const averageVolume = totalAmplitude / bufferLength;

          if (averageVolume > VOLUME_THRESHOLD) {
            setIsUserSpeaking(true);
            silenceStart = Date.now();
          } else {
            setIsUserSpeaking(false);
            if (Date.now() - silenceStart > SILENCE_TIMEOUT) {
              console.log(
                `[VAD] ${SILENCE_TIMEOUT / 1000}s silence window cleared. Flushing buffer...`,
              );
              clearInterval(vadIntervalRef.current);
              stopListeningAndSend();
            }
          }
        }, 100);
      } catch (e) {
        console.error(
          "[Frontend] Failed to mount Decibel VAD Analyser Node:",
          e,
        );
      }
    },
    [socketRef, stopListeningAndSend, setIsUserSpeaking],
  );

  // ── Tear down VAD + MediaRecorder (used on disconnect & reset) ──
  const cleanupVAD = useCallback(() => {
    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.error("[useVoiceActivity] Error stopping media recorder:", e);
      }
    }
    setIsUserSpeaking(false);
  }, [setIsUserSpeaking]);

  // ── Close AudioContext and release all audio nodes (final cleanup) ──
  const destroyAudioContext = useCallback(() => {
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  return {
    startListening,
    stopListeningAndSend,
    cleanupVAD,
    destroyAudioContext,
    audioContextRef,
  };
}
