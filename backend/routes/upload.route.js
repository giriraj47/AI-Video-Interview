import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import fs from "fs";
import path from "path";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Setup disk storage for temporary processing
const upload = multer({ dest: "uploads/" });

router.post("/upload-recording", upload.single("video"), async (req, res) => {
  const interviewId = req.body.interviewId;
  const inputPath = req.file.path;
  const outputPath = path.join("uploads", `${interviewId}_optimized.mp4`);

  if (!req.file) {
    return res.status(400).json({ error: "No video file provided." });
  }

  console.log(
    `[Backend] Starting FFmpeg processing for interview: ${interviewId}`,
  );

  // 1. Optimize video with FFmpeg before uploading
  ffmpeg(inputPath)
    .output(outputPath)
    .videoCodec("libx264") // Universal codec compatibility
    .audioCodec("aac")
    .outputOptions(["-crf 28", "-preset veryfast"]) // Compresses size while keeping quality clear
    .on("end", async () => {
      console.log(
        "[Backend] FFmpeg processing complete. Uploading to Cloudinary...",
      );

      try {
        // 2. Upload optimized file to Cloudinary
        const uploadResult = await cloudinary.uploader.upload(outputPath, {
          resource_type: "video",
          public_id: `interviews/${interviewId}`,
          overwrite: true,
        });

        // 3. Clean up local files
        fs.unlinkSync(inputPath);
        fs.unlinkSync(outputPath);

        // 4. Update your database record here
        // await InterviewModel.updateOne({ interviewId }, { videoUrl: uploadResult.secure_url });

        return res.json({ success: true, videoUrl: uploadResult.secure_url });
      } catch (uploadError) {
        console.error("Cloudinary upload failed:", uploadError);
        return res
          .status(500)
          .json({ error: "Failed to save asset to Cloudinary." });
      }
    })
    .on("error", (err) => {
      console.error("FFmpeg processing error:", err);
      // Clean up original upload on crash
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      return res.status(500).json({ error: "Video transcoding failed." });
    })
    .run();
});

export default router;
