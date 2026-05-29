import "dotenv/config";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import mongoose from "mongoose";
import { setupInterviewSocket } from "./sockets/interviewHandler.js";
import { Interview } from "./models/Interview.js";
import { groqService } from "./services/groqService.js";

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

// Save Interview Route
app.post("/api/save-interview", async (req, res) => {
  try {
    const { socketId, candidateInfo } = req.body;

    if (!socketId || !candidateInfo) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const session = groqService.sessions[socketId];
    if (!session) {
      return res.status(404).json({ error: "Interview session not found" });
    }

    console.log(`[API] Evaluating interview for socket ${socketId}...`);
    const evaluation = await groqService.evaluateInterview(socketId);

    console.log(`[API] Saving interview to database...`);
    const interview = new Interview({
      candidateEmail: candidateInfo.email,
      phoneNumber: candidateInfo.phoneNumber,
      transcript: session.history,
      evaluation,
      status: "Completed",
    });

    await interview.save();

    // Clean up session
    groqService.cleanupSession(socketId);

    res.status(200).json({
      success: true,
      message: "Interview saved successfully",
      id: interview._id,
    });
  } catch (error) {
    console.error("[API] Error saving interview:", error);
    res.status(500).json({ error: "Failed to save interview" });
  }
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 AI Backend running on port ${PORT}`);
});
