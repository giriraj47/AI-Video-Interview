import { Redis } from "ioredis";

// Use standard local Redis connection or environment variable
const redisConnection = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
  maxRetriesPerRequest: null,
});

redisConnection.on("error", (err) => {
  console.error("[Redis] Connection error:", err.message);
});

redisConnection.on("connect", () => {
  console.log("[Redis] Connected successfully");
});

export default redisConnection;