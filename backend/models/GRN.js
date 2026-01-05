const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const GRN = sequelize.define('GRN', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  poId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'pos',
      key: 'id'
    }
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'inventory',
      key: 'id'
    }
  },
  quantityReceived: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  batchNumber: {
    type: DataTypes.STRING
  },
  expiryDate: {
    type: DataTypes.DATE
  },
  receivedById: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('Received', 'Pending'),
    defaultValue: 'Received'
  }
}, {
  timestamps: true,
  tableName: 'grns'
});

module.exports = GRN;
