// Stock calculation utilities

/**
 * Calculate the effective minimum stock threshold
 * @param {Object} stockLocation - Stock location object
 * @param {Object} item - Item object with reorderPoint (already includes safetyStock)
 * @returns {number} Effective minimum threshold
 */
export const calculateEffectiveMinimum = (stockLocation, item) => {
  // Item-level reorder threshold: reorderPoint (already includes safetyStock in scientific formula)
  const itemReorderThreshold = item?.reorderPoint || 0;
  
  // Location-level minimum
  const locationMinStock = stockLocation?.minStock || 0;
  
  // Use the higher of the two (more conservative approach)
  return Math.max(locationMinStock, itemReorderThreshold);
};

/**
 * Determine stock status based on current stock and effective minimum
 * @param {Object} stockLocation - Stock location object
 * @param {Object} item - Item object with reorderPoint and safetyStock
 * @returns {string} Stock status: 'out_of_stock', 'very_low_stock', 'low_stock', or 'sufficient'
 */
export const getStockStatus = (stockLocation, item) => {
  const currentStock = stockLocation?.currentStock || 0;
  const effectiveMinimum = calculateEffectiveMinimum(stockLocation, item);
  
  if (currentStock === 0) {
    return 'out_of_stock';
  } else if (currentStock <= (effectiveMinimum * 0.5)) {
    return 'very_low_stock';
  } else if (currentStock <= effectiveMinimum) {
    return 'low_stock';
  } else {
    return 'sufficient';
  }
};

/**
 * Get stock status display information
 * @param {string} status - Stock status from getStockStatus
 * @returns {Object} Display information with label, color classes, etc.
 */
export const getStockStatusDisplay = (status) => {
  switch (status) {
    case 'out_of_stock':
      return {
        label: 'Out of Stock',
        bgColor: 'bg-red-100',
        textColor: 'text-red-800',
        rowBgColor: 'bg-red-100'
      };
    case 'very_low_stock':
      return {
        label: 'Very Low Stock',
        bgColor: 'bg-yellow-200',
        textColor: 'text-yellow-700',
        rowBgColor: 'bg-yellow-100'
      };
    case 'low_stock':
      return {
        label: 'Low Stock',
        bgColor: 'bg-yellow-100',
        textColor: 'text-yellow-800',
        rowBgColor: 'bg-yellow-50'
      };
    case 'sufficient':
      return {
        label: 'Sufficient Stock',
        bgColor: 'bg-green-100',
        textColor: 'text-green-800',
        rowBgColor: ''
      };
    default:
      return {
        label: 'Unknown',
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-800',
        rowBgColor: ''
      };
  }
};

/**
 * Calculate urgency level based on stock status
 * @param {Object} stockLocation - Stock location object
 * @param {Object} item - Item object with reorderPoint and safetyStock
 * @returns {string} Urgency level: 'urgent', 'high', 'medium', or 'low'
 */
export const calculateUrgencyLevel = (stockLocation, item) => {
  const currentStock = stockLocation?.currentStock || 0;
  const effectiveMinimum = calculateEffectiveMinimum(stockLocation, item);
  
  if (currentStock === 0) {
    return 'urgent';        // OUT OF STOCK - Emergency!
  } else if (currentStock <= (effectiveMinimum * 0.5)) {
    return 'high';            // Very low - Priority
  } else if (currentStock <= effectiveMinimum) {
    return 'medium';          // Low - Standard
  } else {
    return 'low';             // Above threshold - No urgency
  }
};

/**
 * Calculate total stock metrics for multiple locations
 * @param {Array} locations - Array of stock location objects
 * @returns {Object} Aggregated stock metrics
 */
export const calculateTotalStockMetrics = (locations) => {
  const totalStock = locations.reduce((sum, loc) => sum + (loc.currentStock || 0), 0);
  const totalLocationMinStock = locations.reduce((sum, loc) => sum + (loc.minStock || 0), 0);
  const totalMaxStock = locations.reduce((sum, loc) => sum + (loc.maxStock || 0), 0);
  
  // Calculate total effective minimum using item reorder settings
  const totalEffectiveMinimum = locations.reduce((sum, loc) => {
    const effectiveMin = calculateEffectiveMinimum(loc, loc.item);
    return sum + effectiveMin;
  }, 0);
  
  const utilizationPercent = totalMaxStock > 0 ? Math.round((totalStock / totalMaxStock) * 100) : 0;
  const availableSpace = totalMaxStock - totalStock;
  
  // Determine overall status
  let overallStatus = 'sufficient';
  if (totalStock === 0) {
    overallStatus = 'out_of_stock';
  } else if (totalStock <= (totalEffectiveMinimum * 0.5)) {
    overallStatus = 'very_low_stock';
  } else if (totalStock <= totalEffectiveMinimum) {
    overallStatus = 'low_stock';
  }
  
  return {
    totalStock,
    totalLocationMinStock,
    totalEffectiveMinimum,
    totalMaxStock,
    availableSpace,
    utilizationPercent,
    overallStatus
  };
};