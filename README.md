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

### Media Flow

1. **Frontend → Backend**: Candidate's audio/video is captured and sent via WebSocket
2. **Backend → Storage**: After interview completion, video is uploaded to Cloudinary via FFmpeg optimization
3. **Backend → Transcription**: Audio chunks are sent to Deepgram for real-time speech-to-text
4. **Transcription → AI Evaluation**: Transcripts are processed by Groq AI for conversation and evaluation

### WebSocket/Event Flow

1. Client connects → `start_interview` event
2. Server initializes session and sends first AI question
3. Client captures audio and sends `submit_audio` events
4. Server transcribes audio, gets AI response, converts to speech
5. Server sends `ai_response` back to client
6. Client can also send `proctor_flag` events for suspicious activities
7. On disconnect, server schedules cleanup with grace period

## Technical Decisions & Tradeoffs

### Why This Approach?

We chose a real-time WebSocket-based architecture to enable natural, conversational AI interviews rather than pre-recorded question-and-answer sessions. This creates a more authentic interview experience.

### Why Streaming Over Full Upload?

- **Real-time interaction**: Enables back-and-forth conversation
- **Lower memory usage**: No need to store large files in memory
- **Faster feedback**: Candidates get immediate AI responses
- **Progressive recovery**: Can resume from interruptions without losing all data
- **Bandwidth efficiency**: Media is transmitted in chunks

### Why This Architecture/Design?

- **Separation of concerns**: Frontend handles UI/capture, backend handles processing/storage
- **Scalable services**: Each component (Deepgram, Groq, Cloudinary) can scale independently
- **Persistence layer**: MongoDB ensures interview data is durable
- **Event-driven**: WebSockets enable low-latency bidirectional communication

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
- **FFmpeg processing**: Video optimization is CPU-intensive

### Performance Bottlenecks

- **Speech-to-text processing**: Each audio chunk requires API call to Deepgram
- **Text-to-speech generation**: Each AI response requires TTS processing
- **Video transcoding**: FFmpeg processing is single-threaded and CPU-heavy
- **Database writes**: Every transcript message requires a database update

### Future Improvements for High Concurrency

1. **Horizontal scaling**: Add multiple backend servers with Redis for socket.io adapter
2. **Message queue**: Use Inngest (already integrated) for async processing of non-real-time tasks
3. **Database optimization**: Add read replicas, sharding, and indexing improvements
4. **Caching**: Cache frequent AI prompts and responses
5. **Worker pool**: Offload FFmpeg processing to dedicated worker servers
6. **Rate limiting**: Implement client-side and server-side rate limiting
7. **CDN usage**: Serve static assets and frontend via CDN

## Project Structure

```
AI Video Interview/
├── backend/
│   ├── inngest/          # Background job processing
│   ├── middleware/       # Auth and other middleware
│   ├── models/           # MongoDB schemas
│   ├── routes/           # API endpoints
│   ├── services/         # Deepgram and Groq integrations
│   ├── sockets/          # WebSocket handlers
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── context/      # React context
│   │   ├── hooks/        # Custom hooks
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
