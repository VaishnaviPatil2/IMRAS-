import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { fetchAllPurchaseOrders } from '../api/purchaseOrderApi';
import { fetchSuppliers } from '../api/supplierApi';

const PurchaseOrder = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data states
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    supplierId: ''
  });

  // Modal states
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const isWarehouse = user?.role === 'warehouse';
  
  // Access levels based on backend response
  const [accessLevel, setAccessLevel] = useState('none');
  
  // Determine user capabilities
  const canApprovePO = isAdmin;
  const canEditPO = isAdmin;
  const canCancelPO = isAdmin;
  const canViewAll = isAdmin || isManager;
  const isLimitedAccess = isWarehouse;

  // Early return for testing - if user is not loaded yet
  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading user information...</p>
        </div>
      </div>
    );
  }

  console.log('PurchaseOrder component rendering, user:', user);
  console.log('Purchase orders data:', purchaseOrders);

  // Load data on component mount
  useEffect(() => {
    loadPurchaseOrders();
    loadSuppliers();
  }, [filters]);

  const loadPurchaseOrders = async () => {
    setLoading(true);
    try {
      console.log('Loading purchase orders with filters:', filters);
      const response = await fetchAllPurchaseOrders(filters);
      console.log('Purchase orders response:', response);
      
      if (response.success) {
        setPurchaseOrders(response.data || []);
        setAccessLevel(response.accessLevel || 'none');
        console.log('Purchase orders loaded:', response.data?.length || 0);
        console.log('Access level:', response.accessLevel);
      } else {
        setError('Failed to load purchase orders: ' + (response.message || 'Unknown error'));
        setPurchaseOrders([]);
      }
    } catch (err) {
      console.error('Load purchase orders error:', err);
      setError('Failed to load purchase orders: ' + (err.error || err.message || 'Unknown error'));
      setPurchaseOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSuppliers = async () => {
    try {
      const response = await fetchSuppliers();
      // Handle different response formats from supplier API
      if (response.success || Array.isArray(response)) {
        const supplierData = response.suppliers || response.data || response;
        setSuppliers(supplierData);
      }
    } catch (err) {
      console.error('Failed to load suppliers:', err);
      setSuppliers([]);
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

  const openDetailsModal = (po) => {
    setSelectedPO(po);
    setShowDetailsModal(true);
  };

  // Admin-only PO actions
  const approvePO = async (poId) => {
    if (!canApprovePO) return;
    
    try {
      setLoading(true);
      // Add API call for PO approval
      setSuccess('Purchase order approved successfully');
      await loadPurchaseOrders();
    } catch (err) {
      setError('Failed to approve purchase order');
    } finally {
      setLoading(false);
    }
  };

  const rejectPO = async (poId) => {
    if (!canApprovePO) return;
    
    const reason = prompt('Please provide reason for rejection:');
    if (!reason) return;
    
    try {
      setLoading(true);
      // Add API call for PO rejection
      setSuccess('Purchase order rejected successfully');
      await loadPurchaseOrders();
    } catch (err) {
      setError('Failed to reject purchase order');
    } finally {
      setLoading(false);
    }
  };

  const editPO = async (poId) => {
    if (!canEditPO) return;
    
    // Open edit modal or navigate to edit page
    setError('Edit functionality coming soon');
  };

  const cancelPO = async (poId) => {
    if (!canCancelPO) return;
    
    const reason = prompt('Please provide reason for cancellation:');
    if (!reason) return;
    
    try {
      setLoading(true);
      // Add API call for PO cancellation
      setSuccess('Purchase order cancelled successfully');
      await loadPurchaseOrders();
    } catch (err) {
      setError('Failed to cancel purchase order');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'draft': { color: 'bg-gray-100 text-gray-800', text: 'Draft' },
      'sent': { color: 'bg-blue-100 text-blue-800', text: 'Sent to Supplier' },
      'acknowledged': { color: 'bg-green-100 text-green-800', text: 'Acknowledged' },
      'partially_received': { color: 'bg-yellow-100 text-yellow-800', text: 'Partially Received' },
      'completed': { color: 'bg-green-100 text-green-800', text: 'Completed' },
      'cancelled': { color: 'bg-red-100 text-red-800', text: 'Cancelled' }
    };

    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', text: status };
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const priorityConfig = {
      'low': { color: 'bg-gray-100 text-gray-800', text: 'Low' },
      'medium': { color: 'bg-blue-100 text-blue-800', text: 'Medium' },
      'high': { color: 'bg-orange-100 text-orange-800', text: 'High' },
      'urgent': { color: 'bg-red-100 text-red-800', text: 'Urgent' }
    };

    const config = priorityConfig[priority] || { color: 'bg-gray-100 text-gray-800', text: priority };
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
        {config.text}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
        
        {/* Role-based header info removed */}
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

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent to Supplier</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="partially_received">Partially Received</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={filters.priority}
              onChange={(e) => setFilters({...filters, priority: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
            <select
              value={filters.supplierId}
              onChange={(e) => setFilters({...filters, supplierId: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Suppliers</option>
              {suppliers.map(supplier => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Purchase Orders Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Purchase Orders</h2>
          
          {loading ? (
            <div className="text-center py-8">Loading purchase orders...</div>
          ) : purchaseOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mb-4">
                <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Purchase Orders Found</h3>
              <p className="text-gray-600 mb-4">
                {filters.status || filters.priority || filters.supplierId 
                  ? 'No purchase orders match your current filters. Try clearing the filters.' 
                  : 'No purchase orders have been created yet. Purchase orders are automatically generated from approved purchase requests.'}
              </p>
              {(filters.status || filters.priority || filters.supplierId) && (
                <button
                  onClick={() => setFilters({ status: '', priority: '', supplierId: '' })}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      PO Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Supplier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity & Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Delivery
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {purchaseOrders.map((po) => (
                    <tr key={po.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{po.poNumber}</div>
                        <div className="text-sm text-gray-500">
                          From: {po.purchaseRequest?.prNumber || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {po.isAutoGenerated ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                              Auto-Generated
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                              Manual
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          Created: {new Date(po.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{po.item?.name || 'N/A'}</div>
                        <div className="text-sm text-gray-500">{po.item?.sku || 'N/A'}</div>
                        <div className="text-xs text-gray-400">{po.item?.category?.name || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{po.supplier?.name || 'N/A'}</div>
                        <div className="text-sm text-gray-500">{po.supplier?.email || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">Qty: {po.orderedQuantity || 0}</div>
                        <div className="text-sm text-gray-500">Unit: ${po.unitPrice || 0}</div>
                        <div className="text-sm font-medium text-gray-900">Total: ${po.totalAmount || 0}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getPriorityBadge(po.priority)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(po.status)}
                        {po.sentAt && (
                          <div className="text-xs text-gray-400 mt-1">
                            Sent: {new Date(po.sentAt).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          To: {po.warehouse?.name || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">
                          Expected: {po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString() : 'TBD'}
                        </div>
                        {po.actualDeliveryDate && (
                          <div className="text-sm text-green-600">
                            Confirmed: {new Date(po.actualDeliveryDate).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openDetailsModal(po)}
                            className="text-blue-600 hover:text-blue-900 px-2 py-1 border border-blue-300 rounded text-xs"
                          >
                            View Details
                          </button>
                          
                          {/* Admin-only actions */}
                          {canApprovePO && po.status === 'draft' && (
                            <>
                              <button
                                onClick={() => approvePO(po.id)}
                                className="text-green-600 hover:text-green-900 px-2 py-1 border border-green-300 rounded text-xs"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => rejectPO(po.id)}
                                className="text-red-600 hover:text-red-900 px-2 py-1 border border-red-300 rounded text-xs"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          
                          {canEditPO && po.status === 'draft' && (
                            <button
                              onClick={() => editPO(po.id)}
                              className="text-yellow-600 hover:text-yellow-900 px-2 py-1 border border-yellow-300 rounded text-xs"
                            >
                              Edit
                            </button>
                          )}
                          
                          {canCancelPO && !['completed', 'cancelled'].includes(po.status) && (
                            <button
                              onClick={() => cancelPO(po.id)}
                              className="text-red-600 hover:text-red-900 px-2 py-1 border border-red-300 rounded text-xs"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedPO && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Purchase Order Details</h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">PO Number</label>
                  <div className="text-sm text-gray-900">{selectedPO.poNumber}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <div>{getStatusBadge(selectedPO.status)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Priority</label>
                  <div>{getPriorityBadge(selectedPO.priority)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <div>
                    {selectedPO.isAutoGenerated ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                        Auto-Generated
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                        Manual
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Item Details */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-2">Item Information</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Item Name</label>
                      <div className="text-sm text-gray-900">{selectedPO.item?.name || 'N/A'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">SKU</label>
                      <div className="text-sm text-gray-900">{selectedPO.item?.sku || 'N/A'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Category</label>
                      <div className="text-sm text-gray-900">{selectedPO.item?.category?.name || 'N/A'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Quantity</label>
                      <div className="text-sm text-gray-900">{selectedPO.orderedQuantity || 0}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Supplier Details */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-2">Supplier Information</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Supplier Name</label>
                      <div className="text-sm text-gray-900">{selectedPO.supplier?.name || 'N/A'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <div className="text-sm text-gray-900">{selectedPO.supplier?.email || 'N/A'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing Details */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-2">Pricing Information</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Unit Price</label>
                      <div className="text-sm text-gray-900">${selectedPO.unitPrice || 0}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Quantity</label>
                      <div className="text-sm text-gray-900">{selectedPO.orderedQuantity || 0}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Total Amount</label>
                      <div className="text-lg font-medium text-gray-900">${selectedPO.totalAmount || 0}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery Details */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-2">Delivery Information</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Delivery Location</label>
                      <div className="text-sm text-gray-900">{selectedPO.warehouse?.name || 'N/A'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Expected Delivery</label>
                      <div className="text-sm text-gray-900">
                        {selectedPO.expectedDeliveryDate ? new Date(selectedPO.expectedDeliveryDate).toLocaleDateString() : 'TBD'}
                      </div>
                    </div>
                    {selectedPO.actualDeliveryDate && (
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Confirmed Delivery</label>
                        <div className="text-sm text-green-600">
                          {new Date(selectedPO.actualDeliveryDate).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-2">Timeline</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-700">Created:</span>
                      <span className="text-sm text-gray-900">{new Date(selectedPO.createdAt).toLocaleString()}</span>
                    </div>
                    {selectedPO.sentAt && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-700">Sent to Supplier:</span>
                        <span className="text-sm text-gray-900">{new Date(selectedPO.sentAt).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-700">Created By:</span>
                      <span className="text-sm text-gray-900">{selectedPO.createdBy?.name || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowDetailsModal(false)}
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

export default PurchaseOrder;