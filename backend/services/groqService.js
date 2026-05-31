import Groq from "groq-sdk";

class GroqService {
  constructor() {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,

      timeout: 45000,
    });
    this.sessions = {}; // Maps interviewId to conversation history
    this.maxQuestions = 7;
    this.jobDescription = `Role Overview
We are looking for an enthusiastic and motivated MERN Stack Developer Intern to join our engineering team. In this role, you will get hands-on experience building scalable, real-world web applications. You will work closely with our senior developers and product managers to design, build, and maintain features across the entire software development lifecycle. If you have a solid foundation in JavaScript and a strong desire to master MongoDB, Express.js, React.js, and Node.js, we want to hear from you!

Key Responsibilities
Front-End Development: Assist in building responsive, user-friendly, and dynamic web interfaces using React.js, HTML5, and CSS3.

Back-End Development: Help develop and maintain server-side logic and RESTful APIs using Node.js and Express.js.

Database Management: Work with MongoDB to write efficient queries, design basic schemas, and manage data storage.

Debugging & Testing: Identify, troubleshoot, and resolve bugs. Write basic unit tests to ensure code reliability.

Collaboration: Participate in daily stand-ups, team meetings, and code reviews. Work closely with UI/UX designers to translate designs into functional code.

Version Control: Manage code repositories and collaborate using Git and GitHub/GitLab.

Qualifications & Skills
Education: Currently pursuing or recently graduated with a Bachelor’s/Master’s degree in Computer Science, Software Engineering, IT, or a related technical field.

Core Languages: Strong foundational knowledge of JavaScript (ES6+), HTML, and CSS.

Stack Familiarity: Basic understanding or academic/project-level experience with the MERN stack (MongoDB, Express, React, Node).

Tools: Familiarity with version control systems (Git) and API testing tools (like Postman).

Soft Skills: * Strong analytical and problem-solving abilities.

Eagerness to learn new technologies and adapt to a fast-paced startup environment.

Good written and verbal communication skills.

Bonus Points if you have:

Deployed personal projects using the MERN stack (please include links to your GitHub or portfolio!).

Familiarity with state management libraries like Redux or Context API.

Understanding of basic cloud deployment (e.g., AWS, Heroku, Vercel).
`;
  }

  // Initialize a new interview session or reload an existing one
  initSession(interviewId, existingTranscript = null) {
    const systemPrompt = {
      role: "system",
      content: `You are an expert AI Technical Recruiter. You are interviewing a candidate for this job description: ${this.jobDescription} 
You must ask exactly ${this.maxQuestions} questions total.
Always respond with a valid JSON object matching this schema:
{
  "spoken_response": "The text you will say to the candidate",
  "is_follow_up": boolean,
  "is_interview_complete": boolean
}
Keep your questions professional, concise, and conversational. Do not output anything outside of the JSON object.
Your first task is to greet the candidate and ask the first technical question.
this is just a test run ask a basic question like how are you and stuff. Make the intrview last for 10 minutes to maximum 12 minutes.
`,
    };

    if (existingTranscript && existingTranscript.length > 0) {
      // Reconstruct the history from the database transcript.
      // Strip any previous system messages from the transcript first to avoid duplicates,
      // and map to clean { role, content } objects.
      const conversation = existingTranscript
        .filter((msg) => msg.role !== "system")
        .map((msg) => ({ role: msg.role, content: msg.content }));

      // Count the actual questions asked by checking for non-followup assistant responses
      let questionCount = 0;
      conversation.forEach((msg) => {
        if (msg.role === "assistant") {
          try {
            const parsed = JSON.parse(msg.content);
            if (!parsed.is_follow_up && !parsed.is_interview_complete) {
              questionCount++;
            }
          } catch (e) {
            questionCount++;
          }
        }
      });

      this.sessions[interviewId] = {
        questionCount,
        history: [systemPrompt, ...conversation],
      };
      console.log(
        `[GroqService] Re-initialized session ${interviewId} with ${questionCount} questions already asked.`,
      );
    } else {
      this.sessions[interviewId] = {
        questionCount: 0,
        history: [systemPrompt],
      };
      console.log(`[GroqService] Initialized new session for ${interviewId}`);
    }
  }

  async generateNextResponse(interviewId, candidateText = null) {
    const session = this.sessions[interviewId];
    if (!session) throw new Error("Session not initialized");

    if (candidateText) {
      session.history.push({ role: "user", content: candidateText });
    }

    if (session.questionCount >= this.maxQuestions && candidateText) {
      session.history.push({
        role: "system",
        content: `The candidate has answered ${this.maxQuestions} questions. The interview is now complete. Set 'is_interview_complete' to true, and output a closing thank-you message in 'spoken_response'.`,
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

  cleanupSession(interviewId) {
    delete this.sessions[interviewId];
  }

  async evaluateInterview(interviewId) {
    const session = this.sessions[interviewId];
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
