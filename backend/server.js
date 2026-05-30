import "dotenv/config";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import mongoose from "mongoose";
import { setupInterviewSocket } from "./sockets/interviewHandler.js";
import { Interview } from "./models/Interview.js";
import { groqService } from "./services/groqService.js";

import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import fs from "fs";
import path from "path";

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Create uploads folder
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `recording-${uniqueSuffix}.webm`);
  },
});

const upload = multer({ storage: storage });

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {})
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // allow frontend access
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(`[Socket] New client connected: ${socket.id}`);

  // Set up all interview-related socket events for this connection
  setupInterviewSocket(socket);

  socket.on("disconnect", () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// Start/Resume Interview Route
app.post("/api/start-interview", async (req, res) => {
  try {
    const { email, phoneNumber } = req.body;

    if (!email || !phoneNumber) {
      return res.status(400).json({ error: "Missing email or phone number" });
    }

    // Check if an "In Progress" session already exists for this candidate
    let interview = await Interview.findOne({
      candidateEmail: email.toLowerCase(),
      status: "In Progress"
    });

    if (interview) {
      console.log(`[API] Active interview session found for ${email}. Resuming: ${interview._id}`);
    } else {
      interview = new Interview({
        candidateEmail: email,
        phoneNumber,
        status: "In Progress",
        transcript: []
      });
      await interview.save();
      console.log(`[API] Created new interview session for ${email}: ${interview._id}`);
    }

    res.status(200).json({
      success: true,
      id: interview._id,
      transcript: interview.transcript
    });
  } catch (error) {
    console.error("[API] Error initializing interview:", error);
    res.status(500).json({ error: "Failed to initialize interview" });
  }
});

// Save/Finalize Interview Route
app.post("/api/save-interview", async (req, res) => {
  try {
    const { interviewId } = req.body;

    if (!interviewId) {
      return res.status(400).json({ error: "Missing required field: interviewId" });
    }

    // Check if session exists in memory. If not, reload history from DB and initialize session.
    let session = groqService.sessions[interviewId];
    if (!session) {
      const interviewDb = await Interview.findById(interviewId);
      if (!interviewDb) {
        return res.status(404).json({ error: "Interview record not found" });
      }
      console.log(`[API] Reloading session context from database for evaluation: ${interviewId}`);
      groqService.initSession(interviewId, interviewDb.transcript);
      session = groqService.sessions[interviewId];
    }

    console.log(`[API] Evaluating interview for session ${interviewId}...`);
    const evaluation = await groqService.evaluateInterview(interviewId);

    console.log(`[API] Finalizing interview document in database...`);
    const interview = await Interview.findByIdAndUpdate(
      interviewId,
      {
        evaluation,
        status: "Completed",
      },
      { new: true }
    );

    // Clean up session in memory
    groqService.cleanupSession(interviewId);

    res.status(200).json({
      success: true,
      message: "Interview saved and evaluated successfully",
      id: interview._id,
    });
  } catch (error) {
    console.error("[API] Error saving interview:", error);
    res.status(500).json({ error: "Failed to save interview" });
  }
});

// Middleware to verify admin secret key
const checkAdminSecret = (req, res, next) => {
  const secret = req.headers["x-admin-secret"] || req.query.secret;
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: "Unauthorized access: Invalid secret key" });
  }
  next();
};

// Verify Admin Secret Route
app.get("/api/admin/verify", checkAdminSecret, (req, res) => {
  res.status(200).json({ success: true, message: "Authorized" });
});

// Fetch All Interviews Route
app.get("/api/admin/interviews", checkAdminSecret, async (req, res) => {
  try {
    const interviews = await Interview.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, interviews });
  } catch (error) {
    console.error("[API] Error fetching interviews:", error);
    res.status(500).json({ error: "Failed to fetch interviews" });
  }
});

// Video upload, transcode, and Cloudinary upload endpoint
app.post("/api/upload-recording", upload.single("video"), async (req, res) => {
  const file = req.file;
  const { interviewId } = req.body;

  if (!file) {
    return res.status(400).json({ error: "No video file uploaded" });
  }
  if (!interviewId) {
    if (fs.existsSync(file.path)) {
      try { fs.unlinkSync(file.path); } catch (e) { console.error("Error unlinking file:", e); }
    }
    return res.status(400).json({ error: "Missing interviewId" });
  }

  console.log(`[API] Received video upload for interview ${interviewId}: ${file.path}`);

  const inputPath = file.path;
  const outputPath = path.join(uploadDir, `transcoded-${interviewId}.mp4`);

  try {
    console.log(`[FFmpeg] Starting transcoding: ${inputPath} -> ${outputPath}`);
    
    ffmpeg(inputPath)
      .output(outputPath)
      .toFormat("mp4")
      .videoCodec("libx264")
      .audioCodec("aac")
      .outputOptions([
        "-crf 28",
        "-preset veryfast"
      ])
      .on("start", (commandLine) => {
        console.log(`[FFmpeg] Spawned with command: ${commandLine}`);
      })
      .on("error", async (err) => {
        console.error("[FFmpeg] Transcoding failed:", err);
        if (fs.existsSync(inputPath)) {
          try { fs.unlinkSync(inputPath); } catch (e) {}
        }
        if (fs.existsSync(outputPath)) {
          try { fs.unlinkSync(outputPath); } catch (e) {}
        }
        res.status(500).json({ error: "FFmpeg transcoding failed" });
      })
      .on("end", async () => {
        console.log(`[FFmpeg] Transcoding complete: ${outputPath}`);
        
        try {
          if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
            console.warn("[Cloudinary] Credentials missing. Simulating upload success.");
            const dummyUrl = `https://res.cloudinary.com/dummy-cloud/video/upload/v123456789/interviews/${interviewId}.mp4`;
            
            await Interview.findByIdAndUpdate(interviewId, {
              videoUrl: dummyUrl
            });

            if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

            return res.status(200).json({
              success: true,
              message: "Mock upload success (Cloudinary variables missing)",
              secure_url: dummyUrl
            });
          }

          console.log(`[Cloudinary] Uploading ${outputPath}...`);
          const result = await cloudinary.uploader.upload(outputPath, {
            resource_type: "video",
            folder: "interviews",
            public_id: interviewId,
            overwrite: true,
          });

          console.log(`[Cloudinary] Upload complete: ${result.secure_url}`);

          await Interview.findByIdAndUpdate(interviewId, {
            videoUrl: result.secure_url
          });

          if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
          if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

          res.status(200).json({
            success: true,
            secure_url: result.secure_url,
          });
        } catch (uploadError) {
          console.error("[Cloudinary/DB] Error finishing file handling:", uploadError);
          if (fs.existsSync(inputPath)) {
            try { fs.unlinkSync(inputPath); } catch (e) {}
          }
          if (fs.existsSync(outputPath)) {
            try { fs.unlinkSync(outputPath); } catch (e) {}
          }
          res.status(500).json({ error: "Failed to upload or save video URL" });
        }
      })
      .run();
  } catch (error) {
    console.error("[API] Error in upload-recording endpoint:", error);
    if (fs.existsSync(inputPath)) {
      try { fs.unlinkSync(inputPath); } catch (e) {}
    }
    if (fs.existsSync(outputPath)) {
      try { fs.unlinkSync(outputPath); } catch (e) {}
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 AI Backend running on port ${PORT}`);
});
