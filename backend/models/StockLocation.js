const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const StockLocation = sequelize.define('StockLocation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  warehouseId: {
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
  locationCode: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: {
        msg: "Location code is required"
      }
    }
  },
  aisle: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: "Aisle is required"
      }
    }
  },
  rack: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: "Rack is required"
      }
    }
  },
  bin: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: "Bin is required"
      }
    }
  },
  currentStock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: {
        args: [0],
        msg: "Current stock cannot be negative"
      },
      isInt: {
        msg: "Current stock must be a valid integer"
      }
    }
  },
  minStock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: {
        args: [0],
        msg: "Minimum stock cannot be negative"
      },
      isInt: {
        msg: "Minimum stock must be a valid integer"
      }
    }
  },
  maxStock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 100,
    validate: {
      min: {
        args: [1],
        msg: "Maximum stock must be at least 1"
      },
      isInt: {
        msg: "Maximum stock must be a valid integer"
      }
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  createdById: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  updatedById: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  timestamps: true,
  tableName: 'stock_locations',
  hooks: {
    beforeCreate: async (stockLocation) => {
      // Only generate location code if it's not already set
      if (!stockLocation.locationCode) {
        try {
          const Warehouse = require('./Warehouse');
          const warehouse = await Warehouse.findByPk(stockLocation.warehouseId);
          if (warehouse) {
            stockLocation.locationCode = `${warehouse.code}-${stockLocation.aisle}-${stockLocation.rack}-${stockLocation.bin}`;
            console.log('Hook generated locationCode:', stockLocation.locationCode);
          } else {
            console.error('Warehouse not found for ID:', stockLocation.warehouseId);
            throw new Error('Warehouse not found');
          }
        } catch (error) {
          console.error('Error in beforeCreate hook:', error);
          throw error;
        }
      } else {
        console.log('LocationCode already set:', stockLocation.locationCode);
      }
    },
    beforeUpdate: async (stockLocation) => {
      if (stockLocation.changed('aisle') || stockLocation.changed('rack') || stockLocation.changed('bin')) {
        try {
          const Warehouse = require('./Warehouse');
          const warehouse = await Warehouse.findByPk(stockLocation.warehouseId);
          if (warehouse) {
            stockLocation.locationCode = `${warehouse.code}-${stockLocation.aisle}-${stockLocation.rack}-${stockLocation.bin}`;
          }
        } catch (error) {
          console.error('Error in beforeUpdate hook:', error);
          throw error;
        }
      }
    }
  }
});

module.exports = StockLocation;