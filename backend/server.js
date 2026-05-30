import "dotenv/config";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import mongoose from "mongoose";
import { setupInterviewSocket } from "./sockets/interviewHandler.js";
import uploadRoute from "./routes/upload.route.js";
import interviewRoute from "./routes/interview.route.js";
import adminRoute from "./routes/admin.route.js";
import { serve } from "inngest/express";
import { inngest } from "./src/inngest/client.js";
import { processInterviewFinalization } from "./src/src/inngest/functions.js";

const app = express();
app.use(cors());
app.use(express.json());

// ── Route Mounting ──
app.use("/api", uploadRoute);
app.use("/api", interviewRoute);
app.use("/api/admin", adminRoute);

app.use(
  "/api/inngest",
  serve({
    client: inngest,
    functions: [processInterviewFinalization],
  }),
);

// ── MongoDB ──
mongoose
  .connect(process.env.MONGO_URI, {})
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// ── Socket.io ──
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // allow frontend access
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(`[Socket] New client connected: ${socket.id}`);
  setupInterviewSocket(socket);
});

// ── Start Server ──
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 AI Backend running on port ${PORT}`);
});
