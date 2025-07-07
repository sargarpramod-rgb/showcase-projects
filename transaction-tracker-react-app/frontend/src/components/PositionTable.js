// src/components/PositionTable.js

import React from "react";

const PositionTable = ({ positions }) => {
  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-2">Equity Positions</h2>
      <table className="w-full border border-gray-300">
        <thead className="bg-gray-200">
          <tr>
            <th>Security Code</th>
            <th>Net Quantity</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((pos) => (
            <tr key={pos.securityCode} className="text-center border-t">
              <td>{pos.securityCode}</td>
              <td className={pos.netQuantity >= 0 ? "text-green-600" : "text-red-600"}>
                {pos.netQuantity >= 0 ? `+${pos.netQuantity}` : pos.netQuantity}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PositionTable;
