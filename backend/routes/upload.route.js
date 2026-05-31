import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { addVideoToQueue } from "../queues/videoQueue.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Ensure temp directory exists
const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

router.post("/upload-video", upload.single("video"), async (req, res) => {
  try {
    const { interviewId } = req.body;
    
    if (!req.file || !interviewId) {
      return res.status(400).json({ error: "Missing video file or interviewId" });
    }

    const filePath = req.file.path;
    
    // Add job to BullMQ
    await addVideoToQueue(interviewId, filePath);

    // Respond immediately so frontend can redirect/close quickly
    return res.status(200).json({ 
      success: true, 
      message: "Video upload queued for processing" 
    });
  } catch (error) {
    console.error("[Upload Route] Error queueing video:", error);
    return res.status(500).json({ error: "Failed to queue video upload" });
  }
});

export default router;