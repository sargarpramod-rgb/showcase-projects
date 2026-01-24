import React from "react";
import {
  Button,
  Container,
  Typography,
  Box,
  Paper,
  Avatar,
} from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import config from "../../config";

const LoginPage = () => {
  const loginWithGoogle = () => {
    window.location.href = `${config.API_BASE}/oauth2/authorization/google`;
  };

  return (
    <Container
      maxWidth="sm"
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
      }}
    >
      <Paper
        elevation={8}
        sx={{
          p: 6,
          textAlign: "center",
          borderRadius: 4,
          background: "linear-gradient(135deg, #fffbe6 0%, #f0f4c3 100%)",
        }}
      >
        {/* Logo / Avatar */}
        <Avatar
          sx={{
            bgcolor: "#ff9800",
            width: 64,
            height: 64,
            mx: "auto",
            mb: 2,
          }}
        >
          <AccountBalanceWalletIcon fontSize="large" />
        </Avatar>

        {/* Title */}
        <Typography
          variant="h4"
          gutterBottom
          sx={{ fontWeight: 700, color: "#ff9800" }}
        >
          Where’s My Money At?
        </Typography>

        {/* Subtitle */}
        <Typography variant="subtitle1" sx={{ mb: 4, color: "#666" }}>
          Sign in to chase down your spending and take control of your wallet
        </Typography>

        {/* Login Button */}
        <Box>
          <Button
            variant="contained"
            startIcon={<GoogleIcon />}
            onClick={loginWithGoogle}
            sx={{
              backgroundColor: "#4285F4",
              color: "#fff",
              textTransform: "none",
              fontSize: "16px",
              px: 4,
              py: 1.5,
              borderRadius: 3,
              boxShadow: "0px 4px 12px rgba(66, 133, 244, 0.4)",
              "&:hover": {
                backgroundColor: "#357ae8",
                boxShadow: "0px 6px 16px rgba(66, 133, 244, 0.5)",
              },
            }}
          >
            Login with Google
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default LoginPage;