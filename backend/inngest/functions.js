import { inngest } from "./client.js";
import { Interview } from "../models/Interview.js";
import { groqService } from "../services/groqService.js";

export const processInterviewFinalization = inngest.createFunction(
  {
    id: "process-interview-finalization",
    // 💡 If it fails, retry up to 3 times automatically with exponential backoff
    retries: 3,
  },
  { event: "interview/finalized" },
  async ({ event, step }) => {
    const { interviewId, videoUrl } = event.data;

    console.log(
      `[Inngest Worker] Received finalization task for ID: ${interviewId}`,
    );

    // 1. ⏱️ Add a small sleep period to ensure MongoDB clusters have written/indexed the document
    await step.sleep("wait-for-db-sync", "3s");

    // 2. Run the heavy Groq LLM synthesis step
    const evaluation = await step.run(
      "evaluate-transcript-via-groq",
      async () => {
        let session = groqService.sessions[interviewId];

        if (!session) {
          console.log(
            `[Inngest Worker] Session memory not active. Fetching document ${interviewId} from MongoDB...`,
          );
          const interviewDb = await Interview.findById(interviewId);

          if (!interviewDb) {
            throw new Error(
              `Interview document not found for ID: ${interviewId}. Database write might be lagging.`,
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

      const updatedDoc = await Interview.findByIdAndUpdate(
        interviewId,
        updateFields,
        { new: true },
      );
      if (!updatedDoc) {
        throw new Error(
          `Failed to update interview document. Document with ID ${interviewId} went missing during save step.`,
        );
      }
      return updatedDoc;
    });

    // 4. Perform cleanup
    await step.run("cleanup-session-memory", async () => {
      groqService.cleanupSession(interviewId);
      return { success: true };
    });
  },
);
