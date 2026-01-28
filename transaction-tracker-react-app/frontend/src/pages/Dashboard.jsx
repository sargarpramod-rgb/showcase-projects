import React, { useState } from "react";
import LandingScreen from "./LandingScreen";
import UploadScreen from "./UploadScreen";
import TransactionSummaryView from "../components/summary/TransactionSummaryView";
import { uploadTransactions } from "../api/transactionsApi";
import LoadingOverlay from "../components/LoadingOverlay";

export default function Dashboard() {
  // Default state is "landing"
  const [activeScreen, setActiveScreen] = useState("landing");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState("");

  const handleViewTransactionsClick = () => setActiveScreen("past");
  const handleSaveAndClose = () => setActiveScreen("landing");
  const handleBackToDashboard = () => setActiveScreen("landing");

 console.log(data)

  return (
    <>
      {activeScreen === "landing" && (
        <LandingScreen
          onViewTransactionsClick={handleViewTransactionsClick}
          onLoadingChange={setLoading}
          onDataChange={setData}
          onActiveScreen={setActiveScreen}
        />
      )}

     <LoadingOverlay loading={loading} message="Uploading…" />

      {activeScreen === "upload" && (
        <UploadScreen
          onSave={handleSaveAndClose}
          onBack={handleBackToDashboard}
          data={data}
          setData={setData}
        />
      )}

      {activeScreen === "past" && (
        <TransactionSummaryView
            onBack={handleBackToDashboard}
            onLoadingChange={handleBackToDashboard}
        />
      )}
    </>
  );
}