// backend/services/deepgramService.js
import { DeepgramClient } from "@deepgram/sdk";
import dotenv from "dotenv";

dotenv.config();

export class DeepgramService {
  constructor() {
    this.deepgram = new DeepgramClient(process.env.DEEPGRAM_API_KEY);
  }

  // Transcribe a complete audio buffer (REST API)
  // backend/services/deepgramService.js

  async transcribeAudio(audioBuffer, mimetype = "audio/webm") {
    try {
      const response = await this.deepgram.listen.v1.media.transcribeFile(
        audioBuffer,
        {
          model: "nova-3",
          smart_format: true,
          mimetype: mimetype,
        },
      );

      console.log(
        `[Deepgram STT Response]:`,
        JSON.stringify(response, null, 2),
      );

      const transcript =
        response.results?.channels[0]?.alternatives[0]?.transcript || "";
      return transcript;
    } catch (error) {
      console.error("[DeepgramService] Error in transcription:", error);
      throw error;
    }
  }

  // Generate speech from text (REST API)
  async generateSpeech(text) {
    try {
      const response = await this.deepgram.speak.v1.audio.generate(
        { text },
        {
          model: "aura-asteria-en",
          encoding: "linear16",
          container: "wav",
        },
      );

      // 🔥 FIX: Deepgram SDK v5 uses .stream(), not .getStream()
      const stream = response.stream();

      if (!stream) {
        throw new Error("Failed to retrieve an audio stream from Deepgram");
      }

      // We can securely await the stream to Buffer conversion below
      const buffer = await this.streamToBuffer(stream);
      return buffer;
    } catch (error) {
      console.error("[DeepgramService] Error in TTS:", error);
      throw error;
    }
  }

  // Helper to convert ReadableStream/AsyncIterable to Buffer cleanly
  async streamToBuffer(stream) {
    const chunks = [];

    // Node.js v24 supports async iterators naturally on streams
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  }
}
