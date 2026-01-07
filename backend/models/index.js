const sequelize = require('../config/database');
const User = require('./User');
const Supplier = require('./Supplier');
const Category = require('./Category');
const Item = require('./Item');
const Warehouse = require('./Warehouse');
const StockLocation = require('./StockLocation');
const TransferOrder = require('./TransferOrder');
const PurchaseRequest = require('./PurchaseRequest');
const PurchaseOrder = require('./PurchaseOrder');
const SupplierItem = require('./SupplierItem');
const GRN = require('./GRN');

// Define associations
User.hasOne(Supplier, { foreignKey: 'userId', as: 'supplierProfile' });
Supplier.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Category-Item associations
Category.hasMany(Item, { foreignKey: 'categoryId', as: 'items' });
Item.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

// User-Category associations
Category.belongsTo(User, { foreignKey: 'createdById', as: 'createdBy' });

// User-Item associations
Item.belongsTo(User, { foreignKey: 'createdById', as: 'createdBy' });
Item.belongsTo(User, { foreignKey: 'updatedById', as: 'updatedBy' });

// Warehouse associations
Warehouse.belongsTo(User, { foreignKey: 'createdById', as: 'createdBy' });
Warehouse.hasMany(StockLocation, { foreignKey: 'warehouseId', as: 'stockLocations' });

// StockLocation associations
StockLocation.belongsTo(Warehouse, { foreignKey: 'warehouseId', as: 'warehouse' });
StockLocation.belongsTo(Item, { foreignKey: 'itemId', as: 'item' });
StockLocation.belongsTo(User, { foreignKey: 'createdById', as: 'createdBy' });
StockLocation.belongsTo(User, { foreignKey: 'updatedById', as: 'updatedBy' });

// Item has many stock locations
Item.hasMany(StockLocation, { foreignKey: 'itemId', as: 'stockLocations' });

// Item-Supplier preferred supplier association
Item.belongsTo(Supplier, { foreignKey: 'preferredSupplierId', as: 'preferredSupplier' });
Supplier.hasMany(Item, { foreignKey: 'preferredSupplierId', as: 'preferredItems' });

// TransferOrder associations
TransferOrder.belongsTo(Warehouse, { foreignKey: 'fromWarehouseId', as: 'fromWarehouse' });
TransferOrder.belongsTo(Warehouse, { foreignKey: 'toWarehouseId', as: 'toWarehouse' });
TransferOrder.belongsTo(Item, { foreignKey: 'itemId', as: 'item' });
TransferOrder.belongsTo(User, { foreignKey: 'requestedById', as: 'requestedBy' });
TransferOrder.belongsTo(User, { foreignKey: 'approvedById', as: 'approvedBy' });
TransferOrder.belongsTo(User, { foreignKey: 'completedById', as: 'completedBy' });
TransferOrder.belongsTo(User, { foreignKey: 'cancelledById', as: 'cancelledBy' });

// Purchase Request associations
PurchaseRequest.belongsTo(Item, { foreignKey: 'itemId', as: 'item' });
PurchaseRequest.belongsTo(Warehouse, { foreignKey: 'warehouseId', as: 'warehouse' });
PurchaseRequest.belongsTo(User, { foreignKey: 'requestedById', as: 'requestedBy' });
PurchaseRequest.belongsTo(User, { foreignKey: 'approvedById', as: 'approvedBy' });
PurchaseRequest.belongsTo(Supplier, { foreignKey: 'preferredSupplierId', as: 'preferredSupplier' });
PurchaseRequest.hasOne(PurchaseOrder, { foreignKey: 'prId', as: 'purchaseOrder' });

// Purchase Order associations
PurchaseOrder.belongsTo(PurchaseRequest, { foreignKey: 'prId', as: 'purchaseRequest' });
PurchaseOrder.belongsTo(Supplier, { foreignKey: 'supplierId', as: 'supplier' });
PurchaseOrder.belongsTo(Item, { foreignKey: 'itemId', as: 'item' });
PurchaseOrder.belongsTo(Warehouse, { foreignKey: 'warehouseId', as: 'warehouse' });
PurchaseOrder.belongsTo(User, { foreignKey: 'createdById', as: 'createdBy' });
PurchaseOrder.belongsTo(User, { foreignKey: 'approvedById', as: 'approvedBy' });
PurchaseOrder.hasOne(GRN, { foreignKey: 'poId', as: 'grn' });

// GRN associations
GRN.belongsTo(PurchaseOrder, { foreignKey: 'poId', as: 'purchaseOrder' });
GRN.belongsTo(Item, { foreignKey: 'itemId', as: 'item' });
GRN.belongsTo(Warehouse, { foreignKey: 'warehouseId', as: 'warehouse' });
GRN.belongsTo(User, { foreignKey: 'receivedById', as: 'receivedBy' });
GRN.belongsTo(User, { foreignKey: 'approvedById', as: 'approvedBy' });

// ✅ CORRECT: Many-to-Many Supplier-Item Relationships
Supplier.belongsToMany(Item, { 
  through: SupplierItem, 
  foreignKey: 'supplierId', 
  otherKey: 'itemId',
  as: 'suppliedItems' 
});
Item.belongsToMany(Supplier, { 
  through: SupplierItem, 
  foreignKey: 'itemId', 
  otherKey: 'supplierId',
  as: 'suppliers' 
});

// Direct associations for easier querying
SupplierItem.belongsTo(Supplier, { foreignKey: 'supplierId', as: 'supplier' });
SupplierItem.belongsTo(Item, { foreignKey: 'itemId', as: 'item' });
Supplier.hasMany(SupplierItem, { foreignKey: 'supplierId', as: 'supplierItems' });
Item.hasMany(SupplierItem, { foreignKey: 'itemId', as: 'itemSuppliers' });

// Export all models and sequelize instance
module.exports = {
  sequelize,
  User,
  Supplier,
  Category,
  Item,
  Warehouse,
  StockLocation,
  TransferOrder,
  PurchaseRequest,
  PurchaseOrder,
  SupplierItem,
  GRN
};