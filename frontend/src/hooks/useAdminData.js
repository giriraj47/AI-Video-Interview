import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { BACKEND_URL } from "../config";

export default function useAdminData() {
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Authentication ──
  const [secret, setSecret] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [passcodeVal, setPasscodeVal] = useState("");

  // ── Data ──
  const [interviews, setInterviews] = useState([]);
  const [selectedInterview, setSelectedInterview] = useState(null);

  // ── UX ──
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Filters & Sorting ──
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDecision, setFilterDecision] = useState("All");
  const [sortOrder, setSortOrder] = useState("newest"); // newest | score-high | score-low

  // ── Auto-login from URL ──
  useEffect(() => {
    const urlSecret = searchParams.get("secret");
    if (urlSecret) {
      setSecret(urlSecret);
      verifySecret(urlSecret);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // ── API helpers ──
  const verifySecret = async (keyToVerify) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/verify`, {
        headers: { "x-admin-secret": keyToVerify },
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
        headers: { "x-admin-secret": key },
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
    setSearchParams({ secret: passcodeVal.trim() });
    verifySecret(passcodeVal.trim());
  };

  const logout = () => {
    setIsAuthorized(false);
    setSecret("");
    setSearchParams({});
  };

  // ── Computed: Metrics ──
  const metrics = useMemo(() => {
    if (!interviews.length) return { total: 0, hireRate: 0, avgScore: 0 };
    const total = interviews.length;
    const hires = interviews.filter(
      (i) =>
        i.evaluation?.hiringDecision === "Strong Hire" ||
        i.evaluation?.hiringDecision === "Hire",
    ).length;
    const scores = interviews
      .filter((i) => i.evaluation?.overallScore !== undefined)
      .map((i) => i.evaluation.overallScore);
    const avgScore = scores.length
      ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
      : 0;
    const hireRate = ((hires / total) * 100).toFixed(0);
    return { total, hireRate, avgScore };
  }, [interviews]);

  // ── Computed: Filtered & sorted list ──
  const filteredInterviews = useMemo(() => {
    let result = [...interviews];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.candidateEmail?.toLowerCase().includes(query) ||
          i.phoneNumber?.includes(query) ||
          i.evaluation?.technicalSkills?.some((s) =>
            s.toLowerCase().includes(query),
          ) ||
          i.evaluation?.softSkills?.some((s) =>
            s.toLowerCase().includes(query),
          ),
      );
    }

    if (filterDecision !== "All") {
      result = result.filter(
        (i) => i.evaluation?.hiringDecision === filterDecision,
      );
    }

    result.sort((a, b) => {
      if (sortOrder === "newest") {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      if (sortOrder === "score-high") {
        return (
          (b.evaluation?.overallScore || 0) - (a.evaluation?.overallScore || 0)
        );
      }
      if (sortOrder === "score-low") {
        return (
          (a.evaluation?.overallScore || 0) - (b.evaluation?.overallScore || 0)
        );
      }
      return 0;
    });

    return result;
  }, [interviews, searchQuery, filterDecision, sortOrder]);

  return {
    // auth
    isAuthorized,
    loading,
    error,
    passcodeVal,
    setPasscodeVal,
    handleManualLogin,
    logout,
    // data
    interviews,
    selectedInterview,
    setSelectedInterview,
    metrics,
    filteredInterviews,
    // filters
    searchQuery,
    setSearchQuery,
    filterDecision,
    setFilterDecision,
    sortOrder,
    setSortOrder,
  };
}
