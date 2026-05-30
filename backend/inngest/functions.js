import { inngest } from "./client.js";
import { Interview } from "../models/Interview.js";
import { groqService } from "../services/groqService.js";

export const processInterviewFinalization = inngest.createFunction(
  // Argument 1: Updated configuration signature mapping to your installed SDK version
  {
    id: "process-interview-finalization",
    triggers: [{ event: "interview/finalized" }],
  },
  // Argument 2: Your async handler function stays exactly the same
  async ({ event, step }) => {
    const { interviewId, videoUrl } = event.data;

    console.log(
      `[Inngest Worker] Received finalization task for ID: ${interviewId}`,
    );

    // 1. ⏱️ Sleep period to ensure MongoDB clusters finish writing/indexing
    await step.sleep("wait-for-db-sync", "3s");

    // 2. Run the heavy Groq LLM synthesis step
    const evaluation = await step.run(
      "evaluate-transcript-via-groq",
      async () => {
        let session = groqService.sessions[interviewId];

        if (!session) {
          console.log(
            `[Inngest Worker] Fetching document ${interviewId} from MongoDB...`,
          );
          const interviewDb = await Interview.findById(interviewId);

          if (!interviewDb) {
            throw new Error(
              `Interview document not found for ID: ${interviewId}`,
            );
          }

          console.log(
            `[Inngest Worker] Hydrating memory session context for: ${interviewId}`,
          );
          groqService.initSession(interviewId, interviewDb.transcript);
        }

        return await groqService.evaluateInterview(interviewId);
      },
    );

    // 3. Commit compiled results safely to MongoDB
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

    // 4. Perform cleanup
    await step.run("cleanup-session-memory", async () => {
      groqService.cleanupSession(interviewId);
      return { success: true };
    });
  },
);
