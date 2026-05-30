import "dotenv/config";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import mongoose from "mongoose";
import { setupInterviewSocket } from "./sockets/interviewHandler.js";
import { Interview } from "./models/Interview.js";
import { groqService } from "./services/groqService.js";
import uploadRoute from "./routes/upload.route.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api", uploadRoute);

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
      status: "In Progress",
    });

    if (interview) {
      console.log(
        `[API] Active interview session found for ${email}. Resuming: ${interview._id}`,
      );
    } else {
      interview = new Interview({
        candidateEmail: email,
        phoneNumber,
        status: "In Progress",
        transcript: [],
      });
      await interview.save();
      console.log(
        `[API] Created new interview session for ${email}: ${interview._id}`,
      );
    }

    res.status(200).json({
      success: true,
      id: interview._id,
      transcript: interview.transcript,
    });
  } catch (error) {
    console.error("[API] Error initializing interview:", error);
    res.status(500).json({ error: "Failed to initialize interview" });
  }
});

// Save/Finalize Interview Route
app.post("/api/save-interview", async (req, res) => {
  try {
    const { interviewId, videoUrl } = req.body;

    if (!interviewId) {
      return res
        .status(400)
        .json({ error: "Missing required field: interviewId" });
    }

    // Check if session exists in memory. If not, reload history from DB and initialize session.
    let session = groqService.sessions[interviewId];
    if (!session) {
      const interviewDb = await Interview.findById(interviewId);
      if (!interviewDb) {
        return res.status(404).json({ error: "Interview record not found" });
      }
      console.log(
        `[API] Reloading session context from database for evaluation: ${interviewId}`,
      );
      groqService.initSession(interviewId, interviewDb.transcript);
      session = groqService.sessions[interviewId];
    }

    console.log(`[API] Evaluating interview for session ${interviewId}...`);
    const evaluation = await groqService.evaluateInterview(interviewId);

    console.log(`[API] Finalizing interview document in database...`);
    const updateFields = {
      evaluation,
      status: "Completed",
    };
    if (videoUrl) {
      updateFields.videoUrl = videoUrl;
    }

    const interview = await Interview.findByIdAndUpdate(
      interviewId,
      updateFields,
      { new: true },
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
    return res
      .status(401)
      .json({ error: "Unauthorized access: Invalid secret key" });
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

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 AI Backend running on port ${PORT}`);
});
