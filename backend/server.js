import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import { setupInterviewSocket } from "./sockets/interviewHandler.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // allow frontend access
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  console.log(`[Socket] New client connected: ${socket.id}`);
  
  // Set up all interview-related socket events for this connection
  setupInterviewSocket(socket);

  socket.on("disconnect", () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 AI Backend running on port ${PORT}`);
});
