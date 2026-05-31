import { Queue } from "bullmq";
import redisConnection from "../config/redis.js";

// Create a new queue for video processing
export const videoQueue = new Queue("video-upload-queue", {
  connection: redisConnection,
});

export const addVideoToQueue = async (interviewId, filePath) => {
  console.log(`[BullMQ] Adding video upload job for interview: ${interviewId}`);
  await videoQueue.add(
    "upload-cloudinary",
    { interviewId, filePath },
    {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      removeOnComplete: true, // Keep Redis clean
      removeOnFail: false, // Keep failed jobs for debugging
    }
  );
};