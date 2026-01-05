const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TransferOrder = sequelize.define('TransferOrder', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  transferNumber: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  fromWarehouseId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'warehouses',
      key: 'id'
    }
  },
  toWarehouseId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'warehouses',
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
  requestedQuantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: {
        args: [1],
        msg: "Requested quantity must be at least 1"
      },
      isInt: {
        msg: "Requested quantity must be a valid integer"
      }
    }
  },
  approvedQuantity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: {
        args: [0],
        msg: "Approved quantity cannot be negative"
      },
      isInt: {
        msg: "Approved quantity must be a valid integer"
      }
    }
  },
  transferredQuantity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: {
        args: [0],
        msg: "Transferred quantity cannot be negative"
      },
      isInt: {
        msg: "Transferred quantity must be a valid integer"
      }
    }
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'completed', 'cancelled'),
    defaultValue: 'pending'
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium'
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  expectedDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  requestedById: {
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
  completedById: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  cancelledById: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  cancelledAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  submittedForApproval: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Tracks if pending order has been submitted for manager approval'
  }
}, {
  timestamps: true,
  tableName: 'transfer_orders',
  hooks: {
    beforeCreate: async (transferOrder) => {
      if (!transferOrder.transferNumber) {
        const count = await TransferOrder.count();
        transferOrder.transferNumber = `TO${String(count + 1).padStart(6, '0')}`;
      }
    }
  }
});

module.exports = TransferOrder;