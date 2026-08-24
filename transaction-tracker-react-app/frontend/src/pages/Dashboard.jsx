import React, { useState } from "react";
import LandingScreen from "./LandingScreen";
import UploadScreen from "./UploadScreen";
import TransactionSummaryView from "../components/summary/TransactionSummaryView";
import TrendAnalysis from "../components/TrendAnalysis";
import ChatWindow from "../components/ChatWindow";
import { uploadTransactions,saveTransactions } from "../api/transactionsApi";
import LoadingOverlay from "../components/LoadingOverlay";
import { Box, Tooltip, IconButton } from "@mui/material";
import SmartToyIcon from "@mui/icons-material/SmartToy";

export default function Dashboard() {
  const [activeScreen, setActiveScreen] = useState("landing");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState("");
  const [chatOpen, setChatOpen] = useState(false);

  const handleViewTransactionsClick = () => setActiveScreen("past");
  const handleViewTrendsClick = () => setActiveScreen("trends");
  const handleBackToDashboard = () => setActiveScreen("landing");


  return (
    <>
      {activeScreen === "landing" && (
        <LandingScreen
          onViewTransactionsClick={handleViewTransactionsClick}
          onViewTrendsClick={handleViewTrendsClick}
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

      {activeScreen === "trends" && (
        <Box>
          <Box sx={{ p: 2, display: "flex", justifyContent: "flex-start" }}>
            <button 
              onClick={handleBackToDashboard}
              style={{
                padding: "8px 16px",
                backgroundColor: "#f0f0f0",
                border: "1px solid #ccc",
                borderRadius: "4px",
                cursor: "pointer"
              }}
            >
              ← Back to Landing
            </button>
          </Box>
          <TrendAnalysis onLoadingChange={setLoading} />
        </Box>
      )}

      {/* Chat Button (Floating Action Button) */}
      <Tooltip title="Open AI Chat Assistant">
        <IconButton
          onClick={() => setChatOpen(!chatOpen)}
          sx={{
            position: "fixed",
            bottom: 30,
            right: 30,
            backgroundColor: "primary.main",
            color: "#fff",
            width: 56,
            height: 56,
            display: chatOpen ? "none" : "flex",
            "&:hover": {
              backgroundColor: "primary.dark",
              transform: "scale(1.1)"
            },
            transition: "all 0.3s ease",
            zIndex: 1200,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
          }}
        >
          <SmartToyIcon />
        </IconButton>
      </Tooltip>

      {/* Chat Window */}
      {chatOpen && (
        <ChatWindow onClose={() => setChatOpen(false)} />
      )}
    </>
  );
}