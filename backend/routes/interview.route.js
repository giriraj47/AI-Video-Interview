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

    await inngest.send({
      name: "interview/finalized",
      data: {
        interviewId,
        videoUrl,
      },
    });

    // 1. 🚀 INSTANT DISMISSAL: Respond immediately to release frontend thread
    res.status(200).json({
      success: true,
      message:
        "Data payload safely acknowledged. Finalization executing in background pipeline.",
      id: interviewId,
    });

    // 2. 🌀 DECOUPLED ASYNC WORKER: Execute execution tasks down inside a background loop
    (async () => {
      try {
        console.log(
          `[Background AI Worker] Commencing evaluation sequence for context ID: ${interviewId}`,
        );

        // Ensure memory context contains loaded session
        let session = groqService.sessions[interviewId];
        if (!session) {
          const interviewDb = await Interview.findById(interviewId);
          if (!interviewDb) {
            console.error(
              `[Background AI Worker Error] Aborting. Document not found for: ${interviewId}`,
            );
            return;
          }
          console.log(
            `[Background AI Worker] Hydrating active session structure from historical database logs: ${interviewId}`,
          );
          groqService.initSession(interviewId, interviewDb.transcript);
        }

        console.log(
          `[Background AI Worker] Querying LLM synthesis for session ${interviewId}...`,
        );
        const evaluation = await groqService.evaluateInterview(interviewId);

        console.log(
          `[Background DB Worker] Committing completed metrics profile to storage layout...`,
        );
        const updateFields = {
          evaluation,
          status: "Completed",
        };
        if (videoUrl) {
          updateFields.videoUrl = videoUrl;
        }

        await Interview.findByIdAndUpdate(interviewId, updateFields);

        // Clean up instance profile out of state memory allocation
        groqService.cleanupSession(interviewId);
        console.log(
          `[Background Pipeline] Success. Lifecycle tasks fully completed for session: ${interviewId}`,
        );
      } catch (workerError) {
        console.error(
          `[Background Pipeline Error] Critical trace inside async processing worker:`,
          workerError,
        );
      }
    })(); // Self-invoke structural worker block instantly
  } catch (error) {
    console.error(
      "[API] Error handling initialization trigger for save route:",
      error,
    );
    // Safety check fallback to prevent server app crashes if an error happens before headers clear
    if (!res.headersSent) {
      res.status(500).json({
        error: "Failed to allocate pipeline execution initialization handler",
      });
    }
  }
});

export default router;
