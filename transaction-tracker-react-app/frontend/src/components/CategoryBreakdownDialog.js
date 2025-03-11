import { Table, TableBody, TableCell, TableContainer, Button,TableHead, TableRow, Paper  } from "@mui/material";
import { Dialog,DialogActions, DialogContent, DialogTitle,Grid} from "@mui/material";
import { PieChart, Pie, Cell, Tooltip, Legend,ResponsiveContainer, BarChart,XAxis,YAxis,Bar } from "recharts";

export default function CategoryBreakdownDialog({ openChartDialog,handleCloseChartDialog,handleCategoryClick,selectedCategory,
            aggregatedData}) {

   const categorySums = aggregatedData.reduce((acc, row) => {
     if (!row.transactions[0].category) return acc;
     acc[row.transactions[0].category] = (acc[row.transactions[0].category] || 0) + Math.abs(row.totalAmount.toFixed(2));
     console.log("category sum " + acc[row.transactions[0].category])
     return acc;
   }, {});


   const totalAmount = Object.values(categorySums).reduce((sum, value) => sum + value, 0);
   const chartData = Object.entries(categorySums).map(([category, amount]) => ({
     name: category,
     value: amount,
     percentage: ((amount / totalAmount) * 100).toFixed(2) + "%"
   }));

   const subcategorySums = aggregatedData.reduce((acc, row) => {
     if (row.transactions[0].category === selectedCategory) {
       acc[row.transactions[0].subcategory] = (acc[row.transactions[0].subcategory] || 0) + Math.abs(row.totalAmount.toFixed(2));
     }
     return acc;
   }, {});

   const subChartData = Object.entries(subcategorySums)
     .map(([subcategory, amount]) => ({ name: subcategory, value: amount }))
     .sort((a, b) => b.value - a.value)
     .slice(0, 10);

      const colors = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#8dd1e1"];
      const barColors = ["#1f77b4", "#ff7f0e", "#2ca02c"]

return (
        <Dialog open={openChartDialog} onClose={handleCloseChartDialog} maxWidth="md" fullWidth>
          <DialogTitle>{selectedCategory ? `${selectedCategory} Breakdown` : "Category Breakdown"}</DialogTitle>
          <DialogContent>
           <Grid container spacing={2}>
           <Grid item xs={6}>
            <PieChart width={400} height={300}>
                <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                outerRadius={120} label={(entry) => entry.percentage}
                onClick={(data, index) => {
                   console.log("Clicked category:", data.name); // Debugging
                   handleCategoryClick(data);
                   }}>
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]}  />
                  ))}
                  animationDuration={800}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
             </Grid>
            {selectedCategory && (
                        <Grid item xs={6}>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={subChartData} barSize={15} barCategoryGap={5}
                             margin={{top: 5, right: 30, left: 20, bottom: 5,}}>
                              <XAxis dataKey="name" />
                              <YAxis domain={[0, 'dataMax + 10']} />
                              <Tooltip />
                              <Bar dataKey="value"
                                fill="#00a0fc"
                                stroke="#000000"
                                strokeWidth={1}>
                                {
                                subChartData.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]}  />
                                ))
                                }
                                </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </Grid>
                      )}
                    </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseChartDialog} color="primary">Close</Button>
          </DialogActions>
        </Dialog>
    );
}