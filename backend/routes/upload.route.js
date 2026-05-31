import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Interview } from "../models/Interview.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Setup disk storage with better error handling
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "video/webm",
      "video/mp4",
      "video/quicktime",
      "video/x-msvideo",
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only video files are allowed."));
    }
  },
});

// Background video processing function (replaces Inngest
const processVideoInBackground = async (
  interviewId,
  inputPath,
  originalFilename,
  fileSize,
  mimetype
) => {
  let optimizedPath = null;
  try {
    console.log(
      `[Background] Starting video processing for interview: ${interviewId}`
    );

    // Step 1: Optimize with FFmpeg
    optimizedPath = path.join(
      path.dirname(inputPath),
      `${interviewId}_optimized_${Date.now()}.mp4`
    );

    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .output(optimizedPath)
        .videoCodec("libx264")
        .audioCodec("aac")
        .outputOptions(["-crf 28", "-preset veryfast", "-movflags +faststart"])
        .on("start", (commandLine) => {
          console.log(`[FFmpeg] Spawned: ${commandLine}`);
        })
        .on("progress", (progress) => {
          if (progress.percent) {
            console.log(`[FFmpeg] Progress: ${Math.round(progress.percent)}%`);
          }
        })
        .on("end", () => {
          console.log(`[FFmpeg] Optimization complete: ${optimizedPath}`);
          resolve();
        })
        .on("error", (err) => {
          console.error(`[FFmpeg] Error: ${err.message}`);
          reject(err);
        })
        .run();
    });

    // Step 2: Upload to Cloudinary
    console.log(`[Background] Uploading to Cloudinary: ${optimizedPath}`);
    const uploadResult = await cloudinary.uploader.upload(optimizedPath, {
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

    // Step 3: Update Database
    console.log(
      `[Background] Updating database with video URL for: ${interviewId}`
    );
    await Interview.findByIdAndUpdate(
      interviewId,
      { videoUrl: uploadResult.secure_url },
      { new: true }
    );

    // Step 4: Cleanup
    [inputPath, optimizedPath].forEach((filePath) => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[Background] Deleted: ${filePath}`);
      }
    });

    console.log(
      `[Background] Video processing complete for interview: ${interviewId}`
    );
  } catch (error) {
    console.error(
      `[Background] Video processing failed for ${interviewId}:`, error);
    
    // Cleanup on failure
    [inputPath, optimizedPath].forEach((filePath) => {
      if (filePath && fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`[Background] Cleaned up: ${filePath}`);
        } catch (cleanupErr) {
          console.error(
            `[Background] Failed to clean up ${filePath}:`, cleanupErr);
        }
      }
    });
  }
};

// Endpoint to get Cloudinary signed upload URL (frontend can upload directly)
router.get("/signed-upload-url", (req, res) => {
  const { interviewId } = req.query;
  
  if (!interviewId) {
    return res.status(400).json({ error: "interviewId is required" });
  }

  try {
    const timestamp = Math.round(Date.now() / 1000);
    const params = {
      timestamp,
      public_id: `interviews/${interviewId}`,
      resource_type: "video",
      overwrite: true,
      eager: [
        { width: 640, height: 480, crop: "limit", format: "mp4" },
      ],
      eager_async: true,
    };

    const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET);

    res.json({
      signature,
      timestamp,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      publicId: `interviews/${interviewId}`,
    });
  } catch (error) {
    console.error("Error generating signed URL:", error);
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

// Endpoint to handle backend upload (fallback)
router.post("/upload-recording", upload.single("video"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No video file provided." });
  }

  const interviewId = req.body.interviewId;
  
  if (!interviewId) {
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(400).json({ error: "interviewId is required." });
  }

  const inputPath = req.file.path;
  
  console.log(
    `[Backend] Received video upload for interview: ${interviewId}, size: ${(req.file.size / (1024 * 1024)).toFixed(2)} MB`
  );

  try {
    // Update interview status
    await Interview.findByIdAndUpdate(interviewId, {
      status: "In Progress",
    });

    // Start processing in background
    processVideoInBackground(
      interviewId,
      inputPath,
      req.file.originalname,
      req.file.size,
      req.file.mimetype
    );

    // Return immediately
    return res.json({ 
      success: true, 
      message: "Video upload received, processing in background" 
    });

  } catch (error) {
    console.error("Error initiating video processing:", error);
    
    if (fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
    }
    
    return res.status(500).json({ 
      error: "Failed to initiate video processing" 
    });
  }
});

// Webhook endpoint for Cloudinary notifications
router.post("/cloudinary-webhook", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const body = JSON.parse(req.body.toString());
    
    console.log("[Cloudinary Webhook] Received notification:", body.notification_type);
    
    if (body.notification_type === "upload" || body.notification_type === "eager") {
      const publicId = body.public_id;
      const interviewId = publicId.split("/").pop();
      
      if (interviewId && body.secure_url) {
        await Interview.findByIdAndUpdate(interviewId, {
          videoUrl: body.secure_url,
        });
        
        console.log(
          `[Cloudinary Webhook] Updated video URL for interview: ${interviewId}`
        );
      }
    }
    
    res.status(200).send("OK");
  } catch (error) {
    console.error("[Cloudinary Webhook] Error:", error);
    res.status(500).send("Error processing webhook");
  }
});

export default router;
