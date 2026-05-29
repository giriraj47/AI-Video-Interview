import { GroqService } from "../services/groqService.js";
import { DeepgramService } from "../services/deepgramService.js";

const groqService = new GroqService();
const deepgramService = new DeepgramService();

export const setupInterviewSocket = (socket) => {
  // 1. Client starts interview
  socket.on("start_interview", async () => {
    try {
      groqService.initSession(socket.id);
      console.log(`[Interview] Session started for ${socket.id}`);
      
      // Generate the first greeting/question
      const aiDecision = await groqService.generateNextResponse(socket.id, null);
      
      // Convert text to speech
      const audioBuffer = await deepgramService.generateSpeech(aiDecision.spoken_response);
      
      // Send back to client
      socket.emit("ai_response", {
        text: aiDecision.spoken_response,
        audioBuffer: audioBuffer.toString("base64"), // Send as base64
        isComplete: aiDecision.is_interview_complete
      });
      
    } catch (error) {
      console.error("[Interview] Error starting interview:", error);
      socket.emit("interview_error", { message: "Failed to start interview" });
    }
  });

  // 2. Client submits audio answer
  socket.on("submit_audio", async (data) => {
    try {
      console.log(`[Interview] Received audio from ${socket.id}`);
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
          isComplete: false
        });
        return;
      }

      // B. Groq AI Brain
      console.log(`[Interview] Sending transcript to Groq AI Brain...`);
      const aiDecision = await groqService.generateNextResponse(socket.id, transcript);
      console.log(`[Interview] Groq AI Decision received:`, JSON.stringify(aiDecision, null, 2));

      // C. Text to Speech
      console.log(`[Interview] Sending AI response to Deepgram TTS...`);
      const responseAudioBuffer = await deepgramService.generateSpeech(aiDecision.spoken_response);
      
      // D. Send response back
      socket.emit("ai_response", {
        text: aiDecision.spoken_response,
        audioBuffer: responseAudioBuffer.toString("base64"),
        isComplete: aiDecision.is_interview_complete
      });

    } catch (error) {
      console.error("[Interview] Error processing audio submission:", error);
      socket.emit("interview_error", { message: "Failed to process audio" });
    }
  });

  socket.on("disconnect", () => {
    groqService.cleanupSession(socket.id);
  });
};
