import React, { useState } from "react";
import LandingScreen from "./LandingScreen";
import UploadScreen from "./UploadScreen";
import TransactionSummaryView from "../components/summary/TransactionSummaryView";
import { uploadTransactions,saveTransactions } from "../api/transactionsApi";
import LoadingOverlay from "../components/LoadingOverlay";

export default function Dashboard() {
  const [activeScreen, setActiveScreen] = useState("landing");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState("");

  const handleViewTransactionsClick = () => setActiveScreen("past");
  const handleBackToDashboard = () => setActiveScreen("landing");


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
     <LoadingOverlay loading={saving} message="Saving Transactions…" />


      {activeScreen === "upload" && (
        <UploadScreen
          setActiveScreen={setActiveScreen}
          setSaving={setSaving}
          onBack={handleBackToDashboard}
          data={data}
          setData={setData}
        />
      )}

      {activeScreen === "past" && (
        <TransactionSummaryView
            onBack={handleBackToDashboard}
            onLoadingChange={setLoading}
        />
      )}
    </>
  );
}