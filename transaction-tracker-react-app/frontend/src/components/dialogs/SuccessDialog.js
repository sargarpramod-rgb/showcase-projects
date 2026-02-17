import { Alert, AlertTitle, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

export default function SuccessDialog({ isSaved, setIsSaved, setActiveScreen }) {
  if (!isSaved) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1300, // above app bar
        display: "flex",
        justifyContent: "center",
        padding: "8px",
      }}
    >
      <Alert
        severity="success"
        sx={{ width: "100%", maxWidth: 600 }}
        action={
          <IconButton
            aria-label="close"
            color="inherit"
            size="small"
            onClick={() => {
              setIsSaved(false);
              setActiveScreen("landing");
            }}
          >
            <CloseIcon fontSize="inherit" />
          </IconButton>
        }
      >
        <AlertTitle>Success</AlertTitle>
        Transactions saved successfully!
      </Alert>
    </div>
  );
}