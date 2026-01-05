const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SupplierItem = sequelize.define('SupplierItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  supplierId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'suppliers',
      key: 'id'
    }
  },
  itemId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'items',
      key: 'id'
    }
  },
  supplierSku: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Supplier\'s internal SKU for this item'
  },
  unitPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    validate: {
      min: 0
    }
  },
  minimumOrderQuantity: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    validate: {
      min: 1
    }
  },
  leadTimeDays: {
    type: DataTypes.INTEGER,
    defaultValue: 7,
    validate: {
      min: 0
    },
    comment: 'Item-specific lead time (overrides supplier default)'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  isPreferred: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Mark as preferred supplier for this item'
  },
  lastPriceUpdate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  timestamps: true,
  tableName: 'supplier_items',
  indexes: [
    {
      unique: true,
      fields: ['supplierId', 'itemId']
    },
    {
      fields: ['itemId', 'isActive', 'isPreferred']
    },
    {
      fields: ['supplierId', 'isActive']
    }
  ]
});

module.exports = SupplierItem;