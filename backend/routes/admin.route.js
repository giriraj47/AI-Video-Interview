import express from "express";
import { Interview } from "../models/Interview.js";
import { checkAdminSecret } from "../middleware/auth.js";

const router = express.Router();

// Verify Admin Secret
router.get("/verify", checkAdminSecret, (req, res) => {
  res.status(200).json({ success: true, message: "Authorized" });
});

// Fetch All Interviews
router.get("/interviews", checkAdminSecret, async (req, res) => {
  try {
    const interviews = await Interview.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, interviews });
  } catch (error) {
    console.error("[API] Error fetching interviews:", error);
    res.status(500).json({ error: "Failed to fetch interviews" });
  }
});

export default router;
