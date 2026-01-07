import React, { useState } from "react";

const AlertTable = ({ title, items, type }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Calculate pagination
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = items.slice(startIndex, endIndex);

  // Reset to page 1 when items change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [items.length]);
  // Enhanced status calculation for low stock
  const getEnhancedStatusInfo = (item, type) => {
    if (type === "lowStock") {
      const currentStock = item.currentStock || 0;
      const minStock = item.minStock || 0;
      const itemReorderPoint = item.item?.reorderPoint || 0;
      // Use reorderPoint directly as it already includes safetyStock in scientific formula
      const effectiveMinimum = Math.max(minStock, itemReorderPoint);
      
      if (currentStock === 0) {
        return { 
          status: "Out of Stock", 
          statusColor: "bg-red-600 text-white",
          urgency: "URGENT",
          urgencyColor: "bg-red-100 text-red-800",
          effectiveMin: effectiveMinimum
        };
      } else if (currentStock <= (effectiveMinimum * 0.5)) {
        return { 
          status: "Very Low Stock", 
          statusColor: "bg-yellow-200 text-yellow-700",
          urgency: "HIGH",
          urgencyColor: "bg-yellow-200 text-yellow-700",
          effectiveMin: effectiveMinimum
        };
      } else if (currentStock <= effectiveMinimum) {
        return { 
          status: "Low Stock", 
          statusColor: "bg-yellow-100 text-yellow-800",
          urgency: "MEDIUM",
          urgencyColor: "bg-yellow-100 text-yellow-800",
          effectiveMin: effectiveMinimum
        };
      } else {
        return { 
          status: "Sufficient", 
          statusColor: "bg-green-100 text-green-800",
          urgency: "LOW",
          urgencyColor: "bg-green-100 text-green-800",
          effectiveMin: effectiveMinimum
        };
      }
    }
    
    // Fallback for other types
    if (item.quantity === 0)
      return { status: "Out of Stock", statusColor: "bg-red-500 text-white", urgency: "HIGH", urgencyColor: "bg-red-100 text-red-800" };
    if (item.quantity <= item.reorderLevel)
      return { status: "Low Stock", statusColor: "bg-yellow-500 text-white", urgency: "MEDIUM", urgencyColor: "bg-yellow-100 text-yellow-800" };
    return { status: "Available", statusColor: "bg-green-500 text-white", urgency: "LOW", urgencyColor: "bg-green-100 text-green-800" };
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
                <th className="px-5 py-3">Item Details</th>
                <th className="px-3 py-3 text-center">Location</th>
                <th className="px-3 py-3 text-center">Current Stock</th>
                {type === "lowStock" && <th className="px-3 py-3 text-center">Threshold</th>}
                {type === "lowStock" && <th className="px-3 py-3 text-center">Urgency</th>}
                {type === "reorder" && <th className="px-3 py-3 text-center">Reorder Level</th>}
                {type === "expiry" && <th className="px-3 py-3 text-center">Expiry Date</th>}
                <th className="px-5 py-3 text-right">Status</th>
              </tr>
            </thead>

            <tbody>
              {currentItems.map((item) => {
                const statusInfo = getEnhancedStatusInfo(item, type);

                return (
                  <tr
                    key={type === "lowStock" ? `stock-${item.id}` : `item-${item._id || item.id}`}
                    className="border-t hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <div>
                        <div className="font-semibold text-gray-900">{type === "lowStock" ? item.item?.name : item.productName}</div>
                        <div className="text-xs text-gray-500">SKU: {type === "lowStock" ? item.item?.sku : 'N/A'}</div>
                        {type === "lowStock" && item.item?.category && (
                          <div className="text-xs text-blue-600">{item.item.category.name}</div>
                        )}
                      </div>
                    </td>
                    <td className="text-center">
                      <div className="text-sm font-medium">
                        {type === "lowStock" ? item.warehouse?.name : "N/A"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {type === "lowStock" ? (
                          item.locationCode || 
                          `${item.aisle || ''}-${item.rack || ''}-${item.bin || ''}`.replace(/^-+|-+$/g, '') || 
                          'No Location'
                        ) : ''}
                      </div>
                    </td>
                    <td className="text-center">
                      <span className={`text-lg font-bold ${
                        (type === "lowStock" ? item.currentStock : item.quantity) === 0 ? 'text-red-600' : 
                        (type === "lowStock" ? item.currentStock : item.quantity) <= (statusInfo.effectiveMin || item.minStock || item.reorderLevel || 0) ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {type === "lowStock" ? item.currentStock : item.quantity}
                      </span>
                    </td>
                    {type === "lowStock" && (
                      <td className="text-center">
                        <div className="text-blue-600 font-semibold">{statusInfo.effectiveMin}</div>
                        <div className="text-xs text-gray-500">
                          Max: {item.maxStock || 'N/A'}
                        </div>
                      </td>
                    )}
                    {type === "lowStock" && (
                      <td className="text-center">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusInfo.urgencyColor}`}>
                          {statusInfo.urgency}
                        </span>
                      </td>
                    )}
                    {type === "reorder" && <td className="text-center">{item.reorderLevel}</td>}
                    {type === "expiry" && (
                      <td className="text-center text-yellow-600">
                        {item.expiryDate
                          ? new Date(item.expiryDate).toLocaleDateString()
                          : "N/A"}
                      </td>
                    )}
                    <td className="px-5 py-3 text-right">
                      <span
                        className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${statusInfo.statusColor}`}
                      >
                        {statusInfo.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-5 py-4 border-t bg-slate-50 flex justify-between items-center">
          <div className="text-sm text-gray-700">
            Showing {startIndex + 1} to {Math.min(endIndex, items.length)} of {items.length} items
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertTable;