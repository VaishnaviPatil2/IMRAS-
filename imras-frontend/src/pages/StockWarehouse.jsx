import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { warehouseApi } from '../api/warehouseApi';
import { stockLocationApi } from '../api/stockLocationApi';
import { transferOrderApi } from '../api/transferOrderApi';
import { itemApi } from '../api/itemApi';
import { calculateEffectiveMinimum, getStockStatus } from '../utils/stockCalculations';

const StockWarehouse = () => {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('warehouses');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data states
  const [warehouses, setWarehouses] = useState([]);
  const [stockLocations, setStockLocations] = useState([]);
  const [transferOrders, setTransferOrders] = useState([]);
  const [items, setItems] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    warehouse: '',
    status: '',
    priority: '',
    fromWarehouse: '',
    toWarehouse: '',
    stockStatus: '',
    itemSearch: ''
  });

  // Modal states
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [showStockLocationModal, setShowStockLocationModal] = useState(false);
  const [showTransferOrderModal, setShowTransferOrderModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showTransferDetailsModal, setShowTransferDetailsModal] = useState(false);
  const [selectedTransferOrder, setSelectedTransferOrder] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  // Form states
  const [warehouseForm, setWarehouseForm] = useState({
    name: '',
    code: '',
    address: '',
    contactPerson: '',
    contactPhone: '',
    contactEmail: ''
  });

  const [stockLocationForm, setStockLocationForm] = useState({
    warehouseId: '',
    itemId: '',
    aisle: '',
    rack: '',
    bin: '',
    minStock: 0,
    maxStock: 100,
    currentStock: 0
  });
  const [transferOrderForm, setTransferOrderForm] = useState({
    fromWarehouseId: '',
    toWarehouseId: '',
    itemId: '',
    requestedQuantity: 1,
    priority: 'medium',
    reason: '',
    expectedDate: ''
  });

  const [approvalForm, setApprovalForm] = useState({
    action: 'approve',
    approvedQuantity: 0,
    notes: ''
  });

  const [completionForm, setCompletionForm] = useState({
    transferredQuantity: 0,
    notes: ''
  });

  const isWarehouse = user?.role === 'warehouse';
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';

  // Set default tab based on role
  useEffect(() => {
    if (isAdmin) {
      setActiveTab('warehouses');
    } else if (isWarehouse) {
      setActiveTab('stock-locations');
    } else {
      setActiveTab('transfer-orders');
    }
  }, [isAdmin, isWarehouse]);

  // Load basic data once on mount
  useEffect(() => {
    const loadBasicData = async () => {
      try {
        console.log('Loading basic data...');
        
        // Load warehouses for dropdowns
        const warehouseResponse = await warehouseApi.getAll({ active: 'true', limit: 1000 });
        console.log('Basic warehouses response:', warehouseResponse.data);
        if (warehouseResponse.data && Array.isArray(warehouseResponse.data)) {
          // Don't overwrite warehouses if we're on warehouses tab (to avoid conflicts)
          if (activeTab !== 'warehouses') {
            setWarehouses(warehouseResponse.data);
          }
        }
        
        // Load items for dropdowns
        const itemResponse = await itemApi.getAll({ active: 'true', limit: 1000 });
        console.log('Basic items response:', itemResponse.data);
        if (itemResponse.data && Array.isArray(itemResponse.data)) {
          setItems(itemResponse.data);
        } else if (itemResponse.data && Array.isArray(itemResponse.data.items)) {
          setItems(itemResponse.data.items);
        }
      } catch (err) {
        console.error('Error loading basic data:', err);
        setError('Failed to load basic data: ' + (err.response?.data?.error || err.message));
      }
    };
    
    loadBasicData();
  }, []);

  // Load tab-specific data when tab changes
  useEffect(() => {
    const loadTabData = async () => {
      setLoading(true);
      try {
        switch (activeTab) {
          case 'warehouses':
            await loadWarehousesWithPagination();
            break;
          case 'stock-locations':
            await loadStockLocations();
            await loadLowStockItems();
            break;
          case 'transfer-orders':
            await loadTransferOrders();
            await loadAllStockLocationsForTransfer();
            break;
          default:
            break;
        }
      } catch (err) {
        setError('Failed to load data: ' + (err.response?.data?.error || err.message));
      } finally {
        setLoading(false);
      }
    };
    
    loadTabData();
  }, [activeTab]);
  // Load paginated data when page or filters change
  useEffect(() => {
    const loadPaginatedData = async () => {
      if (activeTab === 'warehouses') {
        await loadWarehousesWithPagination();
      } else if (activeTab === 'stock-locations') {
        await loadStockLocations();
      } else if (activeTab === 'transfer-orders') {
        await loadTransferOrders();
      }
    };
    
    loadPaginatedData();
  }, [currentPage, filters.search, filters.warehouse, filters.status, filters.priority, filters.fromWarehouse, filters.toWarehouse, filters.stockStatus]);

  const loadWarehousesWithPagination = async () => {
    try {
      const response = await warehouseApi.getAll({ page: currentPage, limit: 10, search: filters.search });
      console.log('Warehouses response:', response.data);
      
      // The API returns warehouses directly as an array, not wrapped in an object
      if (response.data && Array.isArray(response.data)) {
        setWarehouses(response.data);
        // Since there's no pagination in the backend, set totalPages to 1
        setTotalPages(1);
      } else {
        console.error('Unexpected warehouses response format:', response.data);
        setWarehouses([]);
        setTotalPages(1);
      }
    } catch (err) {
      console.error('Load warehouses error:', err);
      setError('Failed to load warehouses: ' + (err.response?.data?.error || err.message));
    }
  };

  const loadStockLocations = async () => {
    try {
      const response = await stockLocationApi.getAll({
        page: currentPage,
        limit: 10,
        search: filters.search,
        warehouse: filters.warehouse,
        stockStatus: filters.stockStatus
      });
      console.log('Stock locations response:', response.data);
      if (response.data && response.data.stockLocations) {
        setStockLocations(response.data.stockLocations);
        setTotalPages(response.data.totalPages || 1);
      } else if (response.data && Array.isArray(response.data)) {
        setStockLocations(response.data);
        setTotalPages(1);
      }
    } catch (err) {
      console.error('Load stock locations error:', err);
      setError('Failed to load stock locations: ' + (err.response?.data?.error || err.message));
    }
  };

  const loadTransferOrders = async () => {
    try {
      const response = await transferOrderApi.getAll({
        page: currentPage,
        limit: 10,
        search: filters.search,
        status: filters.status,
        priority: filters.priority,
        fromWarehouse: filters.fromWarehouse,
        toWarehouse: filters.toWarehouse
      });
      console.log('Transfer orders response:', response.data);
      if (response.data && response.data.transferOrders) {
        setTransferOrders(response.data.transferOrders);
        setTotalPages(response.data.totalPages || 1);
      } else if (response.data && Array.isArray(response.data)) {
        setTransferOrders(response.data);
        setTotalPages(1);
      }
    } catch (err) {
      console.error('Load transfer orders error:', err);
      setError('Failed to load transfer orders: ' + (err.response?.data?.error || err.message));
    }
  };

  const loadAllStockLocationsForTransfer = async () => {
    try {
      const allStockParams = { 
        page: 1, 
        limit: 10000,
        search: '', 
        warehouse: '', 
        status: '' 
      };
      const allStockResponse = await stockLocationApi.getAll(allStockParams);
      console.log('All stock locations for transfer:', allStockResponse.data);
      
      if (allStockResponse.data && allStockResponse.data.stockLocations) {
        // Only update if we're on transfer orders tab to avoid conflicts
        if (activeTab === 'transfer-orders') {
          setStockLocations(allStockResponse.data.stockLocations);
        }
      } else if (allStockResponse.data && Array.isArray(allStockResponse.data)) {
        if (activeTab === 'transfer-orders') {
          setStockLocations(allStockResponse.data);
        }
      }
    } catch (err) {
      console.error('Failed to load stock locations for transfer orders:', err);
    }
  };

  const loadLowStockItems = async () => {
    try {
      const response = await stockLocationApi.getLowStock();
      if (response.data) {
        setLowStockItems(response.data);
      }
    } catch (err) {
      console.error('Failed to load low stock items:', err);
    }
  };
  // Clear messages
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const tabs = [
    { id: 'stock-locations', name: 'Stock Locations', icon: '📦' },
    { id: 'transfer-orders', name: 'Transfer Orders', icon: '🔄' }
  ];

  // Add warehouse management tab for admins, managers, and warehouse staff
  if (isAdmin || isManager || isWarehouse) {
    tabs.unshift({ id: 'warehouses', name: 'Warehouses', icon: '🏢' });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Stock & Warehouse Management</h1>
        
        <div className="space-x-3">
          {/* Only admin can add warehouses */}
          {activeTab === 'warehouses' && isAdmin && (
            <button
              onClick={() => {
                setWarehouseForm({
                  name: '',
                  code: '',
                  address: '',
                  contactPerson: '',
                  contactPhone: '',
                  contactEmail: ''
                });
                setEditingItem(null);
                setShowWarehouseModal(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Warehouse
            </button>
          )}
          {/* Only warehouse staff can add stock locations */}
          {activeTab === 'stock-locations' && isWarehouse && (
            <button
              onClick={() => {
                setStockLocationForm({
                  warehouseId: '',
                  itemId: '',
                  aisle: '',
                  rack: '',
                  bin: '',
                  minStock: 0,
                  maxStock: 100,
                  currentStock: 0
                });
                setEditingItem(null);
                setShowStockLocationModal(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Stock Location
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}
      {/* Low Stock Alert with Auto PO Generation */}
      {activeTab === 'stock-locations' && lowStockItems.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-400 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-2xl mr-3">⚠️</span>
              <div>
                <div className="font-semibold text-yellow-800">Low Stock Alert</div>
                <div className="text-yellow-700">
                  {lowStockItems.length} items are below minimum stock level
                </div>
              </div>
            </div>
            
            {/* Auto PO Generation Button - Only for warehouse staff */}
            {isWarehouse && (
              <div className="flex items-center space-x-3">
                <button
                  onClick={async () => {
                    try {
                      setLoading(true);
                      const result = await purchaseRequestApi.triggerAutoGeneration();
                      setSuccess(`🚀 Auto PO Generation completed! Generated ${result.summary?.totalPRsCreated || 0} PRs and ${result.summary?.totalPOsCreated || 0} POs for low stock items.`);
                      // Refresh the low stock items after generation
                      await loadLowStockItems();
                    } catch (err) {
                      setError('Failed to generate automatic POs: ' + (err.response?.data?.error || err.message));
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="px-4 py-2 rounded-md text-white font-medium transition-colors bg-blue-600 hover:bg-blue-700"
                  disabled={loading}
                >
                  <div className="flex items-center">
                    <span className="mr-2">🚀</span>
                    Generate Auto POs
                  </div>
                </button>
                
                <div className="text-xs text-yellow-600 max-w-xs">
                  <div className="font-medium">Auto PO will:</div>
                  <div>• Create purchase requests for low stock items</div>
                  <div>• Auto-approve urgent/high urgency requests</div>
                  <div>• Generate purchase orders automatically</div>
                </div>
              </div>
            )}
          </div>
          
          {/* Low Stock Items Preview */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowStockItems.map((item) => (
              <div key={item.id} className={`p-3 rounded border ${
                item.currentStock === 0 
                  ? 'bg-red-50 border-red-200' 
                  : 'bg-yellow-50 border-yellow-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="font-medium text-gray-900">{item.item?.name}</div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    item.currentStock === 0 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {item.currentStock === 0 ? 'OUT OF STOCK' : 'LOW STOCK'}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  <div>SKU: {item.item?.sku}</div>
                  <div>Warehouse: {item.warehouse?.name}</div>
                  <div className="flex justify-between mt-1">
                    <span>Current: {item.currentStock}</span>
                    <span>Min: {item.minStock}</span>
                    <span>Max: {item.maxStock}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setCurrentPage(1);
                setFilters({ 
                  search: '', 
                  warehouse: '', 
                  status: '', 
                  priority: '', 
                  fromWarehouse: '', 
                  toWarehouse: '', 
                  stockStatus: '', 
                  itemSearch: '' 
                });
              }}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow">
        {/* Warehouses Tab */}
        {activeTab === 'warehouses' && (
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Warehouses</h2>
            
            {/* Filters */}
            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Search warehouses..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                className="border border-gray-300 rounded-md px-3 py-2"
              />
            </div>

            {/* Warehouses Table */}
            {loading ? (
              <div className="text-center py-4">Loading warehouses...</div>
            ) : warehouses.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                No warehouses found. {filters.search && `Try clearing the search filter.`}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Warehouse
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Code
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Address
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {warehouses.map((warehouse) => (
                      <tr key={warehouse.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{warehouse.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{warehouse.code}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{warehouse.contactPerson}</div>
                          <div className="text-sm text-gray-500">{warehouse.contactPhone}</div>
                          <div className="text-sm text-gray-500">{warehouse.contactEmail}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{warehouse.address}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {/* Only admin can edit/delete warehouses */}
                          {isAdmin && (
                            <div className="flex space-x-3">
                              <button
                                onClick={() => {
                                  setWarehouseForm({
                                    name: warehouse.name,
                                    code: warehouse.code,
                                    address: warehouse.address || '',
                                    contactPerson: warehouse.contactPerson || '',
                                    contactPhone: warehouse.contactPhone || '',
                                    contactEmail: warehouse.contactEmail || ''
                                  });
                                  setEditingItem(warehouse);
                                  setShowWarehouseModal(true);
                                }}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                Edit
                              </button>
                              
                              <button
                                onClick={async () => {
                                  // Check if warehouse has stock locations first
                                  try {
                                    const stockLocationCheck = await stockLocationApi.getAll({ warehouse: warehouse.id, limit: 1 });
                                    const hasStockLocations = stockLocationCheck.data && 
                                      ((Array.isArray(stockLocationCheck.data) && stockLocationCheck.data.length > 0) ||
                                       (stockLocationCheck.data.stockLocations && stockLocationCheck.data.stockLocations.length > 0));
                                    
                                    if (hasStockLocations) {
                                      setError('Cannot delete warehouse. It has stock locations. Please remove all stock locations first.');
                                      return;
                                    }
                                    
                                    if (window.confirm(`Are you sure you want to delete warehouse "${warehouse.name}"? This action cannot be undone.`)) {
                                      try {
                                        setLoading(true);
                                        await warehouseApi.delete(warehouse.id);
                                        setSuccess('Warehouse deleted successfully');
                                        await loadWarehousesWithPagination();
                                      } catch (err) {
                                        setError('Failed to delete warehouse: ' + (err.response?.data?.error || err.message));
                                      } finally {
                                        setLoading(false);
                                      }
                                    }
                                  } catch (err) {
                                    setError('Failed to check warehouse dependencies: ' + (err.response?.data?.error || err.message));
                                  }
                                }}
                                className="text-red-600 hover:text-red-900"
                                title="Delete warehouse"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex justify-between items-center">
                <div className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {/* Stock Locations Tab */}
        {activeTab === 'stock-locations' && (
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Stock Locations</h2>
            
            {/* Filters */}
            <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Search by location code, item name, or SKU..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                className="border border-gray-300 rounded-md px-3 py-2"
              />
              <select
                value={filters.warehouse}
                onChange={(e) => setFilters({...filters, warehouse: e.target.value})}
                className="border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">All Warehouses</option>
                {warehouses.map(warehouse => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
              <select
                value={filters.stockStatus}
                onChange={(e) => setFilters({...filters, stockStatus: e.target.value})}
                className="border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">All Stock Status</option>
                <option value="out">Out of Stock</option>
                <option value="very_low">Very Low Stock</option>
                <option value="low">Low Stock</option>
                <option value="sufficient">Sufficient Stock</option>
              </select>
            </div>

            {/* Stock Locations Table */}
            {loading ? (
              <div className="text-center py-4">Loading...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Item
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Warehouse
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stock
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stockLocations.map((location) => {
                      const stockStatus = getStockStatus(location, location.item);
                      const effectiveMinimum = calculateEffectiveMinimum(location, location.item);
                      
                      return (
                        <tr key={location.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{location.locationCode}</div>
                            <div className="text-sm text-gray-500">
                              {location.aisle}-{location.rack}-{location.bin}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{location.item?.name}</div>
                            <div className="text-sm text-gray-500">SKU: {location.item?.sku}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{location.warehouse?.name}</div>
                            <div className="text-sm text-gray-500">{location.warehouse?.code}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              Current: {location.currentStock} {location.item?.unitOfMeasure}
                            </div>
                            <div className="text-sm text-gray-500">
                              Min: {location.minStock} | Max: {location.maxStock}
                            </div>
                            <div className="text-sm text-blue-600">
                              Effective Min: {effectiveMinimum}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              stockStatus === 'out_of_stock' ? 'bg-red-100 text-red-800' :
                              stockStatus === 'very_low_stock' ? 'bg-orange-100 text-orange-800' :
                              stockStatus === 'low_stock' ? 'bg-yellow-100 text-yellow-800' :
                              stockStatus === 'sufficient' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {stockStatus === 'out_of_stock' ? 'Out of Stock' :
                               stockStatus === 'very_low_stock' ? 'Very Low Stock' :
                               stockStatus === 'low_stock' ? 'Low Stock' :
                               stockStatus === 'sufficient' ? 'Sufficient Stock' :
                               stockStatus}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {/* Only warehouse staff can edit/delete stock locations, admins and managers have view-only access */}
                            {isWarehouse && (
                              <div className="flex space-x-3">
                                <button
                                  onClick={() => {
                                    setStockLocationForm({
                                      warehouseId: location.warehouseId,
                                      itemId: location.itemId,
                                      aisle: location.aisle,
                                      rack: location.rack,
                                      bin: location.bin,
                                      minStock: location.minStock,
                                      maxStock: location.maxStock,
                                      currentStock: location.currentStock
                                    });
                                    setEditingItem(location);
                                    setShowStockLocationModal(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  Edit
                                </button>
                                
                                <button
                                  onClick={async () => {
                                    if (location.currentStock > 0) {
                                      setError('Cannot delete stock location with current stock. Please transfer stock first.');
                                      return;
                                    }
                                    
                                    if (window.confirm(`Are you sure you want to delete stock location ${location.locationCode}?`)) {
                                      try {
                                        setLoading(true);
                                        await stockLocationApi.delete(location.id);
                                        setSuccess('Stock location deleted successfully');
                                        await loadStockLocations();
                                      } catch (err) {
                                        setError('Failed to delete stock location: ' + (err.response?.data?.error || err.message));
                                      } finally {
                                        setLoading(false);
                                      }
                                    }
                                  }}
                                  className={`${
                                    location.currentStock > 0 
                                      ? 'text-gray-400 cursor-not-allowed' 
                                      : 'text-red-600 hover:text-red-900'
                                  }`}
                                  title={location.currentStock > 0 ? 'Cannot delete - stock location has inventory' : 'Delete stock location'}
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex justify-between items-center">
                <div className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {/* Transfer Orders Tab */}
        {activeTab === 'transfer-orders' && (
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Transfer Orders</h2>
            
            {/* Item Search Section */}
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-md font-semibold text-green-900 mb-3">🔍 Search Item Stock Across Warehouses</h3>
              <div className="text-sm text-green-700 mb-3">
                💡 <strong>Tip:</strong> Search for items to see stock levels across all warehouses and create intelligent transfer orders with pre-filled information.
              </div>
              
              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search by item name, SKU, or ID..."
                    value={filters.itemSearch}
                    onChange={(e) => setFilters({...filters, itemSearch: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <button
                  onClick={() => setFilters({...filters, itemSearch: ''})}
                  className="px-4 py-2 text-gray-500 hover:text-gray-700 border border-gray-300 rounded-md"
                  title="Clear search"
                >
                  Clear
                </button>
              </div>
              
              {/* Item Search Results */}
              {filters.itemSearch && (
                <div className="space-y-3">
                  {(() => {
                    const searchTerm = filters.itemSearch.toLowerCase();
                    const matchingItems = items.filter(item => 
                      item.name.toLowerCase().includes(searchTerm) ||
                      item.sku.toLowerCase().includes(searchTerm) ||
                      item.id.toString().includes(searchTerm)
                    );

                    if (matchingItems.length === 0) {
                      return (
                        <div className="text-center text-gray-500 py-4">
                          <div className="text-2xl mb-2">🔍</div>
                          <div>No items found matching "{filters.itemSearch}"</div>
                        </div>
                      );
                    }

                    // Filter to only show items that have stock locations
                    const itemsWithStock = matchingItems.filter(item => {
                      const itemStockLocations = stockLocations.filter(location => 
                        parseInt(location.itemId) === parseInt(item.id)
                      );
                      return itemStockLocations.length > 0;
                    });

                    if (itemsWithStock.length === 0) {
                      return (
                        <div className="text-center text-gray-500 py-4">
                          <div className="text-2xl mb-2">📦</div>
                          <div>No items with stock locations found matching "{filters.itemSearch}"</div>
                        </div>
                      );
                    }

                    return itemsWithStock.map(item => {
                      // Get stock locations for this item across all warehouses
                      const itemStockLocations = stockLocations.filter(location => 
                        parseInt(location.itemId) === parseInt(item.id)
                      );

                      // Group by warehouse
                      const warehouseStocks = {};
                      itemStockLocations.forEach(location => {
                        if (location.warehouse) {
                          const warehouseId = location.warehouse.id;
                          if (!warehouseStocks[warehouseId]) {
                            warehouseStocks[warehouseId] = {
                              warehouse: location.warehouse,
                              totalStock: 0,
                              locationCount: 0,
                              locations: []
                            };
                          }
                          warehouseStocks[warehouseId].totalStock += location.currentStock || 0;
                          warehouseStocks[warehouseId].locationCount += 1;
                          warehouseStocks[warehouseId].locations.push(location);
                        }
                      });

                      const warehouseStockArray = Object.values(warehouseStocks);
                      const totalStock = warehouseStockArray.reduce((sum, ws) => sum + ws.totalStock, 0);
                      
                      // Calculate total effective minimum using proper reorder logic
                      const totalEffectiveMinimum = warehouseStockArray.reduce((sum, ws) => 
                        sum + ws.locations.reduce((locSum, loc) => {
                          const effectiveMin = calculateEffectiveMinimum(loc, item);
                          return locSum + effectiveMin;
                        }, 0), 0
                      );

                      return (
                        <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h4 className="font-semibold text-gray-900">{item.name}</h4>
                              <div className="text-sm text-gray-600">
                                SKU: {item.sku} • ID: {item.id} • Total Stock: {totalStock} {item.unitOfMeasure}
                                <br />
                                <span className="text-blue-600">Item Reorder Threshold: {(item.reorderPoint || 0) + (item.safetyStock || 0)} (RP: {item.reorderPoint || 0} + SS: {item.safetyStock || 0})</span>
                                <br />
                                <span className="font-medium text-gray-700">Total Effective Minimum: {totalEffectiveMinimum}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {warehouseStockArray.map(warehouseStock => (
                              <div key={warehouseStock.warehouse.id} className="bg-gray-50 border border-gray-200 rounded p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="font-medium text-gray-900">
                                    🏢 {warehouseStock.warehouse.name}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {warehouseStock.warehouse.code}
                                  </div>
                                </div>
                                <div className="flex items-center justify-between mb-2">
                                  <div className={`text-lg font-bold ${
                                    warehouseStock.totalStock === 0 ? 'text-red-600' :
                                    warehouseStock.totalStock <= (warehouseStock.locations.reduce((sum, loc) => {
                                      const effectiveMin = calculateEffectiveMinimum(loc, item);
                                      return sum + effectiveMin;
                                    }, 0) * 0.5) ? 'text-orange-600' :
                                    warehouseStock.totalStock <= warehouseStock.locations.reduce((sum, loc) => {
                                      const effectiveMin = calculateEffectiveMinimum(loc, item);
                                      return sum + effectiveMin;
                                    }, 0) ? 'text-yellow-600' :
                                    'text-green-600'
                                  }`}>
                                    {warehouseStock.totalStock}
                                  </div>
                                  <div className="text-right">
                                    <div className="text-xs text-gray-500">
                                      {item.unitOfMeasure}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {warehouseStock.locationCount} locations
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Stock Status Badge */}
                                <div className="mb-2">
                                  {(() => {
                                    const totalEffectiveMinimum = warehouseStock.locations.reduce((sum, loc) => {
                                      const effectiveMin = calculateEffectiveMinimum(loc, item);
                                      return sum + effectiveMin;
                                    }, 0);
                                    const totalMaxStock = warehouseStock.locations.reduce((sum, loc) => sum + (loc.maxStock || 0), 0);
                                    const utilizationPercent = totalMaxStock > 0 ? Math.round((warehouseStock.totalStock / totalMaxStock) * 100) : 0;
                                       
                                    // Use consistent 4-level stock status with proper colors
                                    if (warehouseStock.totalStock === 0) {
                                      return (
                                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                          Out of Stock ({utilizationPercent}% utilized)
                                        </span>
                                      );
                                    } else if (warehouseStock.totalStock <= (totalEffectiveMinimum * 0.5)) {
                                      return (
                                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                                          Very Low Stock ({utilizationPercent}% utilized)
                                        </span>
                                      );
                                    } else if (warehouseStock.totalStock <= totalEffectiveMinimum) {
                                      return (
                                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                          Low Stock ({utilizationPercent}% utilized)
                                        </span>
                                      );
                                    } else {
                                      return (
                                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                          Sufficient Stock ({utilizationPercent}% utilized)
                                        </span>
                                      );
                                    }
                                  })()}
                                </div>
                                
                                {/* Show individual locations */}
                                <div className="mt-2 space-y-1">
                                  <div className="text-xs font-medium text-gray-700 mb-1">📍 Location Details:</div>
                                  {warehouseStock.locations.map(location => {
                                    const effectiveMinimum = calculateEffectiveMinimum(location, item);
                                    const stockStatus = getStockStatus(location, item);
                                    
                                    return (
                                      <div key={location.id} className="text-xs text-gray-600 flex justify-between items-center bg-white rounded px-2 py-1">
                                        <div className="flex items-center space-x-2">
                                          <span className="font-medium">{location.locationCode}</span>
                                          <span className={`inline-flex px-1.5 py-0.5 text-xs font-semibold rounded-full ${
                                            stockStatus === 'out_of_stock' ? 'bg-red-100 text-red-800' :
                                            stockStatus === 'very_low_stock' ? 'bg-orange-100 text-orange-800' :
                                            stockStatus === 'low_stock' ? 'bg-yellow-100 text-yellow-800' :
                                            stockStatus === 'sufficient' ? 'bg-green-100 text-green-800' :
                                            'bg-gray-100 text-gray-800'
                                          }`}>
                                            {stockStatus === 'out_of_stock' ? 'OUT' :
                                             stockStatus === 'very_low_stock' ? 'VERY LOW' :
                                             stockStatus === 'low_stock' ? 'LOW' :
                                             stockStatus === 'sufficient' ? 'OK' :
                                             stockStatus}
                                          </span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <span className="font-medium text-gray-700">
                                            {location.currentStock}
                                          </span>
                                          <span className="text-gray-400">/</span>
                                          <span className="text-blue-600 font-medium">
                                            {location.maxStock}
                                          </span>
                                          <span className="text-gray-400">
                                            (Min: {effectiveMinimum})
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                                
                                {/* Create Transfer Button - Only for warehouse staff */}
                                {isWarehouse && (
                                  <div className="flex justify-end mt-2">
                                    <button
                                      onClick={() => {
                                        if (warehouseStock.totalStock === 0) {
                                          setTransferOrderForm({
                                            fromWarehouseId: '',
                                            toWarehouseId: warehouseStock.warehouse.id,
                                            itemId: item.id,
                                            requestedQuantity: 1,
                                            priority: 'high',
                                            reason: 'Urgent stock request - ' + warehouseStock.warehouse.name + ' is out of stock for ' + item.name + ' (' + item.sku + ')',
                                            expectedDate: ''
                                          });
                                        } else {
                                          setTransferOrderForm({
                                            fromWarehouseId: warehouseStock.warehouse.id,
                                            toWarehouseId: '',
                                            itemId: item.id,
                                            requestedQuantity: Math.min(warehouseStock.totalStock, 1),
                                            priority: 'medium',
                                            reason: 'Transfer request for ' + item.name + ' (' + item.sku + ')',
                                            expectedDate: ''
                                          });
                                        }
                                        setEditingItem(null);
                                        setShowTransferOrderModal(true);
                                      }}
                                      className={`px-2 py-1 text-white text-xs rounded transition-colors ${
                                        warehouseStock.totalStock === 0 
                                          ? 'bg-red-600 hover:bg-red-700' 
                                          : 'bg-blue-600 hover:bg-blue-700'
                                      }`}
                                    >
                                      {warehouseStock.totalStock === 0 ? 'Request Stock' : 'Create Transfer'}
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
            {/* Transfer Orders Filters */}
            <div className="mb-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <input
                type="text"
                placeholder="Search by transfer number, reason, or notes..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                className="border border-gray-300 rounded-md px-3 py-2"
              />
              <select
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <select
                value={filters.priority}
                onChange={(e) => setFilters({...filters, priority: e.target.value})}
                className="border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">All Priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              <select
                value={filters.fromWarehouse}
                onChange={(e) => setFilters({...filters, fromWarehouse: e.target.value})}
                className="border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">All Source Warehouses</option>
                {warehouses.map(warehouse => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
              <select
                value={filters.toWarehouse}
                onChange={(e) => setFilters({...filters, toWarehouse: e.target.value})}
                className="border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">All Destination Warehouses</option>
                {warehouses.map(warehouse => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Transfer Orders Table */}
            {loading ? (
              <div className="text-center py-4">Loading...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Transfer Request/Order
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Item
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        From → To
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Priority
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status & Users
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transferOrders.map((order) => {
                      // Calculate auto priority based on source warehouse stock status
                      const sourceStockLocations = stockLocations.filter(location => 
                        location.warehouseId === order.fromWarehouseId && 
                        location.itemId === order.itemId
                      );
                      const sourceStock = sourceStockLocations.reduce((sum, loc) => sum + (loc.currentStock || 0), 0);
                      const sourceEffectiveMin = sourceStockLocations.reduce((sum, loc) => {
                        const effectiveMin = calculateEffectiveMinimum(loc, order.item);
                        return sum + effectiveMin;
                      }, 0);
                      
                      let autoPriority = 'medium';
                      if (sourceStock === 0) {
                        autoPriority = 'urgent';
                      } else if (sourceStock <= (sourceEffectiveMin * 0.5)) {
                        autoPriority = 'high';
                      } else if (sourceStock <= sourceEffectiveMin) {
                        autoPriority = 'medium';
                      } else {
                        autoPriority = 'low';
                      }

                      return (
                        <tr key={order.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {order.transferNumber || `TO-${order.id}`}
                            </div>
                            <div className="text-sm text-gray-500">
                              Created: {new Date(order.createdAt).toLocaleDateString('en-GB', { 
                                day: '2-digit', 
                                month: '2-digit', 
                                year: 'numeric' 
                              })}
                            </div>
                            {order.expectedDate && (
                              <div className="text-xs text-blue-600">
                                Expected: {new Date(order.expectedDate).toLocaleDateString('en-GB', { 
                                  day: '2-digit', 
                                  month: '2-digit', 
                                  year: 'numeric' 
                                })}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{order.item?.name}</div>
                            <div className="text-sm text-gray-500">SKU: {order.item?.sku}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {order.fromWarehouse?.name} → {order.toWarehouse?.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {order.fromWarehouse?.code} → {order.toWarehouse?.code}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {order.requestedQuantity} {order.item?.unitOfMeasure}
                            </div>
                            {order.approvedQuantity && (
                              <div className="text-sm text-green-600">
                                Approved: {order.approvedQuantity}
                              </div>
                            )}
                            {order.transferredQuantity && (
                              <div className="text-sm text-blue-600">
                                Transferred: {order.transferredQuantity}
                              </div>
                            )}
                            {order.reason && (
                              <div className="text-xs text-gray-500 mt-1 max-w-xs truncate" title={order.reason}>
                                Reason: {order.reason}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              autoPriority === 'urgent' ? 'bg-red-100 text-red-800' :
                              autoPriority === 'high' ? 'bg-orange-100 text-orange-800' :
                              autoPriority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {autoPriority.charAt(0).toUpperCase() + autoPriority.slice(1)} (Auto)
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                order.status === 'completed' ? 'bg-green-100 text-green-800' :
                                order.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                                order.status === 'pending' && order.submittedForApproval ? 'bg-yellow-100 text-yellow-800' :
                                order.status === 'pending' && !order.submittedForApproval ? 'bg-gray-100 text-gray-800' :
                                order.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {order.status === 'pending' && !order.submittedForApproval ? 'Transfer Request (Draft)' : 
                                 order.status === 'pending' && order.submittedForApproval ? 'Transfer Request (Pending Approval)' :
                                 order.status === 'approved' ? 'Transfer Order (Approved)' :
                                 order.status === 'completed' ? 'Transfer Order (Completed)' :
                                 order.status === 'rejected' ? 'Transfer Request (Rejected)' :
                                 order.status === 'cancelled' ? 'Transfer Request (Cancelled)' :
                                 order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                              </span>
                              
                              {/* User Information */}
                              <div className="text-xs text-gray-600 space-y-0.5">
                                <div>
                                  <span className="font-medium">Requested by:</span> {order.requestedBy?.name || 'Unknown'} 
                                  {order.requestedBy?.email && <span className="text-gray-400">({order.requestedBy.email})</span>}
                                </div>
                                {order.approvedBy && (
                                  <div>
                                    <span className="font-medium">Approved by:</span> {order.approvedBy.name}
                                    <span className="text-gray-400"> ({order.approvedBy.email})</span>
                                    {order.approvedAt && (
                                      <div className="text-xs text-gray-500">
                                        on {new Date(order.approvedAt).toLocaleDateString('en-GB', { 
                                          day: '2-digit', 
                                          month: '2-digit', 
                                          year: 'numeric' 
                                        })}
                                      </div>
                                    )}
                                  </div>
                                )}
                                {order.completedBy && (
                                  <div>
                                    <span className="font-medium">Completed by:</span> {order.completedBy.name}
                                    <span className="text-gray-400"> ({order.completedBy.email})</span>
                                    {order.completedAt && (
                                      <div className="text-xs text-gray-500">
                                        on {new Date(order.completedAt).toLocaleDateString('en-GB', { 
                                          day: '2-digit', 
                                          month: '2-digit', 
                                          year: 'numeric' 
                                        })}
                                      </div>
                                    )}
                                  </div>
                                )}
                                {order.cancelledBy && (
                                  <div>
                                    <span className="font-medium">Cancelled by:</span> {order.cancelledBy.name}
                                    <span className="text-gray-400"> ({order.cancelledBy.email})</span>
                                    {order.cancelledAt && (
                                      <div className="text-xs text-gray-500">
                                        on {new Date(order.cancelledAt).toLocaleDateString('en-GB', { 
                                          day: '2-digit', 
                                          month: '2-digit', 
                                          year: 'numeric' 
                                        })}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => {
                                  setSelectedTransferOrder(order);
                                  setShowTransferDetailsModal(true);
                                }}
                                className="text-gray-600 hover:text-gray-900"
                                title="View Details"
                              >
                                👁️ View
                              </button>
                              
                              {/* Only Inventory Manager can approve/reject transfer orders that have been submitted */}
                              {order.status === 'pending' && order.submittedForApproval && isManager && (
                                <div className="flex space-x-2">
                                  <button
                                    onClick={async () => {
                                      try {
                                        setLoading(true);
                                        await transferOrderApi.approve(order.id, {
                                          action: 'approve',
                                          approvedQuantity: order.requestedQuantity,
                                          notes: 'Approved by manager'
                                        });
                                        setSuccess('Transfer request approved successfully (now Transfer Order)');
                                        await loadTransferOrders();
                                      } catch (err) {
                                        setError('Failed to approve transfer order: ' + (err.response?.data?.error || err.message));
                                      } finally {
                                        setLoading(false);
                                      }
                                    }}
                                    className="text-green-600 hover:text-green-900 px-3 py-1 bg-green-50 border border-green-300 rounded text-sm"
                                    disabled={loading}
                                  >
                                    ✅ Approve
                                  </button>
                                  <button
                                    onClick={async () => {
                                      const reason = prompt('Rejection reason (optional):');
                                      try {
                                        setLoading(true);
                                        await transferOrderApi.approve(order.id, {
                                          action: 'reject',
                                          notes: reason || 'Rejected by manager'
                                        });
                                        setSuccess('Transfer request rejected successfully');
                                        await loadTransferOrders();
                                      } catch (err) {
                                        setError('Failed to reject transfer order: ' + (err.response?.data?.error || err.message));
                                      } finally {
                                        setLoading(false);
                                      }
                                    }}
                                    className="text-red-600 hover:text-red-900 px-3 py-1 bg-red-50 border border-red-300 rounded text-sm"
                                    disabled={loading}
                                  >
                                    ❌ Reject
                                  </button>
                                </div>
                              )}
                              
                              {/* Cancel button for pending orders that have been submitted (Manager only) */}
                              {order.status === 'pending' && order.submittedForApproval && isManager && (
                                <button
                                  onClick={async () => {
                                    const reason = prompt('Cancellation reason (required):');
                                    if (reason) {
                                      try {
                                        setLoading(true);
                                        await transferOrderApi.cancel(order.id, {
                                          reason: reason
                                        });
                                        setSuccess('Transfer order cancelled successfully');
                                        await loadTransferOrders();
                                      } catch (err) {
                                        setError('Failed to cancel transfer order: ' + (err.response?.data?.error || err.message));
                                      } finally {
                                        setLoading(false);
                                      }
                                    }
                                  }}
                                  className="text-gray-600 hover:text-gray-900 px-3 py-1 bg-gray-50 border border-gray-300 rounded text-sm"
                                  disabled={loading}
                                >
                                  🚫 Cancel
                                </button>
                              )}
                              
                              {/* Warehouse staff can submit pending orders that haven't been submitted for approval */}
                              {order.status === 'pending' && isWarehouse && !order.submittedForApproval && (
                                <button
                                  onClick={async () => {
                                    try {
                                      setLoading(true);
                                      await transferOrderApi.submit(order.id);
                                      setSuccess('Transfer request submitted for approval successfully');
                                      await loadTransferOrders();
                                    } catch (err) {
                                      setError('Failed to submit transfer order: ' + (err.response?.data?.error || err.message));
                                    } finally {
                                      setLoading(false);
                                    }
                                  }}
                                  className="text-purple-600 hover:text-purple-900 px-3 py-1 bg-purple-50 border border-purple-300 rounded text-sm"
                                >
                                  📤 Submit for Approval
                                </button>
                              )}
                              
                              {/* Only Warehouse Staff can complete transfers */}
                              {order.status === 'approved' && isWarehouse && (
                                <button
                                  onClick={() => {
                                    setSelectedTransferOrder(order);
                                    setCompletionForm({
                                      transferredQuantity: order.approvedQuantity || order.requestedQuantity,
                                      notes: ''
                                    });
                                    setShowCompletionModal(true);
                                  }}
                                  className="text-green-600 hover:text-green-900"
                                >
                                  Complete
                                </button>
                              )}
                              
                              {/* Warehouse staff can edit pending transfer orders that haven't been submitted for approval */}
                              {order.status === 'pending' && isWarehouse && !order.submittedForApproval && (
                                <button
                                  onClick={() => {
                                    setTransferOrderForm({
                                      fromWarehouseId: order.fromWarehouseId,
                                      toWarehouseId: order.toWarehouseId,
                                      itemId: order.itemId,
                                      requestedQuantity: order.requestedQuantity,
                                      priority: order.priority,
                                      reason: order.reason || '',
                                      expectedDate: order.expectedDate || ''
                                    });
                                    setEditingItem(order);
                                    setShowTransferOrderModal(true);
                                  }}
                                  className="text-indigo-600 hover:text-indigo-900 px-3 py-1 bg-indigo-50 border border-indigo-300 rounded text-sm"
                                >
                                  ✏️ Edit
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex justify-between items-center">
                <div className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* Note: Transfer orders can be created using the contextual "Create Transfer" buttons 
                 in the item search results above, which intelligently pre-fill the form */}
          </div>
        )}
      </div>
      {/* Modals */}
      
      {/* Warehouse Modal */}
      {showWarehouseModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingItem ? 'Edit Warehouse' : 'Add Warehouse'}
            </h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setLoading(true);
              try {
                if (editingItem) {
                  await warehouseApi.update(editingItem.id, warehouseForm);
                  setSuccess('Warehouse updated successfully');
                } else {
                  await warehouseApi.create(warehouseForm);
                  setSuccess('Warehouse created successfully');
                }
                setShowWarehouseModal(false);
                setEditingItem(null);
                setWarehouseForm({
                  name: '',
                  code: '',
                  address: '',
                  contactPerson: '',
                  contactPhone: '',
                  contactEmail: ''
                });
                await loadWarehousesWithPagination();
              } catch (err) {
                setError('Failed to save warehouse: ' + (err.response?.data?.error || err.message));
              } finally {
                setLoading(false);
              }
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={warehouseForm.name}
                    onChange={(e) => setWarehouseForm({...warehouseForm, name: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                  <input
                    type="text"
                    value={warehouseForm.code}
                    onChange={(e) => setWarehouseForm({...warehouseForm, code: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <textarea
                    value={warehouseForm.address}
                    onChange={(e) => setWarehouseForm({...warehouseForm, address: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    rows="3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={warehouseForm.contactPerson}
                    onChange={(e) => setWarehouseForm({...warehouseForm, contactPerson: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    value={warehouseForm.contactPhone}
                    onChange={(e) => setWarehouseForm({...warehouseForm, contactPhone: e.target.value})}
                    placeholder="+91 XXXXXXXXXX"
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={warehouseForm.contactEmail}
                    onChange={(e) => setWarehouseForm({...warehouseForm, contactEmail: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowWarehouseModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingItem ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Stock Location Modal */}
      {showStockLocationModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingItem ? 'Edit Stock Location' : 'Add Stock Location'}
            </h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setLoading(true);
              try {
                if (editingItem) {
                  await stockLocationApi.update(editingItem.id, stockLocationForm);
                  setSuccess('Stock location updated successfully');
                } else {
                  await stockLocationApi.create(stockLocationForm);
                  setSuccess('Stock location created successfully');
                }
                setShowStockLocationModal(false);
                setEditingItem(null);
                setStockLocationForm({
                  warehouseId: '',
                  itemId: '',
                  aisle: '',
                  rack: '',
                  bin: '',
                  minStock: 0,
                  maxStock: 100,
                  currentStock: 0
                });
                await loadStockLocations();
              } catch (err) {
                setError('Failed to save stock location: ' + (err.response?.data?.error || err.message));
              } finally {
                setLoading(false);
              }
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse</label>
                  <select
                    value={stockLocationForm.warehouseId}
                    onChange={(e) => setStockLocationForm({...stockLocationForm, warehouseId: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                    disabled={editingItem} // Disable when editing
                  >
                    <option value="">Select warehouse</option>
                    {warehouses.map(warehouse => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name} ({warehouse.code})
                      </option>
                    ))}
                  </select>
                  {editingItem && (
                    <p className="text-xs text-gray-500 mt-1">Warehouse cannot be changed for existing stock location</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Item</label>
                  <select
                    value={stockLocationForm.itemId}
                    onChange={(e) => setStockLocationForm({...stockLocationForm, itemId: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                    disabled={editingItem} // Disable when editing
                  >
                    <option value="">Select item</option>
                    {items.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name} (SKU: {item.sku})
                      </option>
                    ))}
                  </select>
                  {editingItem && (
                    <p className="text-xs text-gray-500 mt-1">Item cannot be changed for existing stock location</p>
                  )}
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Aisle</label>
                    <input
                      type="text"
                      value={stockLocationForm.aisle}
                      onChange={(e) => setStockLocationForm({...stockLocationForm, aisle: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rack</label>
                    <input
                      type="text"
                      value={stockLocationForm.rack}
                      onChange={(e) => setStockLocationForm({...stockLocationForm, rack: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bin</label>
                    <input
                      type="text"
                      value={stockLocationForm.bin}
                      onChange={(e) => setStockLocationForm({...stockLocationForm, bin: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock</label>
                    <input
                      type="number"
                      min="0"
                      value={stockLocationForm.minStock}
                      onChange={(e) => setStockLocationForm({...stockLocationForm, minStock: parseInt(e.target.value)})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Stock</label>
                    <input
                      type="number"
                      min="1"
                      value={stockLocationForm.maxStock}
                      onChange={(e) => setStockLocationForm({...stockLocationForm, maxStock: parseInt(e.target.value)})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Stock</label>
                    <input
                      type="number"
                      min="0"
                      value={stockLocationForm.currentStock}
                      onChange={(e) => setStockLocationForm({...stockLocationForm, currentStock: parseInt(e.target.value)})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      required
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowStockLocationModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingItem ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Transfer Order Modal */}
      {showTransferOrderModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingItem ? 'Edit Transfer Request' : 'Create Transfer Request'}
            </h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              
              // Frontend validation
              if (transferOrderForm.fromWarehouseId === transferOrderForm.toWarehouseId) {
                setError('Source and destination warehouses cannot be the same');
                return;
              }
              
              // Check stock availability
              if (transferOrderForm.fromWarehouseId && transferOrderForm.itemId) {
                const sourceStockLocations = stockLocations.filter(location => 
                  location.warehouseId === parseInt(transferOrderForm.fromWarehouseId) && 
                  location.itemId === parseInt(transferOrderForm.itemId)
                );
                const totalStock = sourceStockLocations.reduce((sum, loc) => sum + (loc.currentStock || 0), 0);
                
                if (totalStock === 0) {
                  setError('Cannot create transfer request: No stock available in source warehouse');
                  return;
                }
                
                if (transferOrderForm.requestedQuantity > totalStock) {
                  setError(`Cannot create transfer request: Requested quantity (${transferOrderForm.requestedQuantity}) exceeds available stock (${totalStock})`);
                  return;
                }
              }
              
              setLoading(true);
              try {
                if (editingItem) {
                  await transferOrderApi.update(editingItem.id, transferOrderForm);
                  setSuccess('Transfer request updated successfully');
                } else {
                  await transferOrderApi.create(transferOrderForm);
                  setSuccess('Transfer request created successfully');
                }
                setShowTransferOrderModal(false);
                setEditingItem(null);
                setTransferOrderForm({
                  fromWarehouseId: '',
                  toWarehouseId: '',
                  itemId: '',
                  requestedQuantity: 1,
                  priority: 'medium',
                  reason: '',
                  expectedDate: ''
                });
                await loadTransferOrders();
              } catch (err) {
                setError('Failed to save transfer request: ' + (err.response?.data?.error || err.message));
              } finally {
                setLoading(false);
              }
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Warehouse</label>
                  <select
                    value={transferOrderForm.fromWarehouseId}
                    onChange={(e) => {
                      const newFromWarehouseId = e.target.value;
                      setTransferOrderForm({
                        ...transferOrderForm, 
                        fromWarehouseId: newFromWarehouseId,
                        // Clear 'to' warehouse if it's the same as the new 'from' warehouse
                        toWarehouseId: transferOrderForm.toWarehouseId === newFromWarehouseId ? '' : transferOrderForm.toWarehouseId
                      });
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  >
                    <option value="">Select source warehouse</option>
                    {warehouses.map(warehouse => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name} ({warehouse.code})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To Warehouse</label>
                  <select
                    value={transferOrderForm.toWarehouseId}
                    onChange={(e) => setTransferOrderForm({...transferOrderForm, toWarehouseId: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  >
                    <option value="">Select destination warehouse</option>
                    {warehouses
                      .filter(warehouse => warehouse.id !== parseInt(transferOrderForm.fromWarehouseId))
                      .map(warehouse => (
                        <option key={warehouse.id} value={warehouse.id}>
                          {warehouse.name} ({warehouse.code})
                        </option>
                      ))}
                  </select>
                  {transferOrderForm.fromWarehouseId && transferOrderForm.toWarehouseId === transferOrderForm.fromWarehouseId && (
                    <p className="text-red-500 text-xs mt-1">Destination warehouse must be different from source warehouse</p>
                  )}
                  {transferOrderForm.fromWarehouseId && transferOrderForm.toWarehouseId && transferOrderForm.fromWarehouseId !== transferOrderForm.toWarehouseId && (
                    <div className="text-green-600 text-xs mt-1 flex items-center">
                      <span className="mr-1">✓</span>
                      Transfer: {warehouses.find(w => w.id === parseInt(transferOrderForm.fromWarehouseId))?.name} → {warehouses.find(w => w.id === parseInt(transferOrderForm.toWarehouseId))?.name}
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Item</label>
                  <select
                    value={transferOrderForm.itemId}
                    onChange={(e) => setTransferOrderForm({...transferOrderForm, itemId: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  >
                    <option value="">Select item</option>
                    {items.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name} (SKU: {item.sku})
                      </option>
                    ))}
                  </select>
                  {transferOrderForm.fromWarehouseId && transferOrderForm.itemId && (
                    <div className="text-xs text-gray-600 mt-1">
                      {(() => {
                        const sourceStockLocations = stockLocations.filter(location => 
                          location.warehouseId === parseInt(transferOrderForm.fromWarehouseId) && 
                          location.itemId === parseInt(transferOrderForm.itemId)
                        );
                        const totalStock = sourceStockLocations.reduce((sum, loc) => sum + (loc.currentStock || 0), 0);
                        const selectedItem = items.find(item => item.id === parseInt(transferOrderForm.itemId));
                        
                        if (sourceStockLocations.length === 0) {
                          return (
                            <span className="text-orange-600">
                              ⚠️ Item not found in source warehouse
                            </span>
                          );
                        }
                        
                        return (
                          <span className={totalStock > 0 ? 'text-green-600' : 'text-red-600'}>
                            📦 Available in source warehouse: {totalStock} {selectedItem?.unitOfMeasure || 'units'}
                          </span>
                        );
                      })()}
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Requested Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={transferOrderForm.requestedQuantity}
                    onChange={(e) => setTransferOrderForm({...transferOrderForm, requestedQuantity: parseInt(e.target.value) || 1})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                  {transferOrderForm.fromWarehouseId && transferOrderForm.itemId && (
                    <div className="text-xs text-gray-600 mt-1">
                      {(() => {
                        const sourceStockLocations = stockLocations.filter(location => 
                          location.warehouseId === parseInt(transferOrderForm.fromWarehouseId) && 
                          location.itemId === parseInt(transferOrderForm.itemId)
                        );
                        const totalStock = sourceStockLocations.reduce((sum, loc) => sum + (loc.currentStock || 0), 0);
                        
                        if (totalStock === 0) {
                          return (
                            <span className="text-red-600">
                              ❌ No stock available in source warehouse
                            </span>
                          );
                        }
                        
                        if (transferOrderForm.requestedQuantity > totalStock) {
                          return (
                            <span className="text-orange-600">
                              ⚠️ Requested quantity ({transferOrderForm.requestedQuantity}) exceeds available stock ({totalStock})
                            </span>
                          );
                        }
                        
                        return (
                          <span className="text-green-600">
                            ✓ Sufficient stock available ({totalStock} units)
                          </span>
                        );
                      })()}
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={transferOrderForm.priority}
                    onChange={(e) => setTransferOrderForm({...transferOrderForm, priority: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                  <textarea
                    value={transferOrderForm.reason}
                    onChange={(e) => setTransferOrderForm({...transferOrderForm, reason: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    rows="3"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expected Date</label>
                  <input
                    type="date"
                    value={transferOrderForm.expectedDate ? new Date(transferOrderForm.expectedDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => setTransferOrderForm({...transferOrderForm, expectedDate: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowTransferOrderModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                >
                  {editingItem ? 'Update Request' : 'Create Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Approval Modal */}
      {showApprovalModal && selectedTransferOrder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              Review Transfer Order TO-{selectedTransferOrder.id}
            </h3>
            <div className="mb-4 p-4 bg-gray-50 rounded">
              <div className="text-sm">
                <div><strong>Item:</strong> {selectedTransferOrder.item?.name} ({selectedTransferOrder.item?.sku})</div>
                <div><strong>From:</strong> {selectedTransferOrder.fromWarehouse?.name}</div>
                <div><strong>To:</strong> {selectedTransferOrder.toWarehouse?.name}</div>
                <div><strong>Requested:</strong> {selectedTransferOrder.requestedQuantity} {selectedTransferOrder.item?.unitOfMeasure}</div>
                <div><strong>Priority:</strong> {selectedTransferOrder.priority}</div>
              </div>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setLoading(true);
              try {
                await transferOrderApi.approve(selectedTransferOrder.id, approvalForm);
                setSuccess(`Transfer order ${approvalForm.action}d successfully`);
                setShowApprovalModal(false);
                setSelectedTransferOrder(null);
                setApprovalForm({
                  action: 'approve',
                  approvedQuantity: 0,
                  notes: ''
                });
                await loadTransferOrders();
              } catch (err) {
                setError('Failed to process approval: ' + (err.response?.data?.error || err.message));
              } finally {
                setLoading(false);
              }
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                  <select
                    value={approvalForm.action}
                    onChange={(e) => setApprovalForm({...approvalForm, action: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="approve">Approve</option>
                    <option value="reject">Reject</option>
                  </select>
                </div>
                
                {approvalForm.action === 'approve' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Approved Quantity</label>
                    <input
                      type="number"
                      min="1"
                      max={selectedTransferOrder.requestedQuantity}
                      value={approvalForm.approvedQuantity}
                      onChange={(e) => setApprovalForm({...approvalForm, approvedQuantity: parseInt(e.target.value)})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      required
                    />
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={approvalForm.notes}
                    onChange={(e) => setApprovalForm({...approvalForm, notes: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    rows="3"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowApprovalModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-white rounded-md ${
                    approvalForm.action === 'approve' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {approvalForm.action === 'approve' ? 'Approve' : 'Reject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Completion Modal */}
      {showCompletionModal && selectedTransferOrder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              Complete Transfer Order TO-{selectedTransferOrder.id}
            </h3>
            <div className="mb-4 p-4 bg-gray-50 rounded">
              <div className="text-sm">
                <div><strong>Item:</strong> {selectedTransferOrder.item?.name} ({selectedTransferOrder.item?.sku})</div>
                <div><strong>From:</strong> {selectedTransferOrder.fromWarehouse?.name}</div>
                <div><strong>To:</strong> {selectedTransferOrder.toWarehouse?.name}</div>
                <div><strong>Approved:</strong> {selectedTransferOrder.approvedQuantity} {selectedTransferOrder.item?.unitOfMeasure}</div>
              </div>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setLoading(true);
              try {
                await transferOrderApi.complete(selectedTransferOrder.id, completionForm);
                setSuccess('Transfer order completed successfully');
                setShowCompletionModal(false);
                setSelectedTransferOrder(null);
                setCompletionForm({
                  transferredQuantity: 0,
                  notes: ''
                });
                await loadTransferOrders();
              } catch (err) {
                setError('Failed to complete transfer: ' + (err.response?.data?.error || err.message));
              } finally {
                setLoading(false);
              }
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transferred Quantity</label>
                  <input
                    type="number"
                    min="1"
                    max={selectedTransferOrder.approvedQuantity}
                    value={completionForm.transferredQuantity}
                    onChange={(e) => setCompletionForm({...completionForm, transferredQuantity: parseInt(e.target.value)})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={completionForm.notes}
                    onChange={(e) => setCompletionForm({...completionForm, notes: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    rows="3"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCompletionModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Complete Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Transfer Order Details Modal */}
      {showTransferDetailsModal && selectedTransferOrder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                Transfer Order Details - {selectedTransferOrder.transferNumber || `TO-${selectedTransferOrder.id}`}
              </h3>
              <button
                onClick={() => setShowTransferDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded">
                  <h4 className="font-medium text-gray-900 mb-2">Order Information</h4>
                  <div className="space-y-1 text-sm">
                    <div><strong>Transfer Number:</strong> {selectedTransferOrder.transferNumber || `TO-${selectedTransferOrder.id}`}</div>
                    <div><strong>Created:</strong> {new Date(selectedTransferOrder.createdAt).toLocaleString()}</div>
                    <div><strong>Status:</strong> 
                      <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${
                        selectedTransferOrder.status === 'completed' ? 'bg-green-100 text-green-800' :
                        selectedTransferOrder.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                        selectedTransferOrder.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {selectedTransferOrder.status.charAt(0).toUpperCase() + selectedTransferOrder.status.slice(1)}
                      </span>
                    </div>
                    <div><strong>Priority:</strong> 
                      <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${
                        selectedTransferOrder.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                        selectedTransferOrder.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        selectedTransferOrder.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {selectedTransferOrder.priority.charAt(0).toUpperCase() + selectedTransferOrder.priority.slice(1)}
                      </span>
                    </div>
                    {selectedTransferOrder.expectedDate && (
                      <div><strong>Expected Date:</strong> {new Date(selectedTransferOrder.expectedDate).toLocaleDateString('en-GB', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: 'numeric' 
                      })}</div>
                    )}
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded">
                  <h4 className="font-medium text-gray-900 mb-2">Item & Quantity</h4>
                  <div className="space-y-1 text-sm">
                    <div><strong>Item:</strong> {selectedTransferOrder.item?.name}</div>
                    <div><strong>SKU:</strong> {selectedTransferOrder.item?.sku}</div>
                    <div><strong>Unit:</strong> {selectedTransferOrder.item?.unitOfMeasure}</div>
                    <div><strong>Requested:</strong> {selectedTransferOrder.requestedQuantity}</div>
                    {selectedTransferOrder.approvedQuantity && (
                      <div><strong>Approved:</strong> {selectedTransferOrder.approvedQuantity}</div>
                    )}
                    {selectedTransferOrder.transferredQuantity && (
                      <div><strong>Transferred:</strong> {selectedTransferOrder.transferredQuantity}</div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Warehouse Information */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded">
                  <h4 className="font-medium text-gray-900 mb-2">📤 From Warehouse</h4>
                  <div className="space-y-1 text-sm">
                    <div><strong>Name:</strong> {selectedTransferOrder.fromWarehouse?.name}</div>
                    <div><strong>Code:</strong> {selectedTransferOrder.fromWarehouse?.code}</div>
                    {selectedTransferOrder.fromWarehouse?.address && (
                      <div><strong>Address:</strong> {selectedTransferOrder.fromWarehouse.address}</div>
                    )}
                  </div>
                </div>
                
                <div className="bg-green-50 p-4 rounded">
                  <h4 className="font-medium text-gray-900 mb-2">📥 To Warehouse</h4>
                  <div className="space-y-1 text-sm">
                    <div><strong>Name:</strong> {selectedTransferOrder.toWarehouse?.name}</div>
                    <div><strong>Code:</strong> {selectedTransferOrder.toWarehouse?.code}</div>
                    {selectedTransferOrder.toWarehouse?.address && (
                      <div><strong>Address:</strong> {selectedTransferOrder.toWarehouse.address}</div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* User Actions Timeline */}
              <div className="bg-gray-50 p-4 rounded">
                <h4 className="font-medium text-gray-900 mb-3">👥 Action Timeline</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <div className="text-sm">
                      <strong>Requested by:</strong> {selectedTransferOrder.requestedBy?.name || 'Unknown'}
                      {selectedTransferOrder.requestedBy?.email && <span className="text-gray-400"> ({selectedTransferOrder.requestedBy.email})</span>}
                      <div className="text-gray-500">
                        {new Date(selectedTransferOrder.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  
                  {selectedTransferOrder.approvedBy && (
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${selectedTransferOrder.status === 'rejected' ? 'bg-red-500' : 'bg-green-500'}`}></div>
                      <div className="text-sm">
                        <strong>{selectedTransferOrder.status === 'rejected' ? 'Rejected' : 'Approved'} by:</strong> {selectedTransferOrder.approvedBy.name}
                        <span className="text-gray-400"> ({selectedTransferOrder.approvedBy.email})</span>
                        {selectedTransferOrder.approvedAt && (
                          <div className="text-gray-500">
                            {new Date(selectedTransferOrder.approvedAt).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {selectedTransferOrder.completedBy && (
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <div className="text-sm">
                        <strong>Completed by:</strong> {selectedTransferOrder.completedBy.name}
                        <span className="text-gray-400"> ({selectedTransferOrder.completedBy.email})</span>
                        {selectedTransferOrder.completedAt && (
                          <div className="text-gray-500">
                            {new Date(selectedTransferOrder.completedAt).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {selectedTransferOrder.cancelledBy && (
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <div className="text-sm">
                        <strong>Cancelled by:</strong> {selectedTransferOrder.cancelledBy.name}
                        <span className="text-gray-400"> ({selectedTransferOrder.cancelledBy.email})</span>
                        {selectedTransferOrder.cancelledAt && (
                          <div className="text-gray-500">
                            {new Date(selectedTransferOrder.cancelledAt).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Reason */}
              {selectedTransferOrder.reason && (
                <div className="bg-yellow-50 p-4 rounded">
                  <h4 className="font-medium text-gray-900 mb-2">📝 Reason</h4>
                  <p className="text-sm text-gray-700">{selectedTransferOrder.reason}</p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowTransferDetailsModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockWarehouse;