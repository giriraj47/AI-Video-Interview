import Groq from "groq-sdk";

class GroqService {
  constructor() {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,

      timeout: 45000,
    });
    this.sessions = {}; // Maps socketId to conversation history
  }

  // Initialize a new interview session
  initSession(socketId) {
    this.sessions[socketId] = {
      questionCount: 0,
      history: [
        {
          role: "system",
          content: `You are an expert AI Technical Recruiter. You are interviewing a candidate for a Full Stack Developer position. 
You must ask exactly 1 questions total.
Always respond with a valid JSON object matching this schema:
{
  "spoken_response": "The text you will say to the candidate",
  "is_follow_up": boolean,
  "is_interview_complete": boolean
}
Keep your questions professional, concise, and conversational. Do not output anything outside of the JSON object.
Your first task is to greet the candidate and ask the first technical question.
But right now its just in testing phase to ask really simple question like what is react no followups.
`,
        },
      ],
    };
  }

  async generateNextResponse(socketId, candidateText = null) {
    const session = this.sessions[socketId];
    if (!session) throw new Error("Session not initialized");

    if (candidateText) {
      session.history.push({ role: "user", content: candidateText });
    }

    if (session.questionCount >= 10 && candidateText) {
      session.history.push({
        role: "system",
        content:
          "The candidate has answered 10 questions. The interview is now complete. Set 'is_interview_complete' to true, and output a closing thank-you message in 'spoken_response'.",
      });
    }

    try {
      const completion = await this.groq.chat.completions.create({
        messages: session.history,
        model: "llama-3.3-70b-versatile",
        temperature: 0.5,
        response_format: { type: "json_object" },
      });

      const responseText = completion.choices[0]?.message?.content || "{}";
      session.history.push({ role: "assistant", content: responseText });

      let aiDecision;
      try {
        aiDecision = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Failed to parse Groq JSON:", parseError);
        aiDecision = {
          spoken_response:
            "I'm sorry, I encountered an internal glitch. Could you please repeat your answer?",
          is_follow_up: false,
          is_interview_complete: false,
        };
      }

      if (!aiDecision.is_follow_up && !aiDecision.is_interview_complete) {
        session.questionCount++;
      }

      return aiDecision;
    } catch (error) {
      console.error("[GroqService] Error generating response:", error);
      throw error;
    }
  }

  cleanupSession(socketId) {
    delete this.sessions[socketId];
  }

  async evaluateInterview(socketId) {
    const session = this.sessions[socketId];
    if (!session) throw new Error("Session not found");

    const prompt = `You are an expert AI Technical Recruiter. Please evaluate the following interview transcript and provide a final evaluation scorecard.
Respond with a JSON object matching this schema: 
{
  "overallScore": number (0 to 10),
  "hiringDecision": string ("Strong Hire", "Hire", "No Hire"),
  "technicalSkills": array of strings (list of technical skills demonstrated or lacking),
  "softSkills": array of strings (list of soft skills demonstrated),
  "summary": string (a brief summary of the candidate's performance)
}

Transcript:
${JSON.stringify(session.history)}`;

    try {
      const completion = await this.groq.chat.completions.create({
        messages: [{ role: "system", content: prompt }],
        model: "llama-3.3-70b-versatile",
        temperature: 0.2,
        response_format: { type: "json_object" },
      });

      const responseText = completion.choices[0]?.message?.content || "{}";
      const evaluation = JSON.parse(responseText);
      return evaluation;
    } catch (error) {
      console.error("[GroqService] Error evaluating interview:", error);
      throw error;
    }
  }
}

export const groqService = new GroqService();
