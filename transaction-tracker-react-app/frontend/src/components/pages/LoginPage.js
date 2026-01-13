import React from "react";
import { Button, Container, Typography, Box, Paper } from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";
import config from "../../config";

const LoginPage = () => {
  const loginWithGoogle = () => {
    window.location.href =
      `${config.API_BASE}/oauth2/authorization/google`;
  };

  return (
    <Container maxWidth="sm">
      <Paper
        elevation={6}
        sx={{
          mt: 12,
          p: 6,
          textAlign: "center",
          borderRadius: 3,
          background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
        }}
      >
        <Typography
          variant="h4"
          gutterBottom
          sx={{ fontWeight: "bold", color: "#333" }}
        >
          Expense Tracker
        </Typography>

        <Typography variant="subtitle1" sx={{ mb: 4, color: "#555" }}>
          Sign in to manage your expenses effortlessly
        </Typography>

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
              px: 3,
              py: 1.5,
              borderRadius: 2,
              "&:hover": {
                backgroundColor: "#357ae8",
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