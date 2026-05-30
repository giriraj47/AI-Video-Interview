import React from "react";
import useAdminData from "../hooks/useAdminData";
import AdminLoginGate from "../components/admin/AdminLoginGate";
import AdminHeader from "../components/admin/AdminHeader";
import AdminMetrics from "../components/admin/AdminMetrics";
import InterviewSidebar from "../components/admin/InterviewSidebar";
import InterviewDetail from "../components/admin/InterviewDetail";
import EmptyDetailState from "../components/admin/EmptyDetailState";

export default function AdminPage() {
  const {
    // auth
    isAuthorized,
    loading,
    error,
    passcodeVal,
    setPasscodeVal,
    handleManualLogin,
    logout,
    // data
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
  } = useAdminData();

  // 1. Lock-screen gate
  if (!isAuthorized) {
    return (
      <AdminLoginGate
        passcodeVal={passcodeVal}
        setPasscodeVal={setPasscodeVal}
        handleManualLogin={handleManualLogin}
        loading={loading}
        error={error}
      />
    );
  }

  // 2. Main dashboard
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      <AdminHeader logout={logout} />

      <main className="flex-1 flex flex-col overflow-hidden">
        <AdminMetrics metrics={metrics} />

        {/* Dual Panel Layout */}
        <section className="flex-1 flex overflow-hidden">
          <InterviewSidebar
            filteredInterviews={filteredInterviews}
            selectedInterview={selectedInterview}
            setSelectedInterview={setSelectedInterview}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filterDecision={filterDecision}
            setFilterDecision={setFilterDecision}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
          />

          <div className="flex-1 overflow-y-auto bg-slate-950 flex flex-col custom-scrollbar">
            {!selectedInterview ? (
              <EmptyDetailState />
            ) : (
              <InterviewDetail interview={selectedInterview} />
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
