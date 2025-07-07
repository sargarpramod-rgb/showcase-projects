import React from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";

/**
 * PositionTable component displays a table of equity positions.
 * It shows the security code and net quantity for each position.
 *
 * @param {object} props - The component props.
 * @param {Array<object>} props.positions - An array of position objects, each with `securityCode` and `netQuantity`.
 */
const PositionTable = ({ positions }) => {
  return (
    <Box sx={{ p: 3, bgcolor: "background.paper", borderRadius: 2, boxShadow: 3, mt: 3 }}>
      <Typography variant="h5" component="h2" sx={{ mb: 3, color: "text.primary" }}>
        Equity Positions
      </Typography>
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 400 }} size="small" aria-label="equity positions table">
          <TableHead sx={{ bgcolor: "primary.light" }}>
            <TableRow>
              <TableCell sx={{ fontWeight: "bold", textAlign: "center" }}>Security Code</TableCell>
              <TableCell sx={{ fontWeight: "bold", textAlign: "center" }}>Net Quantity</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {positions.map((pos, index) => (
              <TableRow
                key={pos.securityCode}
                sx={{
                  bgcolor: index % 2 === 0 ? "action.hover" : "background.paper", // Alternating row colors
                  "&:hover": {
                    bgcolor: "action.selected", // Hover effect
                  },
                  "&:last-child td, &:last-child th": { border: 0 }, // Remove bottom border for last row
                }}
              >
                <TableCell component="th" scope="row" align="center">
                  {pos.securityCode}
                </TableCell>
                <TableCell
                  align="center"
                  sx={{
                    fontWeight: "fontWeightSemibold",
                    color: pos.netQuantity >= 0 ? "success.main" : "error.main", // Green for positive, red for negative
                  }}
                >
                  {pos.netQuantity >= 0 ? `+${pos.netQuantity}` : pos.netQuantity}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default PositionTable;