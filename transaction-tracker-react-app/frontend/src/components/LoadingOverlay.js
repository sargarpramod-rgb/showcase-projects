import CircularProgress from "@mui/material/CircularProgress";
import Backdrop from "@mui/material/Backdrop";
import { Typography } from "@mui/material";

export default function LoadingOverlay({loading, message = "Loading…"}) {

return (
           <Backdrop
                         sx={{
                           color: "#fff",
                           zIndex: (theme) => theme.zIndex.drawer + 1,
                           flexDirection: "column", // stack spinner + text vertically
                         }}
                         open={loading}
                       >
                         <CircularProgress color="inherit" />
                         <Typography variant="h6" sx={{ mt: 2 }}>
                           {message}
                         </Typography>
                       </Backdrop>
    );
}