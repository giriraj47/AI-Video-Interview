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

// Save/Finalize Interview
router.post("/save-interview", async (req, res) => {
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

export default router;
