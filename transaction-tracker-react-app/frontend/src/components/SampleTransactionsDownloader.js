import React, { useState } from "react";

export default function SampleTransactionsDownloader() {

const files = [
        { path: "/Jan2025.txt", name: "Jan2025.txt" },
        { path: "/Feb2025.txt", name: "Feb2025.txt" }
      ];

      const handleDownloadAll = () => {
        files.forEach(file => {
          const link = document.createElement("a");
          link.href = file.path;
          link.download = file.name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        });
      };

 const buttonStyle = {
     background: "linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)",
     color: "white",
     padding: "12px 24px",
     border: "none",
     borderRadius: "8px",
     fontSize: "16px",
     fontWeight: "bold",
     cursor: "pointer",
     boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
     transition: "transform 0.2s ease, box-shadow 0.2s ease"
   };

   const buttonHover = {
     transform: "scale(1.05)",
     boxShadow: "0 6px 14px rgba(0,0,0,0.3)"
   };

   return (
     <div style={{ textAlign: "center", marginTop: "40px" }}>
       <h2 style={{ color: "#444" }}>Download Sample Transaction files</h2>
       <button
         style={buttonStyle}
         onMouseOver={e => Object.assign(e.target.style, buttonHover)}
         onMouseOut={e => Object.assign(e.target.style, buttonStyle)}
         onClick={handleDownloadAll}
       >
         📂 Download All
       </button>
     </div>
   );




}