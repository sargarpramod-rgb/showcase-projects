import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Divider,
  CircularProgress,
  Tooltip,
  Card,
  CardContent,
  Collapse,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import { sendChatQuery } from "../api/transactionsApi";

export default function ChatWindow({ onClose }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm your AI assistant powered by MCP server. Ask me about your transactions.",
      sender: "bot",
      timestamp: new Date(),
      expandedTrace: false
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = {
      id: messages.length + 1,
      text: inputValue,
      sender: "user",
      timestamp: new Date(),
      expandedTrace: false
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setLoading(true);
    setError(null);

    try {
      const response = await sendChatQuery(inputValue);
      
      // Extract answer from response (handles new format with answer, trace, error fields)
      const answer = response.answer || response.response || response.message || "I received your message, but couldn't generate a response.";
      
      const botMessage = {
        id: messages.length + 2,
        text: answer,
        sender: "bot",
        timestamp: new Date(),
        expandedTrace: false,
        trace: response.trace,
        error: response.error,
        queryType: response.query_type,
        classification: response.classification
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      console.error("Chat error:", err);
      setError(err.message);
      
      // Generate user-friendly error message
      let errorText = "AI Service unavailable at the time. Please try again later.";
      
      if (err.message === "SERVICE_UNAVAILABLE") {
        errorText = "🔌 AI Service unavailable at the time. Please check if the service is running.";
      } else if (err.message.startsWith("HTTP_ERROR")) {
        errorText = "🔌 AI Service is experiencing issues. Please try again in a moment.";
      } else if (err.message === "SERVICE_ERROR") {
        errorText = "🔌 Unable to connect to AI Service. Please try again later.";
      }
      
      const errorMessage = {
        id: messages.length + 2,
        text: errorText,
        sender: "bot",
        timestamp: new Date(),
        expandedTrace: false,
        isError: true
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleTraceExpanded = (messageId) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, expandedTrace: !msg.expandedTrace }
          : msg
      )
    );
  };

  const renderMessageTrace = (msg) => {
    if (!msg.trace) return null;

    const { total_duration_ms, steps } = msg.trace;

    return (
      <Box sx={{ mt: 1.5, pt: 1.5, borderTop: "1px solid rgba(0,0,0,0.1)" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 600, opacity: 0.8 }}>
            📊 MCP Server Trace
          </Typography>
          <Chip
            label={`${total_duration_ms}ms`}
            size="small"
            variant="outlined"
            sx={{ height: 20, fontSize: "0.7rem" }}
          />
        </Box>

        <TableContainer sx={{ maxHeight: 200, overflow: "auto", mb: 1 }}>
          <Table size="small" sx={{ "& .MuiTableCell-root": { p: 0.75, fontSize: "0.75rem" } }}>
            <TableHead sx={{ backgroundColor: "rgba(0,0,0,0.05)" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Step</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {steps.map((step, idx) => (
                <TableRow key={idx} sx={{ backgroundColor: step.status === "error" ? "rgba(244, 67, 54, 0.05)" : "transparent" }}>
                  <TableCell sx={{ fontFamily: "monospace" }}>{step.step}</TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      {step.status === "success" ? (
                        <CheckCircleIcon sx={{ fontSize: 14, color: "success.main" }} />
                      ) : (
                        <ErrorIcon sx={{ fontSize: 14, color: "error.main" }} />
                      )}
                      <span>{step.status}</span>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ fontSize: "0.7rem", opacity: 0.7 }}>
                    {step.intent && `Intent: ${step.intent}`}
                    {step.error && `Error: ${step.error}`}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {msg.error && (
          <Typography variant="caption" sx={{ color: "error.main", display: "block" }}>
            ⚠️ {msg.error}
          </Typography>
        )}
      </Box>
    );
  };

  return (
    <Paper
      elevation={3}
      sx={{
        position: "fixed",
        bottom: 20,
        right: 20,
        width: 400,
        maxHeight: 600,
        display: "flex",
        flexDirection: "column",
        borderRadius: 2,
        boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
        zIndex: 1300,
        backgroundColor: "#fff"
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          backgroundColor: "primary.main",
          color: "#fff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderRadius: "8px 8px 0 0"
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          🤖 AI Assistant
        </Typography>
        <Tooltip title="Close chat">
          <IconButton
            size="small"
            onClick={onClose}
            sx={{ color: "#fff", "&:hover": { backgroundColor: "rgba(255,255,255,0.1)" } }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Divider />

      {/* Messages Container */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          p: 2,
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
          backgroundColor: "#f9f9f9"
        }}
      >
        {messages.map((msg) => (
          <Box
            key={msg.id}
            sx={{
              display: "flex",
              justifyContent: msg.sender === "user" ? "flex-end" : "flex-start"
            }}
          >
            <Card
              sx={{
                maxWidth: "85%",
                backgroundColor: msg.sender === "user" ? "primary.main" : msg.isError ? "#ffebee" : "#e3f2fd",
                color: msg.sender === "user" ? "#fff" : msg.isError ? "error.main" : "text.primary",
                borderRadius: msg.sender === "user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                cursor: msg.trace ? "pointer" : "default"
              }}
              onClick={msg.trace ? () => toggleTraceExpanded(msg.id) : undefined}
            >
              <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
                  {msg.text}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    display: "block",
                    mt: 0.5,
                    opacity: 0.7,
                    fontSize: "0.7rem"
                  }}
                >
                  {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Typography>

                {/* Show trace expand button */}
                {msg.trace && (
                  <Box sx={{ mt: 1, display: "flex", alignItems: "center", gap: 0.5, cursor: "pointer" }}>
                    <Typography variant="caption" sx={{ fontSize: "0.65rem", fontWeight: 600, opacity: 0.8 }}>
                      {msg.expandedTrace ? "Hide" : "Show"} trace
                    </Typography>
                    {msg.expandedTrace ? (
                      <ExpandLessIcon sx={{ fontSize: 14 }} />
                    ) : (
                      <ExpandMoreIcon sx={{ fontSize: 14 }} />
                    )}
                  </Box>
                )}

                {/* Render trace if expanded */}
                <Collapse in={msg.expandedTrace}>
                  {renderMessageTrace(msg)}
                </Collapse>
              </CardContent>
            </Card>
          </Box>
        ))}

        {/* Loading indicator */}
        {loading && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-start",
              alignItems: "center",
              gap: 1
            }}
          >
            <CircularProgress size={24} />
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              AI is thinking (this may take a moment with local models)...
            </Typography>
          </Box>
        )}

        <div ref={messagesEndRef} />
      </Box>

      <Divider />

      {/* Input Area */}
      <Box sx={{ p: 2, display: "flex", gap: 1, alignItems: "flex-end" }}>
        <TextField
          fullWidth
          multiline
          maxRows={3}
          minRows={1}
          placeholder="Ask anything... (Shift+Enter for new line)"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading}
          size="small"
          variant="outlined"
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 1
            }
          }}
        />
        <Tooltip title={loading ? "Waiting for response..." : "Send message"}>
          <span>
            <IconButton
              onClick={handleSendMessage}
              disabled={loading || !inputValue.trim()}
              color="primary"
              sx={{
                "&:disabled": { opacity: 0.5 }
              }}
            >
              <SendIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    </Paper>
  );
}
