# AI Video Interview Platform

A modern AI-powered video interview platform that enables remote candidate screening with real-time conversation, proctoring, and evaluation.

live link : https://ai-video-interview-sandy.vercel.app
admin link : https://ai-video-interview-sandy.vercel.app/admin?secret=giri_admin_2026_secure

## 🎥 New Feature: Live Video Feed & Recording

The platform now supports live video feed display and recording of the candidate during the interview!

### Key Features:

- **Background Upload**: After interview completion, the recording is uploaded in the background

### How It's Implemented:

#### Technical Details

- Uses HTML5 MediaRecorder API for client-side recording
- Default codec: VP8 video + Opus audio (with fallback to generic WebM)
- Chunk size: 5-second intervals to balance memory usage and upload efficiency
- Video dimensions: 640x480 ideal resolution
- Mirror effect applied for user-friendly preview
- All media tracks are properly cleaned up on component unmount
- Uses BullMQ + Redis for reliable background job processing
- Cloudinary handles video transcoding to MP4 format
- Retry logic with exponential backoff for failed uploads

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
┌────────┼────────┬────────┐
│        │        │        │
▼        ▼        ▼        ▼
MongoDB  Deepgram  Redis    Cloudinary
         │                 (Video Storage)
         ▼
      Groq AI (LLM Brain)
```

### Complete Data Flow

1. **Interview Setup (HTTP)**: Candidate enters email/phone → Backend creates Interview document in MongoDB → Returns interviewId
2. **Media Setup**: Candidate authorizes camera/microphone/screen access → Frontend acquires media streams
3. **Real-Time Interview (WebSocket)**:
   - Frontend connects, emits start_interview
   - Backend initializes Groq session, generates first question, converts to speech with Deepgram, saves to transcript, emits ai_response
   - Candidate speaks → Frontend records audio + video → Emits submit_audio with audio buffer
   - Backend transcribes with Deepgram, saves transcript, sends to Groq for next question, repeats until complete
4. **Interview Completion**:
   - Frontend detects interview complete
   - Stops video recording, assembles video blob
   - Navigates to results page immediately
   - Sends POST /api/save-interview to backend (triggers AI evaluation)
   - Uploads video via POST /api/upload-video in background
5. **Background Processing**:
   - Backend queues video upload job with BullMQ
   - Worker uploads video to Cloudinary, transcodes to MP4
   - Updates Interview document with Cloudinary video URL
   - Cleans up local temporary file

### WebSocket/Event Flow

1. Client connects → start_interview event
2. Server initializes session and sends first AI question
3. Client captures audio and sends submit_audio events
4. Server transcribes audio, gets AI response, converts to speech
5. Server sends ai_response back to client
6. Client can also send proctor_flag events for suspicious activities
7. On disconnect, server schedules cleanup with grace period

## Key Technical Decisions

### 1. WebSockets Over Polling

We chose a real-time WebSocket-based architecture to enable natural, conversational AI interviews rather than pre-recorded question-and-answer sessions. This creates a more authentic interview experience.

### 2. Grace Period Reconnection

Server keeps session alive for 30 seconds after disconnect. If client reconnects within this window, it restores the state and replays the last question.

### 3. Background Video Processing with BullMQ

We use BullMQ (instead of Inngest) for reliable background job processing of video uploads:

- Avoids complex Inngest signature validation issues
- Provides simple, self-hosted queue management with Redis
- Handles retries with exponential backoff
- Cleans up completed jobs automatically

### 4. Immediate Navigation + Background Processing

Candidate navigates to results page immediately after interview completion, while:

- Video upload happens in the background
- AI evaluation runs asynchronously
- No waiting for uploads/processing to finish

## Proctoring Features

- Client-side detection of tab switches, window defocus, copy-paste, right-click
- Flags stored in DB with type, timestamp, and description
- Dashboard visibility for recruiters

## Product Thinking

### Recruiter Experience Considerations

- **Admin dashboard**: Centralized view of all interviews
- **Evaluation scorecards**: AI provides structured scores and hiring recommendations
- **Transcript access**: Full conversation history available for review
- **Flagged activities**: Proctoring flags highlighted for integrity checks

### Candidate Experience Considerations

- **Simple setup**: Minimal configuration needed to start
- **Real-time feedback**: Instant AI responses create natural flow
- **Resume capability**: Can reconnect and continue if interrupted
- **Clear progress**: Shows current question number and total questions
- **Visual cues**: Transcription panel shows what was understood

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

### Future Improvements for High Concurrency

1. **Horizontal scaling**: Add multiple backend servers with Redis for socket.io adapter
2. **Message queue**: Use Inngest or BullMQ for async processing of non-real-time tasks
3. **Database optimization**: Add read replicas, sharding, and indexing improvements
4. **Caching**: Cache frequent AI prompts and responses
5. **Rate limiting**: Implement client-side and server-side rate limiting
6. **CDN usage**: Serve static assets and frontend via CDN

## Project Structure

```
AI Video Interview/
├── backend/
│   ├── config/           # Redis configuration
│   ├── models/           # MongoDB schemas
│   ├── routes/           # API endpoints (interview, admin, upload)
│   ├── services/         # Deepgram and Groq integrations
│   ├── sockets/          # WebSocket handlers
│   ├── queues/           # BullMQ queue configurations
│   ├── workers/          # Background job workers
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── components/   # React components (including CandidateStream)
│   │   ├── context/      # React context
│   │   ├── hooks/        # Custom hooks (including useInterviewMedia)
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
- Redis
- Deepgram API key
- Groq API key
- Cloudinary account (for video storage)

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
PORT=4000
REDIS_URL=redis://localhost:6379
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

## How AI Tools Were Used In Development

This project was built with AI as a collaborative tool:

- **Brainstorming & Architecture**: AI helped outline tech stack and high-level flow
- **Code Generation**: AI generated working skeletons for WebSocket handlers and API routes
- **Documentation**: AI helped structure this README
- **Prioritization**: AI listed options, but final decisions were mine
