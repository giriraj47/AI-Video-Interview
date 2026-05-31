import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Interview } from "../models/Interview.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Setup disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname),
    );
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

// Background video processing function - NO FFmpeg!
const processVideoInBackground = async (
  interviewId,
  inputPath,
  originalFilename,
  fileSize,
  mimetype,
) => {
  try {
    console.log(
      `[Background] Starting Cloudinary upload for interview: ${interviewId}`,
    );

    // Step 1: Upload raw file directly to Cloudinary (Cloudinary handles optimization)
    console.log(`[Background] Uploading to Cloudinary: ${inputPath}`);
    const uploadResult = await cloudinary.uploader.upload(inputPath, {
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
    });

    // Step 2: Update Database
    console.log(
      `[Background] Updating database with video URL for: ${interviewId}`,
    );

    const currentInterview = await Interview.findById(interviewId);
    const shouldMarkComplete =
      currentInterview &&
      currentInterview.evaluation &&
      currentInterview.evaluation.overallScore !== undefined;

    await Interview.findByIdAndUpdate(
      interviewId,
      {
        videoUrl: uploadResult.secure_url,
        ...(shouldMarkComplete ? { status: "Completed" } : {}),
      },
      { new: true },
    );

    // Step 3: Cleanup
    if (fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
      console.log(`[Background] Deleted temp file: ${inputPath}`);
    }

    console.log(
      `[Background] Video upload complete for interview: ${interviewId}`,
    );
  } catch (error) {
    console.error(
      `[Background] Video upload failed for ${interviewId}:`,
      error,
    );

    // Cleanup on failure
    if (fs.existsSync(inputPath)) {
      try {
        fs.unlinkSync(inputPath);
        console.log(`[Background] Cleaned up temp file: ${inputPath}`);
      } catch (cleanupErr) {
        console.error(
          `[Background] Failed to clean up temp file:`,
          cleanupErr,
        );
      }
    }
  }
};

// Endpoint to get Cloudinary signed upload URL
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
      eager: [{ width: 640, height: 480, crop: "limit", format: "mp4" }],
      eager_async: true,
    };

    const signature = cloudinary.utils.api_sign_request(
      params,
      process.env.CLOUDINARY_API_SECRET,
    );

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
    `[Backend] Received video upload for interview: ${interviewId}, size: ${(req.file.size / (1024 * 1024)).toFixed(2)} MB`,
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
      req.file.mimetype,
    );

    // Return immediately
    return res.json({
      success: true,
      message: "Video upload received, processing in background",
    });
  } catch (error) {
    console.error("Error initiating video processing:", error);

    if (fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
    }

    return res.status(500).json({
      error: "Failed to initiate video processing",
    });
  }
});

// Webhook endpoint for Cloudinary notifications
router.post(
  "/cloudinary-webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const body = JSON.parse(req.body.toString());

      console.log(
        "[Cloudinary Webhook] Received notification:",
        body.notification_type,
      );

      if (
        body.notification_type === "upload" ||
        body.notification_type === "eager"
      ) {
        const publicId = body.public_id;
        const interviewId = publicId.split("/").pop();

        if (interviewId && body.secure_url) {
          const currentInterview = await Interview.findById(interviewId);
          const shouldMarkComplete =
            currentInterview &&
            currentInterview.evaluation &&
            currentInterview.evaluation.overallScore !== undefined;

          await Interview.findByIdAndUpdate(interviewId, {
            videoUrl: body.secure_url,
            ...(shouldMarkComplete ? { status: "Completed" } : {}),
          });

          console.log(
            `[Cloudinary Webhook] Updated video URL for interview: ${interviewId}`,
          );
        }
      }

      res.status(200).send("OK");
    } catch (error) {
      console.error("[Cloudinary Webhook] Error:", error);
      res.status(500).send("Error processing webhook");
    }
  },
);

export default router;
