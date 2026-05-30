import { useEffect, useRef, useState, useCallback } from "react";
import io from "socket.io-client";
import { BACKEND_URL } from "../config";

/**
 * Manages the Socket.io lifecycle, including connection, disconnection,
 * network online/offline detection, and mid-interview session recovery.
 *
 * @param {React.MutableRefObject<string|null>} interviewIdRef - ref to the active interview ID
 * @param {React.MutableRefObject<boolean>} isInterviewCompletedRef - ref tracking completion state
 * @returns {{ socketRef, isDisconnected }}
 */
export function useSocket(interviewIdRef, isInterviewCompletedRef) {
  const socketRef = useRef(null);
  const [isDisconnected, setIsDisconnected] = useState(!navigator.onLine);

  // Allow consumers to register event handlers that survive re-renders
  const handlersRef = useRef({});

  /** Register a socket event handler (call before the socket connects). */
  const onSocketEvent = useCallback((event, handler) => {
    handlersRef.current[event] = handler;
  }, []);

  useEffect(() => {
    const socket = io(BACKEND_URL);
    socketRef.current = socket;

    // ── Core lifecycle ──
    socket.on("connect", () => {
      console.log("[Socket] Connected to backend.");
      setIsDisconnected(false);

      // Re-register active session on reconnect
      if (interviewIdRef.current && !isInterviewCompletedRef.current) {
        console.log(
          `[Socket] Re-registering active session: ${interviewIdRef.current}`,
        );
        socket.emit("start_interview", {
          interviewId: interviewIdRef.current,
        });
      }
    });

    socket.on("disconnect", (reason) => {
      console.warn("[Socket] Disconnected from backend:", reason);
      setIsDisconnected(true);
    });

    socket.on("connect_error", (error) => {
      console.error("[Socket] Connection error:", error);
      setIsDisconnected(true);
    });

    // ── Forward dynamic handlers ──
    // These are registered by the parent hook (ai_response, transcript_update, etc.)
    const boundHandlers = { ...handlersRef.current };
    Object.entries(boundHandlers).forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    // ── Browser network events ──
    const handleOffline = () => {
      console.warn("[Network] Browser went offline.");
      setIsDisconnected(true);
    };

    const handleOnline = () => {
      console.log(
        "[Network] Browser came back online. Checking socket state...",
      );
      if (socket) {
        if (socket.connected) {
          console.log("[Network] Socket survived the drop. Resuming UI.");
          setIsDisconnected(false);
        } else {
          console.log("[Network] Socket died. Forcing reconnect...");
          socket.connect();
        }
      } else {
        setIsDisconnected(false);
      }
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      Object.entries(boundHandlers).forEach(([event, handler]) => {
        socket.off(event, handler);
      });
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { socketRef, isDisconnected, onSocketEvent };
}
