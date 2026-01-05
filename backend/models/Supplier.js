const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Supplier = sequelize.define('Supplier', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: "Supplier name is required"
      }
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: {
        msg: "Email must be valid"
      },
      notEmpty: {
        msg: "Email is required"
      }
    }
  },
  contactNumber: {
    type: DataTypes.STRING
  },
  address: {
    type: DataTypes.TEXT
  },
  leadTimeDays: {
    type: DataTypes.INTEGER,
    defaultValue: 7,
    validate: {
      min: 0
    }
  },
  pricingTier: {
    type: DataTypes.STRING,
    defaultValue: 'Standard'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  timestamps: true,
  tableName: 'suppliers'
});

module.exports = Supplier;
