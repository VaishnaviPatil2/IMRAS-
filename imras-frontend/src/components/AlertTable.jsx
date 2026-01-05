import React from "react";

const AlertTable = ({ title, items, type }) => {
  // Determine status text and color
  const getStatusInfo = (item, type) => {
    if (type === "lowStock") {
      if (item.currentStock === 0)
        return { status: "Out of Stock", statusColor: "bg-red-500 text-white" };
      if (item.currentStock <= item.minStock)
        return { status: "Low Stock", statusColor: "bg-yellow-500 text-white" };
      return { status: "Available", statusColor: "bg-green-500 text-white" };
    } else if (type === "reorder") {
      if (item.quantity === 0)
        return { status: "Out of Stock", statusColor: "bg-red-500 text-white" };
      if (item.quantity <= item.reorderLevel)
        return { status: "Low Stock", statusColor: "bg-yellow-500 text-white" };
      return { status: "Available", statusColor: "bg-green-500 text-white" };
    } else if (type === "expiry") {
      return { status: "Expiring", statusColor: "bg-orange-500 text-white" };
    }
    return { status: "N/A", statusColor: "bg-gray-300 text-black" };
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
      {/* HEADER */}
      <div className="flex justify-between items-center px-5 py-4 border-b bg-slate-50">
        <h3 className="font-semibold text-slate-700">{title}</h3>
        <span
          className={`text-xs font-semibold px-3 py-1 rounded-full ${
            items.length === 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}
        >
          {items.length} items
        </span>
      </div>

      {/* TABLE */}
      {items.length === 0 ? (
        <div className="p-6 text-sm text-slate-500 text-center">
          🎉 No alerts available
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-gray-100 text-slate-600">
              <tr>
                <th className="px-5 py-3">Item</th>
                <th className="px-3 py-3 text-center">Location</th>
                <th className="px-3 py-3 text-center">Current Stock</th>
                {type === "lowStock" && <th className="px-3 py-3 text-center">Min Stock</th>}
                {type === "reorder" && <th className="px-3 py-3 text-center">Reorder Level</th>}
                {type === "expiry" && <th className="px-3 py-3 text-center">Expiry Date</th>}
                <th className="px-5 py-3 text-right">Status</th>
              </tr>
            </thead>

            <tbody>
              {items.map((item) => {
                const { status, statusColor } = getStatusInfo(item, type);

                return (
                  <tr
                    key={item.id || item._id}
                    className="border-t hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-5 py-3 font-medium">
                      {type === "lowStock" ? item.item?.name : item.productName}
                    </td>
                    <td className="text-center">
                      {type === "lowStock" ? `${item.warehouse?.name} - ${item.locationCode}` : "N/A"}
                    </td>
                    <td className="text-center font-semibold">
                      {type === "lowStock" ? item.currentStock : item.quantity}
                    </td>
                    {type === "lowStock" && <td className="text-center">{item.minStock}</td>}
                    {type === "reorder" && <td className="text-center">{item.reorderLevel}</td>}
                    {type === "expiry" && (
                      <td className="text-center text-orange-600">
                        {item.expiryDate
                          ? new Date(item.expiryDate).toLocaleDateString()
                          : "N/A"}
                      </td>
                    )}
                    <td className="px-5 py-3 text-right">
                      <span
                        className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${statusColor}`}
                      >
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AlertTable;
