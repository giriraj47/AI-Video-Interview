import { inngest } from "./client.js";
import { Interview } from "../models/Interview.js";
import { groqService } from "../services/groqService.js";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Checks if both videoUrl and evaluation exist, then sets status to Completed
 */
const checkAndCompleteInterview = async (interviewId) => {
  const interview = await Interview.findById(interviewId);
  if (!interview) return false;

  if (interview.videoUrl && interview.evaluation && interview.evaluation.overallScore !== undefined) {
    await Interview.findByIdAndUpdate(interviewId, { status: "Completed" });
    console.log(`[Inngest] Marked interview ${interviewId} as Completed (both video and evaluation ready)`);
    return true;
  }
  return false;
};

export const processInterviewEvaluation = inngest.createFunction(
  {
    id: "process-interview-evaluation",
    retries: {
      attempts: 3,
      backoff: {
        type: "exponential",
        factor: 2,
      },
    },
    triggers: [{ event: "interview/evaluate" }],
  },
  async ({ event, step }) => {
    const { interviewId } = event.data;
    console.log(`[Inngest] Starting evaluation for interview: ${interviewId}`);

    const evaluation = await step.run("evaluate-transcript-via-groq", async () => {
      let session = groqService.sessions[interviewId];
      if (!session) {
        console.log(`[Inngest] Hydrating session from DB for: ${interviewId}`);
        const interviewDb = await Interview.findById(interviewId);
        if (!interviewDb) throw new Error(`Interview ${interviewId} not found`);
        groqService.initSession(interviewId, interviewDb.transcript);
      }
      return await groqService.evaluateInterview(interviewId);
    });

    await step.run("save-evaluation-to-mongodb", async () => {
      return await Interview.findByIdAndUpdate(
        interviewId,
        { evaluation },
        { new: true }
      );
    });

    await step.run("check-and-complete-status", async () => {
      return await checkAndCompleteInterview(interviewId);
    });

    await step.run("cleanup-session-memory", async () => {
      groqService.cleanupSession(interviewId);
      return { success: true };
    });

    console.log(`[Inngest] Evaluation complete for interview: ${interviewId}`);
    return { success: true, interviewId, evaluation };
  }
);

export const processVideoUpload = inngest.createFunction(
  {
    id: "process-video-upload",
    retries: {
      attempts: 5, // More retries for video uploads
      backoff: {
        type: "exponential",
        factor: 2,
      },
    },
    triggers: [{ event: "video/process" }],
  },
  async ({ event, step }) => {
    const { interviewId, inputPath, originalFilename, fileSize, mimetype } =
      event.data;
    console.log(`[Inngest] Starting video upload for interview: ${interviewId}`);

    try {
      // Step 1: Upload raw video DIRECTLY to Cloudinary (no FFmpeg, faster!)
      const uploadResult = await step.run("upload-to-cloudinary", async () => {
        console.log(`[Inngest] Uploading ${fileSize / (1024 * 1024)}MB to Cloudinary`);
        return await cloudinary.uploader.upload_large(inputPath, {
          resource_type: "video",
          public_id: `interviews/${interviewId}`,
          overwrite: true,
          tags: ["interview", "ai-recruiter"],
          eager: [{ width: 640, height: 480, crop: "limit", format: "mp4" }],
          eager_async: true,
          context: {
            interviewId,
            originalFilename,
            originalSize: fileSize,
            originalMimeType: mimetype,
          },
          chunk_size: 6000000, // 6MB chunks (Cloudinary recommended)
        });
      });

      // Step 2: Update database with video URL
      await step.run("update-database", async () => {
        console.log(`[Inngest] Saving video URL for: ${interviewId}`);
        return await Interview.findByIdAndUpdate(
          interviewId,
          { videoUrl: uploadResult.secure_url },
          { new: true }
        );
      });

      // Step 3: Check if we can mark as Completed
      await step.run("check-and-complete-status", async () => {
        return await checkAndCompleteInterview(interviewId);
      });

      // Step 4: Cleanup temporary file
      await step.run("cleanup-temporary-file", async () => {
        if (fs.existsSync(inputPath)) {
          fs.unlinkSync(inputPath);
          console.log(`[Inngest] Deleted temp file: ${inputPath}`);
        }
        return { success: true };
      });

      console.log(`[Inngest] Video upload complete for interview: ${interviewId}`);
      return {
        success: true,
        interviewId,
        videoUrl: uploadResult.secure_url,
      };
    } catch (error) {
      console.error(`[Inngest] Video upload failed for ${interviewId}:`, error);

      // Cleanup on failure
      await step.run("cleanup-on-failure", async () => {
        if (fs.existsSync(inputPath)) {
          try {
            fs.unlinkSync(inputPath);
            console.log(`[Inngest] Cleaned up temp file: ${inputPath}`);
          } catch (cleanupErr) {
            console.error(`[Inngest] Failed to clean up:`, cleanupErr);
          }
        }
        return { success: true };
      });

      // Re-throw to trigger retries
      throw error;
    }
  }
);
