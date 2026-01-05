const { User, Category, Item, Warehouse, StockLocation, Supplier } = require('./models');
const bcrypt = require('bcryptjs');

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Create users if they don't exist
    const adminExists = await User.findOne({ where: { email: 'admin@example.com' } });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('adminpassword', 10);
      await User.create({
        name: 'Super Admin',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin'
      });
      console.log('✅ Admin user created');
    }

    const managerExists = await User.findOne({ where: { email: 'manager@example.com' } });
    if (!managerExists) {
      const hashedPassword = await bcrypt.hash('managerpassword', 10);
      await User.create({
        name: 'Inventory Manager',
        email: 'manager@example.com',
        password: hashedPassword,
        role: 'manager'
      });
      console.log('✅ Manager user created');
    }

    const warehouseExists = await User.findOne({ where: { email: 'warehouse@example.com' } });
    if (!warehouseExists) {
      const hashedPassword = await bcrypt.hash('warehousepassword', 10);
      await User.create({
        name: 'Warehouse Staff',
        email: 'warehouse@example.com',
        password: hashedPassword,
        role: 'warehouse'
      });
      console.log('✅ Warehouse user created');
    }

    // Get admin user for foreign keys
    const adminUser = await User.findOne({ where: { role: 'admin' } });

    // Create categories if they don't exist
    const categoryCount = await Category.count();
    if (categoryCount === 0) {
      await Category.bulkCreate([
        {
          name: 'Electronics',
          description: 'Electronic items and components',
          isActive: true,
          createdById: adminUser.id
        },
        {
          name: 'Office Supplies',
          description: 'Office and stationery items',
          isActive: true,
          createdById: adminUser.id
        },
        {
          name: 'Raw Materials',
          description: 'Manufacturing raw materials',
          isActive: true,
          createdById: adminUser.id
        }
      ]);
      console.log('✅ Categories created');
    }

    // Create warehouses if they don't exist
    const warehouseCount = await Warehouse.count();
    if (warehouseCount === 0) {
      await Warehouse.bulkCreate([
        {
          name: 'Main Warehouse',
          code: 'WH001',
          address: '123 Industrial Ave, City, State 12345',
          contactPerson: 'John Smith',
          contactPhone: '+1-555-0101',
          contactEmail: 'warehouse1@company.com',
          isActive: true,
          createdById: adminUser.id
        },
        {
          name: 'Secondary Warehouse',
          code: 'WH002',
          address: '456 Storage Blvd, City, State 12346',
          contactPerson: 'Jane Doe',
          contactPhone: '+1-555-0102',
          contactEmail: 'warehouse2@company.com',
          isActive: true,
          createdById: adminUser.id
        }
      ]);
      console.log('✅ Warehouses created');
    }

    // Create suppliers if they don't exist
    const supplierCount = await Supplier.count();
    if (supplierCount === 0) {
      await Supplier.bulkCreate([
        {
          name: 'TechCorp Supplies',
          email: 'orders@techcorp.com',
          phone: '+1-555-1001',
          address: '789 Tech Street, Silicon Valley, CA 94000',
          contactPerson: 'Alice Johnson',
          leadTimeDays: 5,
          paymentTerms: 'Net 30',
          isActive: true,
          createdById: adminUser.id
        },
        {
          name: 'Office Plus Ltd',
          email: 'sales@officeplus.com',
          phone: '+1-555-1002',
          address: '456 Business Ave, New York, NY 10001',
          contactPerson: 'Bob Wilson',
          leadTimeDays: 3,
          paymentTerms: 'Net 15',
          isActive: true,
          createdById: adminUser.id
        },
        {
          name: 'Industrial Materials Co',
          email: 'procurement@indmat.com',
          phone: '+1-555-1003',
          address: '321 Factory Road, Detroit, MI 48000',
          contactPerson: 'Carol Davis',
          leadTimeDays: 10,
          paymentTerms: 'Net 45',
          isActive: true,
          createdById: adminUser.id
        }
      ]);
      console.log('✅ Suppliers created');
    }

    // Create items if they don't exist
    const itemCount = await Item.count();
    if (itemCount === 0) {
      const categories = await Category.findAll();
      
      await Item.bulkCreate([
        {
          sku: 'ELEC001',
          name: 'Laptop Computer',
          description: 'High-performance laptop for office use',
          categoryId: categories[0].id,
          unitOfMeasure: 'pieces',
          leadTimeDays: 7,
          safetyStock: 5,
          reorderPoint: 10,
          isActive: true,
          createdById: adminUser.id
        },
        {
          sku: 'ELEC002',
          name: 'Wireless Mouse',
          description: 'Ergonomic wireless mouse',
          categoryId: categories[0].id,
          unitOfMeasure: 'pieces',
          leadTimeDays: 3,
          safetyStock: 20,
          reorderPoint: 50,
          isActive: true,
          createdById: adminUser.id
        },
        {
          sku: 'OFF001',
          name: 'A4 Paper',
          description: 'White A4 printing paper',
          categoryId: categories[1].id,
          unitOfMeasure: 'boxes',
          leadTimeDays: 2,
          safetyStock: 10,
          reorderPoint: 25,
          isActive: true,
          createdById: adminUser.id
        },
        {
          sku: 'OFF002',
          name: 'Blue Pen',
          description: 'Blue ballpoint pen',
          categoryId: categories[1].id,
          unitOfMeasure: 'pieces',
          leadTimeDays: 1,
          safetyStock: 50,
          reorderPoint: 100,
          isActive: true,
          createdById: adminUser.id
        },
        {
          sku: 'RAW001',
          name: 'Steel Sheets',
          description: 'Industrial steel sheets',
          categoryId: categories[2].id,
          unitOfMeasure: 'kg',
          leadTimeDays: 14,
          safetyStock: 100,
          reorderPoint: 500,
          isActive: true,
          createdById: adminUser.id
        }
      ]);
      console.log('✅ Items created');
    }

    // Create stock locations if they don't exist
    const stockLocationCount = await StockLocation.count();
    if (stockLocationCount === 0) {
      const warehouses = await Warehouse.findAll();
      const items = await Item.findAll();
      
      const stockLocations = [];
      
      // Create stock locations for each item in each warehouse
      warehouses.forEach((warehouse, warehouseIndex) => {
        items.forEach((item, itemIndex) => {
          stockLocations.push({
            warehouseId: warehouse.id,
            itemId: item.id,
            locationCode: `${warehouse.code}-A${itemIndex + 1}-R1-B1`,
            aisle: `A${itemIndex + 1}`,
            rack: 'R1',
            bin: 'B1',
            currentStock: Math.floor(Math.random() * 100) + 10, // Random stock between 10-110
            minStock: item.reorderPoint,
            maxStock: item.reorderPoint * 3,
            isActive: true,
            createdById: adminUser.id
          });
        });
      });
      
      await StockLocation.bulkCreate(stockLocations);
      console.log('✅ Stock locations created');
    }

    console.log('🌱 Database seeding completed successfully!');
    
    // Return summary
    const summary = {
      users: await User.count(),
      categories: await Category.count(),
      items: await Item.count(),
      warehouses: await Warehouse.count(),
      stockLocations: await StockLocation.count()
    };
    
    return summary;

  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  }
};

module.exports = seedDatabase;