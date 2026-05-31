# AI Video Interview Platform

A modern AI-powered video interview platform that enables remote candidate screening with real-time conversation, proctoring, and evaluation.

## Problem Understanding

### What Problem Are We Solving?

Traditional in-person interviews are time-consuming, expensive, and geographically constrained. Existing video interview tools often lack:

- Real-time AI-driven conversation capabilities
- Built-in proctoring for suspicious activities
- Integrated transcription and evaluation
- Seamless streaming and recovery from interruptions

### Why Is This System Needed?

This system democratizes the hiring process by:

- Enabling candidates to interview from anywhere
- Reducing recruiter workload through AI-powered initial screening
- Providing objective evaluations and transcripts
- Ensuring interview integrity with proctoring features
- Supporting recovery from technical interruptions

## Architecture Overview

### High-Level System Architecture

```
┌─────────────────┐
│   Frontend      │
│   (React/Vite)  │
└────────┬────────┘
         │ WebSocket
         │ HTTP
┌────────▼────────┐
│   Backend       │
│  (Express.js)   │
└────────┬────────┘
         │
┌────────┼────────┐
│        │        │
▼        ▼        ▼
MongoDB  Deepgram Cloudinary
(Storage)(STT/TTS)(Media)
         │
         ▼
      Groq AI
      (LLM Brain)
```

### Complete Data Flow

#### 1. Interview Setup (HTTP)
1. Candidate enters email/phone on setup page
2. Frontend sends `POST /api/start-interview`
3. Backend creates/retrieves `Interview` document in MongoDB (status: `In Progress`)
4. Backend returns `interviewId` to frontend
5. Frontend stores `interviewId` in localStorage and navigates to interview page

#### 2. Real-Time Interview (WebSocket)
1. Interview page initializes media (webcam/screen recording starts)
2. Frontend emits `start_interview({ interviewId })`
3. Backend:
   - Initializes Groq session
   - Generates first question via Groq LLM
   - Converts to speech via Deepgram TTS
   - Saves question to `Interview.transcript`
   - Emits `ai_response({ text, audioBuffer, ... })`
4. Frontend:
   - Plays AI audio
   - Displays question
   - Starts Voice Activity Detection (VAD)
5. Candidate speaks → VAD detects speech/silence → records audio chunk
6. Frontend emits `submit_audio({ audioBuffer, mimetype })`
7. Backend:
   - Transcribes via Deepgram STT
   - Saves user transcript to MongoDB
   - Sends to Groq for next question
   - Repeats until `is_interview_complete: true`

#### 3. Interview Completion & Upload
1. Frontend detects completion, triggers two fire-and-forget actions:
   a. `POST /api/save-interview` (starts Groq evaluation in background)
   b. `stopVideoRecordingAndUpload(interviewId)` (stops recording and uploads video)

#### 4. Video Upload (Two Paths)

##### Path A: Primary - Signed Cloudinary Upload (Frontend Direct)
1. Frontend fetches signed URL: `GET /api/signed-upload-url?interviewId=123`
2. Frontend uploads video **directly to Cloudinary**
3. Cloudinary triggers `cloudinary-webhook` on backend
4. Webhook saves `videoUrl` to MongoDB and checks for `evaluation` → if both exist, sets status to `Completed`

##### Path B: Fallback - Backend Upload
1. If signed upload fails, frontend sends `POST /api/upload-recording` with `FormData`
2. Backend:
   a. Multer saves file to temp disk synchronously
   b. Updates `Interview.status: In Progress`
   c. **Responds immediately** with `200 OK` (frontend can close tab safely!)
   d. Starts background processing:
      i. Uploads raw file to Cloudinary (no FFmpeg!)
      ii. Saves `videoUrl` to MongoDB
      iii. Checks for `evaluation` → if both exist, sets status to `Completed`
      iv. Deletes temp file

### WebSocket/Event Flow

1. Client connects → `start_interview` event
2. Server initializes session and sends first AI question
3. Client captures audio and sends `submit_audio` events
4. Server transcribes audio, gets AI response, converts to speech
5. Server sends `ai_response` back to client
6. Client can also send `proctor_flag` events for suspicious activities
7. On disconnect, server schedules cleanup with grace period

