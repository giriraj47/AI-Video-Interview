import { groqService } from "../services/groqService.js";
import { DeepgramService } from "../services/deepgramService.js";
import { Interview } from "../models/Interview.js";

const deepgramService = new DeepgramService();

export const setupInterviewSocket = (socket) => {
  // 1. Client starts interview
  socket.on("start_interview", async ({ interviewId }) => {
    try {
      if (!interviewId) {
        socket.emit("interview_error", { message: "No interviewId provided" });
        return;
      }

      socket.interviewId = interviewId;
      console.log(`[Interview] Session start requested for Interview ID: ${interviewId}`);

      // Fetch current database record
      const interview = await Interview.findById(interviewId);
      if (!interview) {
        socket.emit("interview_error", { message: "Interview session not found in database" });
        return;
      }

      // Check if this is a resumption (has transcript history)
      const hasHistory = interview.transcript && interview.transcript.length > 0;

      if (hasHistory) {
        console.log(`[Interview] Resuming active session for Interview ID: ${interviewId}`);
        groqService.initSession(interviewId, interview.transcript);

        // Find the last question asked by the AI recruiter
        const lastQuestion = interview.transcript
          .slice()
          .reverse()
          .find((msg) => msg.role === "assistant");

        if (lastQuestion) {
          let text = lastQuestion.content;
          try {
            const parsed = JSON.parse(lastQuestion.content);
            text = parsed.spoken_response || lastQuestion.content;
          } catch (e) {
            // content was stored as raw string
          }

          const resumePrompt = `Welcome back. Let's resume from my last question. ${text}`;
          console.log(`[Interview] Resuming with repeated question: "${resumePrompt}"`);

          const audioBuffer = await deepgramService.generateSpeech(resumePrompt);

          const questionCount = groqService.sessions[interviewId]?.questionCount || 1;

          socket.emit("ai_response", {
            text: text, // Send original question text to show on screen
            audioBuffer: audioBuffer.toString("base64"),
            isComplete: false,
            isResume: true,
            currentQuestionIndex: questionCount > 0 ? questionCount - 1 : 0,
            totalQuestions: groqService.maxQuestions,
          });
          return;
        }
      }

      // Start fresh
      groqService.initSession(interviewId);
      console.log(`[Interview] Starting fresh session for Interview ID: ${interviewId}`);

      // Generate the first greeting/question
      const aiDecision = await groqService.generateNextResponse(interviewId, null);

      // Save the greeting to DB immediately
      await Interview.findByIdAndUpdate(interviewId, {
        $push: {
          transcript: {
            role: "assistant",
            content: JSON.stringify(aiDecision),
          },
        },
      });

      // Convert text to speech
      const audioBuffer = await deepgramService.generateSpeech(aiDecision.spoken_response);

      const sessionObj = groqService.sessions[interviewId];
      const questionCount = sessionObj ? sessionObj.questionCount : 1;

      // Send back to client
      socket.emit("ai_response", {
        text: aiDecision.spoken_response,
        audioBuffer: audioBuffer.toString("base64"),
        isComplete: aiDecision.is_interview_complete,
        currentQuestionIndex: questionCount > 0 ? questionCount - 1 : 0,
        totalQuestions: groqService.maxQuestions,
      });

    } catch (error) {
      console.error("[Interview] Error starting interview:", error);
      socket.emit("interview_error", { message: "Failed to start interview" });
    }
  });

  // 2. Client submits audio answer
  socket.on("submit_audio", async (data) => {
    try {
      const interviewId = socket.interviewId;
      if (!interviewId) {
        socket.emit("interview_error", { message: "Interview session context lost" });
        return;
      }

      console.log(`[Interview] Received audio for session: ${interviewId}`);
      const audioBuffer = Buffer.from(data.audioBuffer, "base64");

      // A. Speech to Text
      console.log(`[Interview] Submitting ${audioBuffer.byteLength} bytes of audio to Deepgram STT (Mimetype: ${data.mimetype})...`);
      const transcript = await deepgramService.transcribeAudio(audioBuffer, data.mimetype || "audio/webm");
      console.log(`[Interview] Transcribed (STT Result): "${transcript}"`);

      socket.emit("transcript_update", { transcript });

      if (!transcript.trim()) {
        // If nothing was heard, prompt them again
        console.warn(`[Interview] Empty transcript received. Prompting user to repeat...`);
        const fallbackAudio = await deepgramService.generateSpeech("I didn't quite catch that. Could you repeat?");
        socket.emit("ai_response", {
          text: "I didn't quite catch that. Could you repeat?",
          audioBuffer: fallbackAudio.toString("base64"),
          isComplete: false,
        });
        return;
      }

      // B. Save candidate answer to DB immediately (Real-time logging)
      await Interview.findByIdAndUpdate(interviewId, {
        $push: {
          transcript: {
            role: "user",
            content: transcript,
          },
        },
      });

      // C. Groq AI Brain
      console.log(`[Interview] Sending transcript to Groq AI Brain...`);
      const aiDecision = await groqService.generateNextResponse(interviewId, transcript);
      console.log(`[Interview] Groq AI Decision received:`, JSON.stringify(aiDecision, null, 2));

      // D. Save AI response to DB immediately (Real-time logging)
      await Interview.findByIdAndUpdate(interviewId, {
        $push: {
          transcript: {
            role: "assistant",
            content: JSON.stringify(aiDecision),
          },
        },
      });

      // E. Text to Speech
      console.log(`[Interview] Sending AI response to Deepgram TTS...`);
      const responseAudioBuffer = await deepgramService.generateSpeech(aiDecision.spoken_response);

      const sessionObj = groqService.sessions[interviewId];
      const questionCount = sessionObj ? sessionObj.questionCount : 1;

      // F. Send response back
      socket.emit("ai_response", {
        text: aiDecision.spoken_response,
        audioBuffer: responseAudioBuffer.toString("base64"),
        isComplete: aiDecision.is_interview_complete,
        currentQuestionIndex: questionCount > 0 ? questionCount - 1 : 0,
        totalQuestions: groqService.maxQuestions,
      });

    } catch (error) {
      console.error("[Interview] Error processing audio submission:", error);
      socket.emit("interview_error", { message: "Failed to process audio" });
    }
  });

  socket.on("proctor_flag", async ({ type, description }) => {
    try {
      const interviewId = socket.interviewId;
      if (!interviewId) {
        console.warn(`[Proctor] Flag received but socket has no interviewId.`);
        return;
      }
      console.log(`[Proctor Flag] Saving flag to DB for ${interviewId}: ${type} - ${description}`);
      await Interview.findByIdAndUpdate(interviewId, {
        $push: {
          flags: {
            type,
            description,
            timestamp: new Date()
          }
        }
      });
    } catch (error) {
      console.error("[Proctor] Error saving proctor flag to database:", error);
    }
  });

  socket.on("disconnect", () => {
    if (socket.interviewId) {
      console.log(`[Socket] Client disconnected. Clearing session cache for: ${socket.interviewId}`);
      groqService.cleanupSession(socket.interviewId);
    }
  });
};
