const express = require("express");
const cors = require("cors");
const { sequelize, User } = require("./models");
const bcrypt = require("bcryptjs");
require("dotenv").config();

// const grnRoutes = require("./routes/grn.routes"); // remove if file doesn't exist

const app = express();

// Global error handlers to prevent server crashes
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message);
  console.error('Stack:', error.stack);
  // Don't exit the process, just log the error
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log the error
});

// Handle SIGTERM and SIGINT gracefully
process.on('SIGTERM', () => {
  console.log('SIGTERM received, will be handled in server startup');
});

process.on('SIGINT', () => {
  console.log('SIGINT received, will be handled in server startup');
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", require("./routes/auth.routes"));
// app.use("/api/inventory", require("./routes/inventory.routes")); // MongoDB syntax - commented out
app.use("/api/suppliers", require("./routes/supplier.routes")); // ✅ ENABLED
app.use("/api/supplier-items", require("./routes/supplierItem.routes")); // ✅ Supplier Catalog
app.use("/api/purchase-orders", require("./routes/purchaseOrder.routes")); // ✅ ENABLED
// app.use("/api/reports", require("./routes/report.routes")); // MongoDB syntax - commented out
// app.use("/api/grn", grnRoutes); // comment until created
app.use("/api/dashboard", require("./routes/dashboard.routes"));
app.use("/api/categories", require("./routes/category.routes"));
app.use("/api/items", require("./routes/item.routes"));
app.use("/api/warehouses", require("./routes/warehouse.routes"));
app.use("/api/stock-locations", require("./routes/stockLocation.routes"));
app.use("/api/transfer-orders", require("./routes/transferOrder.routes"));
app.use("/api/purchase-requests", require("./routes/purchaseRequest.routes"));

// Test route
app.get("/", (req, res) => {
  res.send("Backend + PostgreSQL Database connected");
});

// Simple test endpoint for supplier data (no auth)
app.get("/test-suppliers", async (req, res) => {
  try {
    const { Item, Supplier } = require("./models");
    const items = await Item.findAll({
      include: [{ model: Supplier, as: 'preferredSupplier', required: false }],
      limit: 5
    });
    
    const result = items.map(item => ({
      name: item.name,
      sku: item.sku,
      preferredSupplierId: item.preferredSupplierId,
      unitPrice: item.unitPrice,
      supplier: item.preferredSupplier ? {
        id: item.preferredSupplier.id,
        name: item.preferredSupplier.name,
        email: item.preferredSupplier.email
      } : null
    }));
    
    res.json({ success: true, items: result });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Global Express error handler
app.use((error, req, res, next) => {
  console.error('❌ Express Error:', error.message);
  console.error('Stack:', error.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Handle 404 routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Database status check (for debugging)
app.get("/api/db-status", async (req, res) => {
  try {
    const { User, Category, Item, Warehouse, StockLocation, PurchaseRequest, PurchaseOrder, Supplier } = require("./models");
    
    const counts = {
      users: await User.count(),
      categories: await Category.count(),
      items: await Item.count(),
      warehouses: await Warehouse.count(),
      stockLocations: await StockLocation.count(),
      purchaseRequests: await PurchaseRequest.count(),
      purchaseOrders: await PurchaseOrder.count(),
      suppliers: await Supplier.count()
    };

    // Get sample data
    const sampleData = {
      users: await User.findAll({ limit: 3, attributes: ['id', 'name', 'email', 'role'] }),
      categories: await Category.findAll({ limit: 5, attributes: ['id', 'name'] }),
      items: await Item.findAll({ 
        limit: 5, 
        attributes: ['id', 'name', 'sku'],
        include: [{ model: Category, as: 'category', attributes: ['name'] }]
      }),
      warehouses: await Warehouse.findAll({ limit: 3, attributes: ['id', 'name', 'code'] }),
      stockLocations: await StockLocation.findAll({ 
        limit: 5,
        include: [
          { model: Item, as: 'item', attributes: ['name', 'sku'] },
          { model: Warehouse, as: 'warehouse', attributes: ['name'] }
        ]
      })
    };

    res.json({ 
      success: true, 
      counts, 
      sampleData,
      message: "Database status check completed"
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message,
      message: "Database status check failed"
    });
  }
});

// Seed data route (for testing)
app.post("/api/seed-data", async (req, res) => {
  try {
    const seedDatabase = require("./seedData");
    await seedDatabase();
    res.json({ success: true, message: "Database seeded successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PostgreSQL Connection with retry logic
const connectWithRetry = async () => {
  try {
    await sequelize.authenticate();
    console.log("PostgreSQL connected successfully");
    return true;
  } catch (error) {
    console.error("❌ PostgreSQL connection failed:", error.message);
    return false; // Don't retry automatically, just return false
  }
};

// Start server regardless of database connection
const startServer = () => {
  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, () => {
    console.log(`✅ Server started on port ${PORT}`);
  });

  // Keep server alive
  server.keepAliveTimeout = 120000;
  server.headersTimeout = 120000;
  
  return server;
};

// Initialize database connection and start server
(async () => {
  try {
    const connected = await connectWithRetry();
    
    if (connected) {
      // Sync database with more detailed logging
      console.log("Starting database synchronization...");
      try {
        await sequelize.sync({ force: false, alter: false, logging: false });
        console.log("Database synchronized successfully");
      } catch (syncError) {
        console.error("❌ Database sync error:", syncError);
        console.log("⚠️ Continuing with server startup despite sync error...");
      }

      try {
        const count = await User.count();

        if (count === 0) {
          const hashedPassword = await bcrypt.hash("adminpassword", 10);
          await User.create({
            name: "Super Admin",
            email: "admin@example.com",
            password: hashedPassword,
            role: "admin"
          });
          console.log("✅ First admin created: admin@example.com / adminpassword");
        }

        // Create default warehouses if none exist
        const { Warehouse } = require("./models");
        const warehouseCount = await Warehouse.count();
        
        if (warehouseCount === 0) {
          const adminUser = await User.findOne({ where: { role: "admin" } });
          
          await Warehouse.bulkCreate([
            {
              name: "Main Warehouse",
              code: "WH001",
              address: "123 Industrial Ave, City, State 12345",
              contactPerson: "John Smith",
              contactPhone: "+1-555-0101",
              contactEmail: "warehouse1@company.com",
              createdById: adminUser.id
            },
            {
              name: "Secondary Warehouse",
              code: "WH002", 
              address: "456 Storage Blvd, City, State 12346",
              contactPerson: "Jane Doe",
              contactPhone: "+1-555-0102",
              contactEmail: "warehouse2@company.com",
              createdById: adminUser.id
            },
            {
              name: "Distribution Center",
              code: "WH003",
              address: "789 Logistics Way, City, State 12347",
              contactPerson: "Mike Johnson",
              contactPhone: "+1-555-0103", 
              contactEmail: "warehouse3@company.com",
              createdById: adminUser.id
            }
          ]);
          console.log("✅ Default warehouses created");
        }
        
      } catch (err) {
        console.error("❌ Error checking/creating first admin:", err.message);
      }
    } else {
      console.log("⚠️ Starting server without database connection...");
    }
    
    // Start server regardless of database status
    const server = startServer();
    
    // Keep the process alive
    const keepAlive = setInterval(() => {
      // This prevents the process from exiting
      // console.log('Server heartbeat...');
    }, 30000); // Every 30 seconds
    
    // Graceful shutdown handling
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      clearInterval(keepAlive);
      server.close(() => {
        console.log('Process terminated');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received, shutting down gracefully');
      clearInterval(keepAlive);
      server.close(() => {
        console.log('Process terminated');
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error("❌ Server startup error:", error);
    console.log("🔄 Starting server anyway...");
    startServer();
  }
})();
