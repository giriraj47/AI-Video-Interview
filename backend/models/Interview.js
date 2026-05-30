import mongoose from "mongoose";

const interviewSchema = new mongoose.Schema(
  {
    // Candidate Metadata
    candidateEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },

    // Raw Chat History Ledger
    transcript: [
      {
        role: {
          type: String,
          enum: ["system", "user", "assistant"],
          required: true,
        },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],

    flags: [
      {
        type: { type: String, required: true }, // "TAB_SWITCHED", "WINDOW_DEFOCUSED", "COPY_PASTE", "RIGHT_CLICK", "OUT_OF_FRAME", "MULTIPLE_PEOPLE"
        timestamp: { type: Date, default: Date.now },
        description: { type: String }
      }
    ],

    // Complete AI Evaluation Scorecard
    evaluation: {
      overallScore: { type: Number, min: 0, max: 10 },
      hiringDecision: {
        type: String,
        enum: ["Strong Hire", "Hire", "No Hire"],
      },
      technicalSkills: [String],
      softSkills: [String],
      summary: String,
    },

    status: {
      type: String,
      enum: ["Setup", "In Progress", "Completed", "Abandoned"],
      default: "Setup",
    },
    videoUrl: {
      type: String,
    },
  },
  { timestamps: true },
);

export const Interview = mongoose.model("Interview", interviewSchema);