## Key Technical Decisions & Recent Changes

### 1. WebSockets Over Polling
- **Why?** Real-time, low-latency bidirectional communication for natural conversation
- **Tradeoff:** Slightly more complex server setup, but worth it for UX

### 2. Fire-and-Forget Background Processing
- **Why?** Candidate doesn't wait for evaluation/upload to finish
- **Implementation:** Async IIFEs in backend routes respond immediately, then process in background

### 3. Dual Upload Paths (Signed + Backend Fallback)
- **Primary:** Signed Cloudinary upload (faster, less server load)
- **Fallback:** Backend upload (more reliable, continues if tab closes after `200 OK`)

### 4. Grace Period Reconnection (30 Seconds)
- **Why?** Candidates shouldn't lose progress due to temporary network blips
- **Implementation:** Server keeps session in memory, cancels cleanup if client reconnects within 30s

### 5. Status Coordination Logic (Recent Change)
- **Problem:** Race condition where either video OR evaluation could finish first
- **Solution:** Interview is only marked `Completed` when **both** `videoUrl` AND `evaluation` exist
- **Where it's implemented:**
  - Cloudinary webhook (`upload.route.js`)
  - Background upload completion (`upload.route.js`)
  - Evaluation completion (`interview.route.js`)

### 6. Removed FFmpeg (Recent Change)
- **Why?** FFmpeg transcoding was CPU-intensive and slowed down uploads
- **Solution:** Upload raw video directly to Cloudinary, use Cloudinary's `eager` transformations for optimization
- **Benefits:** Faster uploads, less backend complexity, no CPU bottleneck

## Failure Scenarios & Edge Cases

### Network Interruptions
- Temporary loss of connectivity between frontend and backend

### Duplicate Chunks
- Same audio chunk being sent multiple times due to retransmissions

### Camera/Mic Disconnects
- Media devices becoming unavailable mid-interview

### Partial Upload Failures
- Video upload to Cloudinary failing partway through

### WebSocket Reconnects
- Client reconnecting after connection drop

### Empty/Corrupted Media Chunks
- Invalid or zero-byte audio data being transmitted

## Recovery Mechanisms

### How System Handles Reconnects
- **Grace period**: Server keeps session alive for 30 seconds after disconnect
- **Session restoration**: Client sends `interviewId` on reconnect, server restores state
- **History replay**: Server replays last AI question to resume conversation

### Retry/Recovery Logic
- **Transcript persistence**: Every message is saved to MongoDB immediately
- **Idempotent operations**: Database updates use `findByIdAndUpdate` which is safe to retry
- **Cleanup timers**: Pending cleanup is canceled if client reconnects within grace period

### Chunk Recovery Strategy
- Each audio submission is processed independently
- Empty transcripts trigger a "please repeat" response instead of failing
- Transcripts are stored before AI processing to prevent data loss

### Failure Handling Approach
- **Fail open for candidate experience**: Prioritizes letting candidate continue over strict error handling
- **Real-time error events**: Client is notified of errors via `interview_error` events
- **Graceful degradation**: System can function even if some features (like proctoring) fail

## Product Thinking

### Recruiter Experience Considerations
- **Admin dashboard**: Centralized view of all interviews
- **Evaluation scorecards**: AI provides structured scores and hiring recommendations
- **Transcript access**: Full conversation history available for review
- **Flagged activities**: Proctoring flags highlighted for integrity checks
- **Video playback**: Recorded interviews stored in Cloudinary

### Candidate Experience Considerations
- **Simple setup**: Minimal configuration needed to start
- **Real-time feedback**: Instant AI responses create natural flow
- **Resume capability**: Can reconnect and continue if interrupted
- **Clear progress**: Shows current question number and total questions
- **Visual cues**: Transcription panel shows what was understood

