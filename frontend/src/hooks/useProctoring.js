import { useState, useEffect } from "react";

export function useProctoring(status) {
  const [strikeCount, setStrikeCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [latestViolation, setLatestViolation] = useState("");

  useEffect(() => {
    if (status !== "ready") return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setStrikeCount((prev) => prev + 1);
        setLatestViolation("Tab switched or window minimized");
      } else {
        setShowWarning(true);
        const timer = setTimeout(() => setShowWarning(false), 5000);
        return () => clearTimeout(timer);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [status]);

  return { strikeCount, showWarning, latestViolation };
}
