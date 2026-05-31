import express from "express";
import { Interview } from "../models/Interview.js";
import { groqService } from "../services/groqService.js";
import { inngest } from "../inngest/client.js";

const router = express.Router();

// Start/Resume Interview
router.post("/start-interview", async (req, res) => {
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

// Save/Finalize Interview - triggers Inngest evaluation
router.post("/save-interview", async (req, res) => {
  try {
    const { interviewId } = req.body;

    if (!interviewId) {
      return res
        .status(400)
        .json({ error: "Missing required field: interviewId" });
    }

    // Send event to Inngest for durable evaluation
    await inngest.send({
      name: "interview/evaluate",
      data: { interviewId },
    });

    res.status(200).json({
      success: true,
      message: "Interview evaluation queued (check Inngest dashboard for progress)",
      id: interviewId,
    });
  } catch (error) {
    console.error("[API] Error in save-interview route:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to queue interview evaluation" });
    }
  }
});

export default router;
