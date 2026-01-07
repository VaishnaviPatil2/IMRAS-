const express = require("express");
const cors = require("cors");
const { sequelize, User } = require("./models");
const bcrypt = require("bcryptjs");
// const AutomaticTriggerService = require("./services/automaticTriggerService"); // Temporarily disabled
require("dotenv").config();

const grnRoutes = require("./routes/grn.routes");

const app = express();

// Global error handlers to prevent server crashes
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/suppliers", require("./routes/supplier.routes")); // ✅ ENABLED
app.use("/api/supplier-items", require("./routes/supplierItem.routes")); // ✅ Supplier Catalog
app.use("/api/purchase-orders", require("./routes/purchaseOrder.routes")); // ✅ FIXED
app.use("/api/grn", grnRoutes);
app.use("/api/dashboard", require("./routes/dashboard.routes"));
app.use("/api/categories", require("./routes/category.routes"));
app.use("/api/items", require("./routes/item.routes"));
app.use("/api/warehouses", require("./routes/warehouse.routes"));
app.use("/api/stock-locations", require("./routes/stockLocation.routes"));
app.use("/api/transfer-orders", require("./routes/transferOrder.routes"));
app.use("/api/purchase-requests", require("./routes/purchaseRequest.routes")); // ✅ FIXED
// app.use("/api/automatic-triggers", require("./routes/automaticTrigger.routes")); // Temporarily disabled

// Main route
app.get("/", (req, res) => {
  res.send("Backend + PostgreSQL Database connected");
});



// Global Express error handler
app.use((error, req, res, next) => {
  console.error('❌ Express Error:', error.message);
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

// Seed data route (for development)
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
    return false;
  }
};

// Start server regardless of database connection
const startServer = () => {
  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, () => {
    console.log(`✅ Server started on port ${PORT}`);
    
    // Temporarily disable automatic triggers to debug
    // try {
    //   AutomaticTriggerService.startAutomaticTriggers();
    // } catch (error) {
    //   console.error('❌ Failed to start automatic triggers:', error.message);
    // }
  });

  server.keepAliveTimeout = 120000;
  server.headersTimeout = 120000;
  
  return server;
};

// Initialize database connection and start server
(async () => {
  try {
    const connected = await connectWithRetry();
    
    if (connected) {
      try {
        await sequelize.sync({ force: false, alter: false, logging: false });
        console.log("Database synchronized successfully");
      } catch (syncError) {
        console.error("❌ Database sync error:", syncError);
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
        }
        
      } catch (err) {
        console.error("❌ Error checking/creating first admin:", err.message);
      }
    }
    
    const server = startServer();
    
    const keepAlive = setInterval(() => {
      // Keep process alive
    }, 30000);
    
    process.on('SIGTERM', () => {
      // AutomaticTriggerService.stopAutomaticTriggers(); // Temporarily disabled
      clearInterval(keepAlive);
      server.close(() => {
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      // AutomaticTriggerService.stopAutomaticTriggers(); // Temporarily disabled
      clearInterval(keepAlive);
      server.close(() => {
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error("❌ Server startup error:", error);
    startServer();
  }
})();
