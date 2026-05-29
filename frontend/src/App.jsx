import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { InterviewProvider } from "./context/InterviewContext";
import Layout from "./pages/Layout";
import SetupPage from "./components/SetupPage";
import InterviewPage from "./pages/InterviewPage";
import ResultsPage from "./components/ResultsPage";

function App() {
  return (
    <InterviewProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            {/* Redirect / to /setup initially */}
            <Route index element={<Navigate to="/setup" replace />} />
            <Route path="setup" element={<SetupPage />} />
            <Route path="interview" element={<InterviewPage />} />
            <Route path="result" element={<ResultsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </InterviewProvider>
  );
}

export default App;
