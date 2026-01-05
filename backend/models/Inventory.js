const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Inventory = sequelize.define('Inventory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  productName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  reorderLevel: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  safetyStock: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  supplierEmail: {
    type: DataTypes.STRING,
    allowNull: false
  },
  sku: {
    type: DataTypes.STRING,
    unique: true
  },
  lastUpdated: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  batchNumber: {
    type: DataTypes.STRING
  },
  expiryDate: {
    type: DataTypes.DATE
  },
  location: {
    type: DataTypes.STRING
  },
  warehouse: {
    type: DataTypes.STRING
  },
  serialNumber: {
    type: DataTypes.STRING
  }
}, {
  timestamps: true,
  tableName: 'inventory',
  hooks: {
    beforeUpdate: (inventory, options) => {
      if (inventory.changed('quantity')) {
        inventory.lastUpdated = new Date();
      }
    }
  }
});

module.exports = Inventory;