### How Suspicious Activities Are Tracked
- **Proctoring flags**: Client-side detection of tab switches, window defocus, copy-paste, right-click
- **Flags stored in DB**: Each flag includes type, timestamp, and description
- **Dashboard visibility**: Recruiters can see all flags during review
- **Flag types**:
  - `TAB_SWITCHED`: Candidate switched browser tabs
  - `WINDOW_DEFOCUSED`: Interview window lost focus
  - `COPY_PASTE`: Copy/paste detected
  - `RIGHT_CLICK`: Right-click menu opened
  - `OUT_OF_FRAME`: Candidate out of camera view
  - `MULTIPLE_PEOPLE`: Multiple faces detected

### UX Decisions Made
- **Minimalist interface**: Reduces candidate distraction
- **Visual progress indicator**: Shows how many questions remain
- **Audio visualizer**: Confirms mic is working
- **Transcription preview**: Builds trust by showing what the AI heard
- **Exit confirmation**: Prevents accidental interview termination

## Scalability Considerations

### What May Break At Scale
- **WebSocket connections**: Single server can only handle limited concurrent connections
- **AI API rate limits**: Deepgram and Groq have rate limits that could be hit
- **Database write load**: High volume of concurrent interviews could saturate MongoDB

### Performance Bottlenecks
- **Speech-to-text processing**: Each audio chunk requires API call to Deepgram
- **Text-to-speech generation**: Each AI response requires TTS processing
- **Database writes**: Every transcript message requires a database update

### Future Improvements for Production (If I Had More Time)

#### Upload Pipeline Enhancements
1. **Resumable Chunked Uploads**: Split video into 5–10MB chunks, store progress in `localStorage`, resume if tab closes
2. **SHA-256 File Integrity**: Frontend computes hash, backend verifies after upload
3. **Service Worker Background Upload**: Upload continues even if tab closes entirely
4. **Progress Bar & UX**: Show upload % and estimated time remaining
5. **Exponential Backoff Retries**: Retry failed uploads with increasing delays
6. **BullMQ + Redis Queue**: Persist upload queue to survive server restarts

#### Scalability Enhancements
1. **Horizontal Scaling**: Add multiple backend servers with Redis for Socket.io adapter
2. **Read Replicas & Sharding**: Scale MongoDB horizontally
3. **Rate Limiting**: Client-side and server-side rate limiting
4. **Structured Logging & Monitoring**: Winston/Pino for logs, Prometheus for metrics
5. **Circuit Breakers**: Protect against AI API outages

#### Other Improvements
- JWT Authentication for admin routes
- Interview templates (custom question banks)
- Multi-language support
- AI-powered proctoring (computer vision for eye-tracking, etc.)

## Project Structure

```
AI Video Interview/
├── backend/
│   ├── inngest/          # Background job processing (currently unused)
│   ├── middleware/       # Auth and other middleware
│   ├── models/           # MongoDB schemas
│   ├── routes/           # API endpoints (interview, upload, admin)
│   ├── services/         # Deepgram and Groq integrations
│   ├── sockets/          # WebSocket handlers (interviewHandler.js)
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── context/      # React context (InterviewContext.jsx)
│   │   ├── hooks/        # Custom hooks (useSocket, useVoiceActivity, etc.)
│   │   ├── pages/        # Page components
│   │   └── config.js
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Setup Instructions

### Prerequisites
- Node.js 18+
- MongoDB
- Deepgram API key
- Groq API key
- Cloudinary account

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Environment Variables (.env in backend)
```
MONGO_URI=mongodb://localhost:27017/ai-interview
DEEPGRAM_API_KEY=your_deepgram_key
GROQ_API_KEY=your_groq_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
PORT=4000
```

## How AI Tools Were Used In Development
This project was built with AI as a collaborative tool:
- **Brainstorming & Architecture**: AI helped outline tech stack and high-level flow
- **Code Generation**: AI generated working skeletons for WebSocket handlers and API routes
- **Debugging**: AI helped identify and fix issues like the status coordination race condition
- **Documentation**: AI helped structure this README and video script
- **Prioritization**: AI listed options, but final decisions (like removing FFmpeg for speed) were mine
