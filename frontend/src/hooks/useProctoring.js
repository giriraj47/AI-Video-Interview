import { useState, useEffect, useRef } from "react";

export function useProctoring(status, videoRef, onViolation) {
  const [strikeCount, setStrikeCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [latestViolation, setLatestViolation] = useState("");
  const modelRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  const onViolationRef = useRef(onViolation);

  // Sync callback ref to prevent listener re-registration
  useEffect(() => {
    onViolationRef.current = onViolation;
  }, [onViolation]);

  // Load COCO-SSD model
  useEffect(() => {
    if (status !== "ready") return;

    if (window.cocoSsd) {
      console.log("[Proctor] Loading COCO-SSD object detection model...");
      window.cocoSsd.load()
        .then((loadedModel) => {
          modelRef.current = loadedModel;
          console.log("[Proctor] COCO-SSD model loaded successfully.");
        })
        .catch((err) => {
          console.error("[Proctor] Failed to load COCO-SSD:", err);
        });
    } else {
      console.warn("[Proctor] COCO-SSD scripts not loaded from CDN.");
    }
  }, [status]);

  // Event listeners for browser violations
  useEffect(() => {
    if (status !== "ready") return;

    const triggerViolation = (type, desc) => {
      setStrikeCount((prev) => prev + 1);
      setLatestViolation(desc);
      setShowWarning(true);

      console.warn(`[Proctor Violation] ${type}: ${desc}`);
      if (onViolationRef.current) {
        onViolationRef.current(type, desc);
      }

      // Hide warning notification after 5 seconds
      const timer = setTimeout(() => setShowWarning(false), 5000);
      return timer;
    };

    // 1. Tab Switched (Visibility Change)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerViolation("TAB_SWITCHED", "Candidate switched tabs or minimized the browser.");
      }
    };

    // 2. Window Blur (Defocus)
    const handleWindowBlur = () => {
      triggerViolation("WINDOW_DEFOCUSED", "Candidate navigated away from the interview screen.");
    };

    // 3. Copy & Paste Blockers
    const handleCopy = (e) => {
      e.preventDefault();
      triggerViolation("COPY_PASTE", "Copy action attempted on the page.");
    };

    const handlePaste = (e) => {
      e.preventDefault();
      triggerViolation("COPY_PASTE", "Paste action attempted on the page.");
    };

    // 4. Right-Click Blocker
    const handleContextMenu = (e) => {
      e.preventDefault();
      triggerViolation("RIGHT_CLICK", "Right-click context menu action attempted.");
    };

    // Register browser listeners
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("contextmenu", handleContextMenu);

    // 5. Real-time Video Analysis (cocoSsd Person Counter)
    let consecutiveNoPerson = 0;
    let consecutiveMultiplePeople = 0;

    detectionIntervalRef.current = setInterval(async () => {
      if (modelRef.current && videoRef.current) {
        try {
          const video = videoRef.current;
          if (video.readyState === video.HAVE_ENOUGH_DATA) {
            const predictions = await modelRef.current.detect(video);
            const people = predictions.filter(
              (p) => p.class === "person" && p.score > 0.65
            );

            if (people.length === 0) {
              consecutiveNoPerson++;
              if (consecutiveNoPerson >= 3) { // Trigger after 3 consecutive frames (~6s) to avoid flickers
                triggerViolation("OUT_OF_FRAME", "No face/person detected in the webcam view.");
                consecutiveNoPerson = 0;
              }
            } else {
              consecutiveNoPerson = 0;
            }

            if (people.length > 1) {
              consecutiveMultiplePeople++;
              if (consecutiveMultiplePeople >= 3) {
                triggerViolation(
                  "MULTIPLE_PEOPLE",
                  "Multiple people detected inside the webcam frame."
                );
                consecutiveMultiplePeople = 0;
              }
            } else {
              consecutiveMultiplePeople = 0;
            }
          }
        } catch (err) {
          console.error("[Proctor Video Analytics Error]:", err);
        }
      }
    }, 2000); // Scan every 2 seconds

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("contextmenu", handleContextMenu);
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, [status, videoRef]);

  return { strikeCount, showWarning, latestViolation };
}
