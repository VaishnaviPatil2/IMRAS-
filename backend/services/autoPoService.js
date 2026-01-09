const { StockLocation, Item, Warehouse, Supplier, PurchaseRequest, PurchaseOrder, User } = require('../models');

async function checkLowStockAndGeneratePR() {
  try {
    console.log('Checking for low stock items and generating PRs...');
    
    const allStockLocations = await StockLocation.findAll({
      where: { isActive: true },
      include: [
        {
          model: Item,
          as: 'item',
          where: { isActive: true },
          attributes: ['id', 'sku', 'name', 'reorderPoint', 'safetyStock', 'leadTimeDays', 'dailyConsumption', 'unitPrice']
        },
        {
          model: Warehouse,
          as: 'warehouse',
          where: { isActive: true }
        }
      ]
    });

    const lowStockLocations = allStockLocations.filter(location => {
      const item = location.item;
      const itemReorderThreshold = item.reorderPoint || 0;
      const effectiveMinimum = Math.max(location.minStock || 0, itemReorderThreshold);
      return location.currentStock <= effectiveMinimum;
    });

    console.log(Found  low stock locations);
    return { success: true, processedLocations: lowStockLocations.length };

  } catch (error) {
    console.error('Error in checkLowStockAndGeneratePR:', error);
    throw error;
  }
}

module.exports = {
  checkLowStockAndGeneratePR
};
