import React from "react";
import {
  Button,
  Container,
  Typography,
  Box,
  Paper,
  Avatar,
  Grid,
} from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import config from "../config/config";
import brandingImage from "../assets/images/branding/branding-image.jpg";

const LoginPage = () => {
  const loginWithGoogle = () => {
    window.location.href = `${config.API_BASE}/oauth2/authorization/google`;
  };

  return (
    <Grid container sx={{ minHeight: "100vh" }}>
      {/* Left Branding Section */}
      <Grid
        item
        xs={12}
        md={6}
        sx={{
          bgcolor: "#f8f9fa",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 4,
        }}
      >
        <Box sx={{ textAlign: "center", maxWidth: 480 }}>
          <img
            src={brandingImage} // replace with your AWS-style illustration
            alt="Branding"
            style={{ width: "100%", maxHeight: 300, marginBottom: 24 }}
          />
          <Typography
            variant="h4"
            sx={{ fontWeight: 600, color: "#232F3E", mb: 2 }}
          >
            Track Your Spending with Clarity
          </Typography>
          <Typography variant="body1" sx={{ color: "#545B64" }}>
            A secure, dashboard to help you chase down your money trail
            and stay in control.
          </Typography>
        </Box>
      </Grid>

      {/* Right Login Section */}
      <Grid
        item
        xs={12}
        md={6}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "#fff",
        }}
      >
        <Paper
          elevation={2}
          sx={{
            p: 5,
            textAlign: "center",
            borderRadius: 2,
            width: "100%",
            maxWidth: 420,
          }}
        >
          {/* Logo / Avatar */}
          <Avatar
            sx={{
              bgcolor: "#FF9900",
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
            variant="h5"
            gutterBottom
            sx={{ fontWeight: 600, color: "#232F3E" }}
          >
            Where’s My Money At?
          </Typography>

          {/* Subtitle */}
          <Typography variant="body1" sx={{ mb: 4, color: "#545B64" }}>
            Sign in to track your spending and take control of your wallet
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
                fontSize: "15px",
                px: 4,
                py: 1.2,
                borderRadius: 2,
                boxShadow: "none",
                "&:hover": {
                  backgroundColor: "#357ae8",
                },
              }}
            >
              Login with Google
            </Button>
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default LoginPage;