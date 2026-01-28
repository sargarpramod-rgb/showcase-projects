
// Convert "dd-mm-yyyy" (or with time) → "Month-Year"
export const formatMonthYear = (dateStr)=> {
  // Take only the dd-mm-yyyy part
   if (!dateStr) return "";

    // Example input: "10/03/25"
    const [day, month, yearTwoDigits] = dateStr.split("/");

    // Convert 2-digit year → 4-digit year
    const year = parseInt(yearTwoDigits, 10);
    const fullYear = year < 50 ? 2000 + year : 1900 + year;
    // ⚡ Adjust cutoff as needed (here: 00–49 → 2000s, 50–99 → 1900s)

    const jsDate = new Date(`${fullYear}-${month}-${day}`);
    if (isNaN(jsDate)) return "";

    const monthNames = [
      "January","February","March","April","May","June",
      "July","August","September","October","November","December"
    ];

    return `${monthNames[jsDate.getMonth()]}-${jsDate.getFullYear()}`;

};


// Extract unique month-year strings from aggregated transactions
export const getUniqueMonthYears = (aggregatedData) => {
  return [
    ...new Set(
      aggregatedData.flatMap(item =>
        Array.isArray(item.transactions)
          ? item.transactions.map(txn => formatMonthYear(txn.date))
          : []
      )
    )
  ];
};

// Generate label for selected period
export const getPeriodLabel = (aggregatedData) => {
  const uniqueMonthYears = getUniqueMonthYears(aggregatedData);
  return uniqueMonthYears.length > 0
    ? uniqueMonthYears.join(", ")
    : "Selected Period";
};