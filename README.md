# IMRAS - Inventory Management & Resource Allocation System

A comprehensive full-stack inventory management system built with React.js, Node.js, Express.js, and PostgreSQL. IMRAS provides automated stock monitoring, purchase request management, supplier coordination, and real-time dashboard analytics.

## 🚀 Features

### Core Functionality
- **Inventory Management**: Real-time stock tracking with automated low-stock alerts
- **Purchase Request System**: Automated PR generation based on stock levels
- **Purchase Order Management**: Complete PO lifecycle from creation to completion
- **Goods Receipt Notes (GRN)**: Warehouse receipt processing and stock updates
- **Supplier Management**: Supplier profiles, pricing, and communication
- **Transfer Orders**: Inter-warehouse stock transfers
- **User Management**: Role-based access control (Admin, Manager, Warehouse, Supplier)

### Advanced Features
- **Automated Stock Monitoring**: Intelligent reorder point calculations
- **Real-time Dashboard**: Live analytics and KPI tracking
- **Mobile Responsive**: Optimized for desktop and mobile devices
- **Email Notifications**: Automated alerts for critical operations
- **Audit Trail**: Complete transaction history and logging
- **Scientific Inventory Formulas**: Lead time, safety stock, and reorder calculations

## 🛠️ Tech Stack

### Frontend
- **React 19.2.0** - Modern UI library
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router DOM** - Client-side routing
- **Chart.js & React-ChartJS-2** - Data visualization
- **Heroicons** - Beautiful SVG icons
- **Axios** - HTTP client for API calls

### Backend
- **Node.js** - JavaScript runtime
- **Express.js 5.2.1** - Web application framework
- **PostgreSQL** - Relational database
- **Sequelize 6.35.0** - ORM for database operations
- **JWT** - Authentication and authorization
- **bcryptjs** - Password hashing
- **Node-cron** - Automated task scheduling
- **Nodemailer** - Email service integration

## 📁 Project Structure

```
IMRAS/
├── backend/                    # Node.js backend application
│   ├── config/                # Database configuration
│   ├── controllers/           # Route controllers
│   ├── middleware/            # Authentication & validation
│   ├── models/               # Sequelize database models
│   ├── routes/               # API route definitions
│   ├── services/             # Business logic services
│   ├── utils/                # Utility functions
│   ├── .env                  # Environment variables
│   ├── package.json          # Backend dependencies
│   └── server.js             # Application entry point
│
├── imras-frontend/            # React frontend application
│   ├── public/               # Static assets
│   ├── src/
│   │   ├── api/              # API service functions
│   │   ├── components/       # Reusable UI components
│   │   ├── context/          # React context providers
│   │   ├── pages/            # Page components
│   │   ├── utils/            # Frontend utilities
│   │   ├── App.jsx           # Main application component
│   │   └── main.jsx          # Application entry point
│   ├── package.json          # Frontend dependencies
│   └── vite.config.js        # Vite configuration
│
└── README.md                 # Project documentation
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd IMRAS
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   ```

3. **Frontend Setup**
   ```bash
   cd ../imras-frontend
   npm install
   ```

4. **Database Setup**
   - Create a PostgreSQL database named `imras`
   - Update database credentials in `backend/.env`

5. **Environment Configuration**
   
   Create `backend/.env` file:
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=imras
   DB_USER=your_username
   DB_PASSWORD=your_password
   
   # JWT Configuration
   JWT_SECRET=your_jwt_secret_key
   JWT_EXPIRES_IN=24h
   
   # Email Configuration (Optional)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password
   
   # Application Configuration
   PORT=5000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:5173
   ```

6. **Start the Applications**
   
   Backend (Terminal 1):
   ```bash
   cd backend
   npm run dev
   ```
   
   Frontend (Terminal 2):
   ```bash
   cd imras-frontend
   npm run dev
   ```

7. **Access the Application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000

## 👥 User Roles & Access

### Admin
- Full system access
- User management
- System configuration
- All CRUD operations

### Manager (Inventory Manager)
- Purchase request approval
- Purchase order management
- Inventory oversight
- Reports and analytics

### Warehouse Staff
- Stock location management
- GRN processing
- Transfer order execution
- Inventory updates

### Supplier
- Purchase order responses
- Delivery confirmations
- Order status tracking

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Dashboard
- `GET /api/dashboard` - Dashboard analytics

### Items & Categories
- `GET /api/items` - Get all items
- `POST /api/items` - Create new item
- `GET /api/categories` - Get all categories

### Stock Management
- `GET /api/stock-locations` - Get stock locations
- `POST /api/stock-locations` - Create stock location
- `PUT /api/stock-locations/:id` - Update stock

### Purchase Requests
- `GET /api/purchase-requests` - Get all PRs
- `POST /api/purchase-requests` - Create PR
- `PUT /api/purchase-requests/:id/status` - Approve/Reject PR

### Purchase Orders
- `GET /api/purchase-orders` - Get all POs
- `POST /api/purchase-orders` - Create PO
- `PUT /api/purchase-orders/:id/approve` - Approve PO

### GRN Management
- `GET /api/grn` - Get all GRNs
- `POST /api/grn` - Create GRN
- `PUT /api/grn/:id/approve` - Approve GRN

## 🔄 Automated Features

### Stock Monitoring
- Automatic low-stock detection
- Reorder point calculations
- Safety stock management

### Purchase Request Generation
- Auto-PR creation for low stock items
- Urgency level assignment
- Quantity optimization

### Email Notifications
- Low stock alerts
- Purchase order notifications
- Approval requests

## 📊 Dashboard Analytics

- **Real-time KPIs**: Stock levels, pending orders, alerts
- **Interactive Charts**: Stock trends, order analytics
- **Role-based Views**: Customized dashboards per user role
- **Alert System**: Critical notifications and warnings

## 🔒 Security Features

- JWT-based authentication
- Role-based access control
- Password encryption (bcrypt)
- Input validation and sanitization
- CORS protection

## 📱 Mobile Responsiveness

- Responsive design for all screen sizes
- Touch-friendly interface
- Mobile-optimized navigation
- Progressive Web App capabilities

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd imras-frontend
npm test
```

## 🚀 Deployment

### Production Build

1. **Frontend Build**
   ```bash
   cd imras-frontend
   npm run build
   ```

2. **Backend Production**
   ```bash
   cd backend
   npm start
   ```

### Environment Variables (Production)
Update `.env` file with production values:
- Database connection strings
- JWT secrets
- Email service credentials
- CORS origins

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the ISC License.

## 👨‍💻 Author

**Vaishnavi Patil**
- Email: vaishnavivpatil019@gmail.com

## 🆘 Support

For support and questions:
1. Check the documentation
2. Create an issue on GitHub
3. Contact the development team

## 🔄 Version History

- **v1.0.0** - Initial release with core functionality
- **v1.1.0** - Added mobile responsiveness and comment cleanup
- **v1.2.0** - Enhanced automation and dashboard features

---

**Built with ❤️ for efficient inventory management**