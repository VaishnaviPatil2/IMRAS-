const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const GRN = sequelize.define('GRN', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  grnNumber: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true // Temporarily allow null to debug
  },
  poId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'purchase_orders',
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
  warehouseId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'warehouses',
      key: 'id'
    }
  },
  quantityOrdered: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  quantityReceived: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  batchNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  expiryDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  receivedById: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  approvedById: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  receivedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  timestamps: true,
  tableName: 'grns',
  hooks: {
    beforeCreate: async (grn, options) => {
      if (!grn.grnNumber) {
        try {
          // Use a more robust method to avoid duplicates during concurrent creation
          let attempts = 0;
          const maxAttempts = 10;
          
          while (attempts < maxAttempts) {
            // Get the highest existing GRN number
            const lastGRN = await GRN.findOne({
              order: [['id', 'DESC']],
              attributes: ['grnNumber'],
              transaction: options.transaction
            });
            
            let nextNumber = 1;
            if (lastGRN && lastGRN.grnNumber) {
              const match = lastGRN.grnNumber.match(/GRN(\d+)/);
              if (match) {
                nextNumber = parseInt(match[1]) + 1;
              }
            }
            
            const candidateNumber = `GRN${String(nextNumber).padStart(6, '0')}`;
            
            // Check if this number already exists
            const existing = await GRN.findOne({
              where: { grnNumber: candidateNumber },
              transaction: options.transaction
            });
            
            if (!existing) {
              grn.grnNumber = candidateNumber;
              console.log('🔢 Generated GRN Number in hook:', grn.grnNumber);
              break;
            }
            
            attempts++;
            // If we can't find a unique number, add random suffix
            if (attempts >= maxAttempts) {
              grn.grnNumber = `GRN${String(nextNumber + Math.floor(Math.random() * 1000)).padStart(6, '0')}`;
              console.log('🔢 Generated GRN Number with random suffix:', grn.grnNumber);
            }
          }
        } catch (error) {
          console.error('Error in GRN beforeCreate hook:', error);
          // Fallback to timestamp-based number
          grn.grnNumber = `GRN${Date.now()}`;
        }
      }
    }
  }
});

module.exports = GRN;
