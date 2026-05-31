import { Inngest } from "inngest";

// Initialize the Inngest client to manage event dispatching
export const inngest = new Inngest({
  id: "ai-recruiter-app",
  eventKey: process.env.INNGEST_EVENT_KEY || "dev-key", // Use dev key for local, env key for production
  isDev: process.env.NODE_ENV !== "production", // Enable dev mode locally
});
