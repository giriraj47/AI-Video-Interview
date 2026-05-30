import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { BACKEND_URL } from "../config";

export default function AdminPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Authentication & Data States
  const [secret, setSecret] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [passcodeVal, setPasscodeVal] = useState("");
  const [interviews, setInterviews] = useState([]);
  const [selectedInterview, setSelectedInterview] = useState(null);
  
  // UX States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Filters & Sorting States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDecision, setFilterDecision] = useState("All");
  const [sortOrder, setSortOrder] = useState("newest"); // newest | score-high | score-low

  // Attempt auto-login if secret is in URL
  useEffect(() => {
    const urlSecret = searchParams.get("secret");
    if (urlSecret) {
      setSecret(urlSecret);
      verifySecret(urlSecret);
    }
  }, [searchParams]);

  const verifySecret = async (keyToVerify) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/verify`, {
        headers: { "x-admin-secret": keyToVerify }
      });
      if (response.ok) {
        setIsAuthorized(true);
        setSecret(keyToVerify);
        fetchInterviews(keyToVerify);
      } else {
        const data = await response.json();
        setError(data.error || "Invalid secret passphrase");
        setIsAuthorized(false);
      }
    } catch (err) {
      setError("Failed to connect to backend server");
      setIsAuthorized(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchInterviews = async (key) => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/interviews`, {
        headers: { "x-admin-secret": key }
      });
      if (response.ok) {
        const data = await response.json();
        setInterviews(data.interviews || []);
      } else {
        setError("Failed to load submissions list");
      }
    } catch (err) {
      setError("Error accessing database");
    } finally {
      setLoading(false);
    }
  };

  const handleManualLogin = (e) => {
    e.preventDefault();
    if (!passcodeVal.trim()) {
      setError("Please input your secret passphrase");
      return;
    }
    // Set query parameter in URL so it persists on reload
    setSearchParams({ secret: passcodeVal.trim() });
    verifySecret(passcodeVal.trim());
  };

  // Summary Metrics calculations
  const metrics = useMemo(() => {
    if (!interviews.length) return { total: 0, hireRate: 0, avgScore: 0 };
    const total = interviews.length;
    const hires = interviews.filter(i => 
      i.evaluation?.hiringDecision === "Strong Hire" || 
      i.evaluation?.hiringDecision === "Hire"
    ).length;
    const scores = interviews.filter(i => i.evaluation?.overallScore !== undefined)
                             .map(i => i.evaluation.overallScore);
    const avgScore = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 0;
    const hireRate = ((hires / total) * 100).toFixed(0);
    return { total, hireRate, avgScore };
  }, [interviews]);

  // Filtering & Sorting List
  const filteredInterviews = useMemo(() => {
    let result = [...interviews];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(i => 
        i.candidateEmail?.toLowerCase().includes(query) ||
        i.phoneNumber?.includes(query) ||
        i.evaluation?.technicalSkills?.some(s => s.toLowerCase().includes(query)) ||
        i.evaluation?.softSkills?.some(s => s.toLowerCase().includes(query))
      );
    }

    // Decision filter
    if (filterDecision !== "All") {
      result = result.filter(i => i.evaluation?.hiringDecision === filterDecision);
    }

    // Sorting
    result.sort((a, b) => {
      if (sortOrder === "newest") {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      if (sortOrder === "score-high") {
        return (b.evaluation?.overallScore || 0) - (a.evaluation?.overallScore || 0);
      }
      if (sortOrder === "score-low") {
        return (a.evaluation?.overallScore || 0) - (b.evaluation?.overallScore || 0);
      }
      return 0;
    });

    return result;
  }, [interviews, searchQuery, filterDecision, sortOrder]);

  // Format date relative or neat standard
  const formatDateTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getHiringBadgeStyle = (decision) => {
    switch (decision) {
      case "Strong Hire":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "Hire":
        return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
      case "No Hire":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  // 1. Lock Screen GATE
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.06)_0%,rgba(15,23,42,1)_100%)] flex items-center justify-center p-4">
        <div className="w-full max-w-md backdrop-blur-xl bg-slate-950/40 border border-slate-800/80 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          {/* Subtle top decoration light */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent blur-xs" />
          
          <div className="flex flex-col items-center text-center space-y-4 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-cyan-950/50 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-wide bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Admin Gateway
            </h2>
            <p className="text-slate-400 text-sm max-w-xs">
              This terminal is locked. Please enter your secret query key to synchronize database sessions.
            </p>
          </div>

          <form onSubmit={handleManualLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-bold font-mono tracking-widest text-slate-400 uppercase mb-2">
                Secret Passphrase
              </label>
              <input
                type="password"
                value={passcodeVal}
                onChange={(e) => setPasscodeVal(e.target.value)}
                placeholder="Enter passphrase..."
                className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-800 focus:border-cyan-500/80 text-slate-100 placeholder-slate-600 focus:outline-none transition-all duration-300"
              />
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl bg-rose-950/30 border border-rose-500/20 text-rose-400 text-xs font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:scale-[1.02] text-white active:scale-[0.98] transition-all duration-300 shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
            >
              {loading ? "Authenticating..." : "Authorize Terminal"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. Main Admin Dashboard Panel (Authorized State)
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      {/* Top Header Controls bar */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white shadow-md shadow-cyan-500/20 font-mono">
            Ω
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
              AI Recruiter Ledger <span className="text-xs bg-cyan-500/10 text-cyan-400 font-mono px-2 py-0.5 border border-cyan-500/20 rounded-md">ADMIN</span>
            </h1>
            <p className="text-xs text-slate-500">Video & audio interview session explorer</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate("/setup")}
            className="px-4 py-2 text-sm font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
          >
            Start New Candidate Mock
          </button>
          <button 
            onClick={() => {
              setIsAuthorized(false);
              setSecret("");
              setSearchParams({});
            }}
            className="px-4 py-2 text-sm font-semibold rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
          >
            Lock Screen
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Aggregate Stats Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 border-b border-slate-900 bg-slate-950/30">
          <div className="glass-panel p-5 border-slate-900 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-xs font-bold font-mono tracking-widest text-slate-500 uppercase">Total Submissions</span>
              <h3 className="text-3xl font-extrabold text-white mt-1">{metrics.total}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A2.25 2.25 0 0 1 12.75 21.5h-1.5a2.25 2.25 0 0 1-2.25-2.263V19.13m4.13-3.07c-.6-.414-1.275-.688-2.008-.8M13.5 13.5a1.5 1.5 0 0 1-3 0 1.5 1.5 0 0 1 3 0Zm-5.32 2.57c-.6-.414-1.275-.688-2.008-.8M6.75 16.5A4.125 4.125 0 0 0 2.25 19v1.5a2.25 2.25 0 0 0 2.25 2.25h1.5a2.25 2.25 0 0 0 2.25-2.25V19a4.125 4.125 0 0 0-4.125-4.125ZM8.25 10.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
              </svg>
            </div>
          </div>

          <div className="glass-panel p-5 border-slate-900 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-xs font-bold font-mono tracking-widest text-slate-500 uppercase">Hiring Ratio</span>
              <h3 className="text-3xl font-extrabold text-cyan-400 mt-1">{metrics.hireRate}%</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-cyan-950/30 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
              </svg>
            </div>
          </div>

          <div className="glass-panel p-5 border-slate-900 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-xs font-bold font-mono tracking-widest text-slate-500 uppercase">Avg Overall Score</span>
              <h3 className="text-3xl font-extrabold text-purple-400 mt-1">{metrics.avgScore} <span className="text-sm font-medium text-slate-500">/ 10</span></h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-950/30 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
          </div>
        </section>

        {/* Dual Panel Layout */}
        <section className="flex-1 flex overflow-hidden">
          {/* LEFT SIDEBAR PANEL (Compass connections view) */}
          <div className="w-96 border-r border-slate-900 flex flex-col bg-slate-950">
            {/* Search & Filtering Inputs */}
            <div className="p-4 space-y-3 border-b border-slate-900 bg-slate-950/50">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search email, skills, phone..."
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 focus:border-cyan-500/80 text-slate-200 placeholder-slate-500 focus:outline-none transition-colors"
                />
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-slate-500 absolute left-3 top-2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
                </svg>
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <select
                    value={filterDecision}
                    onChange={(e) => setFilterDecision(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-400 text-xxs px-2 py-1.5 rounded-lg focus:outline-none focus:border-cyan-500/80"
                  >
                    <option value="All">All Decisions</option>
                    <option value="Strong Hire">Strong Hire</option>
                    <option value="Hire">Hire</option>
                    <option value="No Hire">No Hire</option>
                  </select>
                </div>

                <div className="flex-1">
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-400 text-xxs px-2 py-1.5 rounded-lg focus:outline-none focus:border-cyan-500/80"
                  >
                    <option value="newest">Newest First</option>
                    <option value="score-high">Highest Score</option>
                    <option value="score-low">Lowest Score</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Candidate List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-900/60 custom-scrollbar">
              {filteredInterviews.length === 0 ? (
                <div className="p-8 text-center text-slate-600 text-xs">
                  No applications match filters.
                </div>
              ) : (
                filteredInterviews.map((item) => {
                  const isSelected = selectedInterview?._id === item._id;
                  const score = item.evaluation?.overallScore;
                  return (
                    <div
                      key={item._id}
                      onClick={() => setSelectedInterview(item)}
                      className={`p-4 cursor-pointer transition-all border-l-2 flex flex-col gap-2 hover:bg-slate-900/40 relative ${
                        isSelected 
                          ? "bg-slate-900/80 border-cyan-500" 
                          : "border-transparent"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-semibold text-slate-200 truncate max-w-[170px]" title={item.candidateEmail}>
                          {item.candidateEmail}
                        </span>
                        {score !== undefined && (
                          <span className={`text-xxs font-mono font-bold px-2 py-0.5 rounded-md border ${
                            score >= 8 
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                              : score >= 5 
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20" 
                              : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          }`}>
                            {score}/10
                          </span>
                        )}
                      </div>

                      <div className="flex justify-between items-center text-xxs text-slate-500">
                        <span>{item.phoneNumber || "No Phone"}</span>
                        <span>{formatDateTime(item.createdAt)}</span>
                      </div>

                      {item.evaluation?.hiringDecision && (
                        <div className="flex gap-1.5 mt-0.5">
                          <span className={`text-3xxs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${getHiringBadgeStyle(item.evaluation.hiringDecision)}`}>
                            {item.evaluation.hiringDecision}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT MAIN DETAILS PANEL */}
          <div className="flex-1 overflow-y-auto bg-slate-950 flex flex-col custom-scrollbar">
            {!selectedInterview ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-600 space-y-3">
                <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-9 h-9 animate-pulse text-cyan-500/60">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-6.75h.008v.008H10.5v-.008Zm0 2.25h.008v.008H10.5v-.008Zm0 2.25h.008v.008H10.5v-.008Zm3 0h.008v.008h-.008v-.008Zm0-2.25h.008v.008h-.008v-.008Zm0-2.25h.008v.008h-.008v-.008Zm-9.75 18c0 1.242 1.008 2.25 2.25 2.25h12c1.242 0 2.25-1.008 2.25-2.25V11.25M3.75 4.5h16.5" />
                  </svg>
                </div>
                <h4 className="text-white font-semibold tracking-wide">No Candidate Selected</h4>
                <p className="text-xs max-w-sm">
                  Click on an interview submission inside the left panel to inspect the candidate's core metrics, skills list, recruiter summary, and dialog transcripts.
                </p>
              </div>
            ) : (
              <div className="p-8 space-y-8 max-w-4xl mx-auto w-full">
                
                {/* Scorecard Profile Header */}
                <div className="glass-panel p-6 border-slate-900 rounded-3xl flex flex-col md:flex-row justify-between items-stretch gap-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
                  
                  <div className="flex flex-col justify-between space-y-4">
                    <div>
                      <span className="text-xxs font-mono tracking-widest text-cyan-400 font-bold uppercase">Candidate Profile</span>
                      <h2 className="text-2xl font-extrabold text-white mt-1 select-all">{selectedInterview.candidateEmail}</h2>
                      
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mt-4 text-xs">
                        <span className="text-slate-500">Phone Number:</span>
                        <span className="text-slate-300 font-mono font-medium">{selectedInterview.phoneNumber || "N/A"}</span>
                        
                        <span className="text-slate-500">Interview Session:</span>
                        <span className="text-slate-300 font-mono">{formatDateTime(selectedInterview.createdAt)}</span>
                        
                        <span className="text-slate-500">Status:</span>
                        <span className="text-emerald-400 font-mono font-bold capitalize">{selectedInterview.status || "Completed"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-slate-900 pt-6 md:pt-0 md:pl-8">
                    {selectedInterview.evaluation?.overallScore !== undefined && (
                      <div className="flex flex-col items-center text-center">
                        <div className="relative flex items-center justify-center">
                          {/* Beautiful Score Dial */}
                          <div className="w-24 h-24 rounded-full bg-slate-900 border-2 border-slate-800 flex flex-col items-center justify-center shadow-inner relative">
                            <span className="text-3xl font-extrabold text-white leading-none font-mono">
                              {selectedInterview.evaluation.overallScore}
                            </span>
                            <span className="text-[10px] text-slate-500 font-bold mt-1 font-mono uppercase tracking-wider">
                              Score
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedInterview.evaluation?.hiringDecision && (
                      <div className="flex flex-col justify-center space-y-1.5">
                        <span className="text-3xxs font-bold font-mono tracking-widest text-slate-500 uppercase">Hiring Recommendation</span>
                        <span className={`text-sm font-extrabold tracking-wider px-3 py-1 rounded-xl border text-center uppercase ${getHiringBadgeStyle(selectedInterview.evaluation.hiringDecision)}`}>
                          {selectedInterview.evaluation.hiringDecision}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Score Summary Block */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Summary Block */}
                  <div className="glass-panel p-6 border-slate-900 rounded-3xl space-y-4">
                    <h3 className="text-sm font-bold font-mono tracking-widest text-slate-400 uppercase flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-cyan-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                      </svg>
                      Recruiter Feedback
                    </h3>
                    <p className="text-slate-300 text-sm leading-relaxed italic font-light bg-slate-900/30 p-4 rounded-xl border border-slate-900/60">
                      "{selectedInterview.evaluation?.summary || "No assessment evaluation summary was populated for this interview."}"
                    </p>
                  </div>

                  {/* Skills Block */}
                  <div className="glass-panel p-6 border-slate-900 rounded-3xl space-y-4">
                    <h3 className="text-sm font-bold font-mono tracking-widest text-slate-400 uppercase flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-purple-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </svg>
                      Skill Matrix
                    </h3>

                    <div>
                      <span className="text-[10px] font-bold font-mono tracking-wider text-slate-500 uppercase block mb-2">Technical Matrix</span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedInterview.evaluation?.technicalSkills?.length ? (
                          selectedInterview.evaluation.technicalSkills.map((skill, idx) => (
                            <span key={idx} className="text-xxs px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-medium">
                              {skill}
                            </span>
                          ))
                        ) : (
                          <span className="text-xxs text-slate-500 italic">No skills flagged</span>
                        )}
                      </div>
                    </div>

                    <div className="pt-2">
                      <span className="text-[10px] font-bold font-mono tracking-wider text-slate-500 uppercase block mb-2">Soft Capacities</span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedInterview.evaluation?.softSkills?.length ? (
                          selectedInterview.evaluation.softSkills.map((skill, idx) => (
                            <span key={idx} className="text-xxs px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium">
                              {skill}
                            </span>
                          ))
                        ) : (
                          <span className="text-xxs text-slate-500 italic">No skills flagged</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Proctoring Flags Section */}
                <div className="glass-panel p-6 border-slate-900 rounded-3xl space-y-4">
                  <h3 className="text-sm font-bold font-mono tracking-widest text-slate-400 uppercase flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-rose-500">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                    Proctoring & Integrity Flags
                  </h3>

                  {(!selectedInterview.flags || selectedInterview.flags.length === 0) ? (
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/25 text-emerald-400 text-xs animate-fade-in">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 flex-shrink-0">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                      <div>
                        <span className="font-bold">Clear Integrity Record:</span> No suspicious candidate activity, tab switching, copy-pasting, or video framing violations were logged for this session.
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-3 rounded-2xl bg-rose-950/20 border border-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-2">
                        <span className="bg-rose-500/20 border border-rose-500/30 px-2 py-0.5 rounded text-xxs font-mono">
                          {selectedInterview.flags.length} VIOLATIONS
                        </span>
                        <span>Potential academic integrity warnings recorded.</span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                        {selectedInterview.flags.map((flag, idx) => (
                          <div key={idx} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-900 flex flex-col gap-1.5 hover:border-slate-800 transition-colors">
                            <div className="flex justify-between items-center">
                              <span className="text-xxs font-extrabold text-rose-400 font-mono uppercase tracking-wider">
                                {flag.type}
                              </span>
                              <span className="text-3xxs text-slate-500 font-mono">
                                {formatDateTime(flag.timestamp)}
                              </span>
                            </div>
                            <p className="text-slate-300 text-xs leading-relaxed font-light">
                              {flag.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Detailed Dialog timeline */}
                <div className="glass-panel p-6 border-slate-900 rounded-3xl space-y-6">
                  <div className="border-b border-slate-900 pb-4 flex justify-between items-center">
                    <h3 className="text-sm font-bold font-mono tracking-widest text-slate-400 uppercase flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-emerald-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A9.75 9.75 0 0 1 12 2.25h.09A9.75 9.75 0 0 1 22 12v.75m-3 .375a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm-3 0a2.25 2.25 0 1 0-4.5 0 2.25 2.25 0 0 0 4.5 0ZM12 7.875c.621 0 1.125-.504 1.125-1.125V3.375c0-.621-.504-1.125-1.125-1.125h-.09c-.621 0-1.125.504-1.125 1.125v3.375c0 .621.504 1.125 1.125 1.125H12ZM4.5 12.75a3.375 3.375 0 0 0-3.375-3.375H.75m3.75 3.375a1.125 1.125 0 0 1-1.125 1.125h-1.5a3.375 3.375 0 0 0-3.375 3.375v1.5a1.125 1.125 0 0 1-1.125 1.125H12m10.5-3.75a3.375 3.375 0 0 1-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125 1.125h-1.5a3.375 3.375 0 0 0-3.375 3.375v1.5a1.125 1.125 0 0 1-1.125 1.125H12" />
                      </svg>
                      Detailed Transcript Ledger
                    </h3>
                    <span className="text-xxs text-slate-500 font-mono">
                      {selectedInterview.transcript?.length || 0} messages audited
                    </span>
                  </div>

                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {selectedInterview.transcript?.length === 0 ? (
                      <div className="text-center py-8 text-slate-600 text-xs italic">
                        Empty transcript ledger.
                      </div>
                    ) : (
                      selectedInterview.transcript.map((msg, index) => {
                        if (msg.role === "system") {
                          // Hide default heavy prompt messages, display structural milestones
                          if (msg.content.includes("complete") || msg.content.includes("answered")) {
                            return (
                              <div key={index} className="flex justify-center my-2">
                                <span className="text-3xxs font-bold font-mono tracking-wider bg-slate-900 border border-slate-800 text-slate-500 px-3 py-1 rounded-full uppercase">
                                  {msg.content.includes("complete") ? "🏁 System: Interview Concluded" : "📋 System Checkpoint"}
                                </span>
                              </div>
                            );
                          }
                          return null;
                        }

                        const isUser = msg.role === "user";
                        
                        // Parse JSON output if assistant returned standard interview JSON object
                        let displayText = msg.content;
                        if (!isUser) {
                          try {
                            const parsed = JSON.parse(msg.content);
                            displayText = parsed.spoken_response || msg.content;
                          } catch (e) {
                            // Fallback to raw text
                          }
                        }

                        return (
                          <div 
                            key={index} 
                            className={`flex items-start gap-3.5 max-w-[85%] ${
                              isUser ? "ml-auto flex-row-reverse" : "mr-auto"
                            }`}
                          >
                            {/* Avatar */}
                            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-xs ${
                              isUser 
                                ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white" 
                                : "bg-slate-900 border border-slate-800 text-cyan-400 font-mono"
                            }`}>
                              {isUser ? "C" : "AI"}
                            </div>

                            {/* Message bubble */}
                            <div className="space-y-1">
                              <div className={`px-4 py-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                                isUser 
                                  ? "bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-tr-none" 
                                  : "bg-slate-900/90 border border-slate-900 text-slate-200 rounded-tl-none"
                              }`}>
                                {displayText}
                              </div>
                              <span className={`block text-[9px] text-slate-500 font-mono ${isUser ? "text-right" : "text-left"}`}>
                                {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Live"}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
