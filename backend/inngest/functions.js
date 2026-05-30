import { inngest } from "./client.js";
import { Interview } from "../models/Interview.js";
import { groqService } from "../services/groqService.js";

export const processInterviewFinalization = inngest.createFunction(
  // Argument 1: Configuration containing both the ID and the trigger rule
  {
    id: "process-interview-finalization",
    event: "interview/finalized", // Combined into one object
  },
  // Argument 2: Your actual async handler function
  async ({ event, step }) => {
    const { interviewId, videoUrl } = event.data;

    // 1. Run the heavy Groq LLM synthesis step
    const evaluation = await step.run(
      "evaluate-transcript-via-groq",
      async () => {
        let session = groqService.sessions[interviewId];
        if (!session) {
          const interviewDb = await Interview.findById(interviewId);
          if (!interviewDb) throw new Error("Interview document not found");
          groqService.initSession(interviewId, interviewDb.transcript);
        }
        return await groqService.evaluateInterview(interviewId);
      },
    );

    // 2. Commit compiled results safely to MongoDB
    await step.run("save-to-mongodb", async () => {
      const updateFields = {
        evaluation,
        status: "Completed",
      };
      if (videoUrl) {
        updateFields.videoUrl = videoUrl;
      }
      return await Interview.findByIdAndUpdate(interviewId, updateFields, {
        new: true,
      });
    });

    // 3. Perform cleanup
    await step.run("cleanup-session-memory", async () => {
      groqService.cleanupSession(interviewId);
      return { success: true };
    });
  },
);
