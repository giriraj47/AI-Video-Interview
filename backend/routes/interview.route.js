import express from "express";
import { Interview } from "../models/Interview.js";
import { groqService } from "../services/groqService.js";

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

// Save/Finalize Interview - Run evaluation and mark as COMPLETE immediately!
router.post("/save-interview", async (req, res) => {
  try {
    const { interviewId } = req.body;

    if (!interviewId) {
      return res
        .status(400)
        .json({ error: "Missing required field: interviewId" });
    }

    console.log(
      `[Background] Starting evaluation for interview: ${interviewId}`,
    );

    // Ensure the in-memory session is available
    let session = groqService.sessions[interviewId];
    if (!session) {
      const interviewDb = await Interview.findById(interviewId);
      if (!interviewDb) {
        console.error(
          `[Background] Interview document not found: ${interviewId}`,
        );
        return res.status(404).json({ error: "Interview not found" });
      }
      console.log(
        `[Background] Hydrating session from database: ${interviewId}`,
      );
      groqService.initSession(interviewId, interviewDb.transcript);
    }

    // Run Groq LLM evaluation
    const evaluation = await groqService.evaluateInterview(interviewId);

    // Save results to MongoDB AND MARK AS COMPLETE immediately!
    console.log(
      `[Background] Saving evaluation to database: ${interviewId}`,
    );
    await Interview.findByIdAndUpdate(interviewId, {
      evaluation,
      status: "Completed", // Mark complete right away!
    });

    // Cleanup in-memory session
    groqService.cleanupSession(interviewId);
    console.log(
      `[Background] ✅ Interview finalization complete: ${interviewId}`,
    );

    res.status(200).json({
      success: true,
      message: "Interview completed successfully!",
      id: interviewId,
    });
  } catch (error) {
    console.error("[API] Error in save-interview route:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to complete interview" });
    }
  }
});

export default router;
