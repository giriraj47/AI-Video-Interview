import React, { useState } from "react";
import { useInterview } from "../context/InterviewContext";
import { useNavigate } from "react-router-dom";
import CandidateStream from "./CandidateStream";

export default function SetupPage() {
  const { videoRef, media, proctor, setCandidateInfo } = useInterview();
  const navigate = useNavigate();

  const [email, setEmail] = useState("example@mail.com");
  const [phoneNumber, setPhoneNumber] = useState("1234567890");
  const [formErrors, setFormErrors] = useState({});

  const validateForm = () => {
    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
      errors.email = "Email is required";
    } else if (!emailRegex.test(email)) {
      errors.email = "Invalid email format";
    }

    if (!phoneNumber) {
      errors.phoneNumber = "Phone number is required";
    } else if (phoneNumber.length < 8) {
      errors.phoneNumber = "Phone number must be at least 8 digits";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm() && media.status === "ready") {
      const candidateData = { email, phoneNumber };
      console.log(
        "[SetupPage] Candidate Info ready for backend/database:",
        candidateData,
      );
      setCandidateInfo(candidateData);
      navigate("/interview");
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-stretch justify-center flex-1 w-full max-w-5xl mx-auto py-4">
      {/* Left: Input Form (Aesthetics and Details) */}
      <div className="flex-1 flex flex-col justify-between glass-panel p-8 border-slate-800/80 rounded-2xl w-full max-w-md lg:max-w-none space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-wide bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Candidate Profile
          </h1>
          <p className="text-slate-400 text-sm mt-2 leading-relaxed">
            Please enter your contact information and authorize your media
            devices to proceed with the AI interview.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 flex-1 mt-4">
          <div>
            <label className="block text-xs font-bold font-mono tracking-widest text-slate-400 uppercase mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. giriraj@example.com"
              className={`w-full px-4 py-3 rounded-xl bg-slate-950/60 border ${
                formErrors.email
                  ? "border-red-500/50 focus:border-red-500"
                  : "border-slate-800 focus:border-cyan-500/80"
              } text-slate-100 placeholder-slate-600 focus:outline-none transition-all duration-300 shadow-inner`}
            />
            {formErrors.email && (
              <p className="text-red-400 text-xs mt-1.5 font-medium">
                {formErrors.email}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold font-mono tracking-widest text-slate-400 uppercase mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="e.g. +1234567890"
              className={`w-full px-4 py-3 rounded-xl bg-slate-950/60 border ${
                formErrors.phoneNumber
                  ? "border-red-500/50 focus:border-red-500"
                  : "border-slate-800 focus:border-cyan-500/80"
              } text-slate-100 placeholder-slate-600 focus:outline-none transition-all duration-300 shadow-inner`}
            />
            {formErrors.phoneNumber && (
              <p className="text-red-400 text-xs mt-1.5 font-medium">
                {formErrors.phoneNumber}
              </p>
            )}
          </div>
        </form>

        <button
          onClick={handleSubmit}
          disabled={media.status !== "ready" || !email || !phoneNumber}
          className={`w-full py-4 rounded-xl font-bold text-base tracking-wider uppercase transition-all duration-300 shadow-lg ${
            media.status === "ready" && email && phoneNumber
              ? "bg-gradient-to-r from-cyan-500 to-blue-600 hover:scale-[1.02] text-white cursor-pointer shadow-cyan-500/25 active:scale-[0.98]"
              : "bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed shadow-none"
          }`}
        >
          {media.status !== "ready"
            ? "Configure Devices First"
            : "Start Interview"}
        </button>
      </div>

      {/* Right: Camera Stream Configuration */}
      <div className="flex-1 w-full max-w-md lg:max-w-none flex flex-col justify-center">
        <CandidateStream
          videoRef={videoRef}
          status={media.status}
          webcamStream={media.webcamStream}
          errorMessage={media.errorMessage}
          initInterviewMedia={media.initInterviewMedia}
          isMicOn={media.isMicOn}
          isCamOn={media.isCamOn}
          onToggleMic={media.handleToggleMic}
          onToggleCam={media.handleToggleCam}
          strikeCount={proctor.strikeCount}
        />
      </div>
    </div>
  );
}
