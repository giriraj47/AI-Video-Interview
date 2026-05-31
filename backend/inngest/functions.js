import { inngest } from "./client.js";
import { Interview } from "../models/Interview.js";
import { groqService } from "../services/groqService.js";
import { v2 as cloudinary } from "cloudinary";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import fs from "fs";
import path from "path";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const processInterviewFinalization = inngest.createFunction(
  {
    id: "process-interview-finalization",
    triggers: [{ event: "interview/finalized" }],
  },
  async ({ event, step }) => {
    const { interviewId, videoUrl } = event.data;

    console.log(
      `[Inngest Worker] Received finalization task for ID: ${interviewId}`,
    );

    await step.sleep("wait-for-db-sync", "3s");

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

    await step.run("cleanup-session-memory", async () => {
      groqService.cleanupSession(interviewId);
      return { success: true };
    });
  },
);

export const processVideoUpload = inngest.createFunction(
  {
    id: "process-video-upload",
    retries: {
      attempts: 3,
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

    console.log(
      `[Inngest Worker] Starting video processing for interview: ${interviewId}`,
    );

    let optimizedPath = null;

    try {
      // Step 1: Optimize video with FFmpeg
      optimizedPath = await step.run("optimize-video-with-ffmpeg", async () => {
        return new Promise((resolve, reject) => {
          const outputPath = path.join(
            path.dirname(inputPath),
            `${interviewId}_optimized_${Date.now()}.mp4`,
          );

          console.log(
            `[Inngest Worker] Starting FFmpeg optimization for: ${originalFilename}`,
          );

          ffmpeg(inputPath)
            .output(outputPath)
            .videoCodec("libx264")
            .audioCodec("aac")
            .outputOptions([
              "-crf 28",
              "-preset veryfast",
              "-movflags +faststart",
            ])
            .on("start", (commandLine) => {
              console.log(`[FFmpeg] Spawned: ${commandLine}`);
            })
            .on("progress", (progress) => {
              if (progress.percent) {
                console.log(
                  `[FFmpeg] Progress: ${Math.round(progress.percent)}%`,
                );
              }
            })
            .on("end", () => {
              console.log(`[FFmpeg] Optimization complete: ${outputPath}`);
              resolve(outputPath);
            })
            .on("error", (err) => {
              console.error(`[FFmpeg] Error: ${err.message}`);
              reject(err);
            })
            .run();
        });
      });

      // Step 2: Upload to Cloudinary
      const uploadResult = await step.run("upload-to-cloudinary", async () => {
        console.log(
          `[Inngest Worker] Uploading to Cloudinary: ${optimizedPath}`,
        );

        return await cloudinary.uploader.upload(optimizedPath, {
          resource_type: "video",
          public_id: `interviews/${interviewId}`,
          overwrite: true,
          tags: ["interview", "ai-recruiter"],
          context: {
            interviewId,
            originalFilename,
            originalSize: fileSize,
            originalMimeType: mimetype,
          },
        });
      });

      // Step 3: Update database with video URL
      await step.run("update-database", async () => {
        console.log(
          `[Inngest Worker] Updating database with video URL for: ${interviewId}`,
        );

        return await Interview.findByIdAndUpdate(
          interviewId,
          {
            videoUrl: uploadResult.secure_url,
          },
          { new: true },
        );
      });

      // Step 4: Cleanup temporary files
      await step.run("cleanup-temporary-files", async () => {
        const filesToDelete = [inputPath, optimizedPath];

        for (const filePath of filesToDelete) {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`[Inngest Worker] Deleted: ${filePath}`);
          }
        }

        return { success: true };
      });

      console.log(
        `[Inngest Worker] Video processing complete for interview: ${interviewId}`,
      );

      return {
        success: true,
        interviewId,
        videoUrl: uploadResult.secure_url,
      };
    } catch (error) {
      console.error(
        `[Inngest Worker] Video processing failed for ${interviewId}:`,
        error,
      );

      // Cleanup on failure
      await step.run("cleanup-on-failure", async () => {
        const filesToDelete = [inputPath];
        if (optimizedPath) filesToDelete.push(optimizedPath);

        for (const filePath of filesToDelete) {
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
              console.log(`[Inngest Worker] Cleaned up: ${filePath}`);
            } catch (cleanupErr) {
              console.error(
                `[Inngest Worker] Failed to clean up ${filePath}:`,
                cleanupErr,
              );
            }
          }
        }

        return { success: true };
      });

      // Re-throw to trigger retries (if remaining)
      throw error;
    }
  },
);
