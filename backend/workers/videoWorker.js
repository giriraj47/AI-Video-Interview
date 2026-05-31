import { Worker } from "bullmq";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { Interview } from "../models/Interview.js";
import redisConnection from "../config/redis.js";

// Cloudinary is assumed to be configured via environment variables automatically
// CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const videoWorker = new Worker(
  "video-upload-queue",
  async (job) => {
    const { interviewId, filePath } = job.data;
    console.log(`[BullMQ Worker] Processing video for interview: ${interviewId}`);

    try {
      // 1. Upload to Cloudinary
      const uploadResult = await cloudinary.uploader.upload(filePath, {
        resource_type: "video",
        public_id: `interviews/${interviewId}`,
        eager: [{ width: 640, height: 480, crop: "limit", format: "mp4" }],
        eager_async: true,
      });

      console.log(`[BullMQ Worker] Upload successful: ${uploadResult.secure_url}`);

      // 2. Update the Database
      await Interview.findByIdAndUpdate(interviewId, {
        videoUrl: uploadResult.secure_url,
      });
      console.log(`[BullMQ Worker] Database updated for interview: ${interviewId}`);

      // 3. Clean up local temp file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      return uploadResult.secure_url;
    } catch (error) {
      console.error(`[BullMQ Worker] Job failed for interview ${interviewId}:`, error);
      throw error; // Will trigger a retry
    }
  },
  {
    connection: redisConnection,
  }
);

videoWorker.on("completed", (job) => {
  console.log(`[BullMQ Worker] Job ${job.id} has completed!`);
});

videoWorker.on("failed", (job, err) => {
  console.log(`[BullMQ Worker] Job ${job.id} has failed with ${err.message}`);
});