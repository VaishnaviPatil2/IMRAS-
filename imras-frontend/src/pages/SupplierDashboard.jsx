import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { fetchSupplierPurchaseOrders, respondToPurchaseOrder } from '../api/purchaseOrderApi';

const SupplierDashboard = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data states
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [supplierInfo, setSupplierInfo] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');

  // Modal states
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [responseAction, setResponseAction] = useState('');

  // Response form
  const [responseForm, setResponseForm] = useState({
    notes: '',
    proposedDeliveryDate: ''
  });

  // Load purchase orders
  useEffect(() => {
    loadPurchaseOrders();
  }, [statusFilter]);

  const loadPurchaseOrders = async () => {
    setLoading(true);
    try {
      const response = await fetchSupplierPurchaseOrders({
        status: statusFilter
      });
      
      if (response.success) {
        setPurchaseOrders(response.data || []);
        setSupplierInfo(response.supplier);
      } else {
        setError('Failed to load purchase orders');
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

  const handleResponseSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedPO || !responseAction) return;

    // Validation
    if (responseAction === 'delay' && !responseForm.proposedDeliveryDate) {
      setError('Proposed delivery date is required for delay requests');
      return;
    }

    try {
      setLoading(true);
      
      const responseData = {
        action: responseAction,
        notes: responseForm.notes,
        proposedDeliveryDate: responseForm.proposedDeliveryDate
      };

      const response = await respondToPurchaseOrder(selectedPO.id, responseData);
      
      if (response.success) {
        setSuccess(`Purchase order ${responseAction}ed successfully`);
        setShowResponseModal(false);
        setSelectedPO(null);
        setResponseAction('');
        setResponseForm({ notes: '', proposedDeliveryDate: '' });
        await loadPurchaseOrders();
      } else {
        setError('Failed to respond to purchase order');
      }
    } catch (err) {
      setError('Failed to respond: ' + (err.error || err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const openResponseModal = (po, action) => {
    setSelectedPO(po);
    setResponseAction(action);
    setResponseForm({
      notes: '',
      proposedDeliveryDate: action === 'delay' ? '' : (po.expectedDeliveryDate ? po.expectedDeliveryDate.split('T')[0] : '')
    });
    setShowResponseModal(true);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'draft': { color: 'bg-gray-100 text-gray-800', text: 'Draft' },
      'sent': { color: 'bg-blue-100 text-blue-800', text: 'Pending Response' },
      'acknowledged': { color: 'bg-green-100 text-green-800', text: 'Acknowledged' },
      'delay_requested': { color: 'bg-orange-100 text-orange-800', text: 'Delay Requested' },
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

  // Format date to dd/mm/yyyy
  const formatDate = (dateString) => {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB'); // dd/mm/yyyy format
  };

  const canRespond = (po) => {
    // Suppliers can only respond to POs that are SENT to them
    // Draft POs are not visible to suppliers (handled by backend)
    return po.status === 'sent';
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Professional Styling */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 rounded-2xl p-8 text-white shadow-2xl mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Purchase Orders Dashboard
            </h1>
            {supplierInfo && (
              <div className="space-y-2">
                <p className="text-blue-100 text-lg">Welcome, {supplierInfo.name}!</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
            <div className="text-2xl font-bold">{purchaseOrders.length}</div>
            <div className="text-sm text-blue-100">Total Orders</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-yellow-300">
              {purchaseOrders.filter(po => po.status === 'sent').length}
            </div>
            <div className="text-sm text-blue-100">Pending Response</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-300">
              {purchaseOrders.filter(po => po.status === 'acknowledged').length}
            </div>
            <div className="text-sm text-blue-100">Acknowledged</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-purple-300">
              {purchaseOrders.filter(po => po.status === 'completed').length}
            </div>
            <div className="text-sm text-blue-100">Completed</div>
          </div>
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

      {/* Enhanced Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">
          Filter Orders
        </h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <option value="">All Status</option>
              <option value="sent">Pending Response</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="delay_requested">Delay Requested</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setStatusFilter('')}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
            >
              Clear Filter
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Purchase Orders Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800">
              Your Purchase Orders
              {purchaseOrders.length > 0 && (
                <span className="ml-3 bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                  {purchaseOrders.length} orders
                </span>
              )}
            </h2>
            {purchaseOrders.filter(po => po.status === 'sent').length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2">
                <div className="flex items-center text-yellow-800">
                  <span className="font-medium">
                    {purchaseOrders.filter(po => po.status === 'sent').length} orders awaiting your response
                  </span>
                </div>
              </div>
            )}
          </div>
          
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading purchase orders...</p>
            </div>
          ) : purchaseOrders.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Purchase Orders Found</h3>
              <p className="text-gray-500">
                {statusFilter ? 'Try clearing the status filter to see all orders.' : 'No purchase orders have been sent to you yet.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order Details
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item Information
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity & Pricing
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Delivery Details
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {purchaseOrders.map((po) => (
                    <tr key={po.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{po.poNumber}</div>
                          <div className="text-sm text-gray-500">
                            Created: {formatDate(po.createdAt)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{po.item?.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <span className="font-medium">Qty:</span> {po.orderedQuantity}
                        </div>
                        <div className="text-sm text-gray-500">
                          <span className="font-medium">Unit Price:</span> {po.unitPrice}
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          <span className="font-medium">Total:</span> {po.totalAmount}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <span className="font-medium">To:</span> {po.warehouse?.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          <span className="font-medium">Expected:</span> {po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString() : 'TBD'}
                        </div>
                        {po.actualDeliveryDate && (
                          <div className="text-sm text-green-600">
                            <span className="font-medium">Delivered:</span> {new Date(po.actualDeliveryDate).toLocaleDateString()}
                          </div>
                        )}
                        {po.proposedDeliveryDate && (
                          <div className="text-sm text-orange-600">
                            <span className="font-medium">Proposed:</span> {new Date(po.proposedDeliveryDate).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-2">
                          {getStatusBadge(po.status)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {canRespond(po) ? (
                          <div className="flex flex-col space-y-2">
                            <button
                              onClick={() => openResponseModal(po, 'accept')}
                              className="bg-green-50 hover:bg-green-100 text-green-700 font-medium py-2 px-4 rounded-lg border border-green-200 transition-colors flex items-center justify-center"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => openResponseModal(po, 'delay')}
                              className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700 font-medium py-2 px-4 rounded-lg border border-yellow-200 transition-colors flex items-center justify-center"
                            >
                              Request Delay
                            </button>
                            <button
                              onClick={() => openResponseModal(po, 'reject')}
                              className="bg-red-50 hover:bg-red-100 text-red-700 font-medium py-2 px-4 rounded-lg border border-red-200 transition-colors flex items-center justify-center"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <div className="text-center">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {po.status === 'acknowledged' ? 'Acknowledged' :
                               po.status === 'delay_requested' ? 'Delay Pending' :
                               po.status === 'completed' ? 'Completed' :
                               po.status === 'cancelled' ? 'Cancelled' : 'No Actions'}
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Response Modal */}
      {showResponseModal && selectedPO && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {responseAction.charAt(0).toUpperCase() + responseAction.slice(1)} Purchase Order
            </h3>
            
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <div className="text-sm font-medium">{selectedPO.poNumber}</div>
              <div className="text-sm text-gray-600">{selectedPO.item?.name}</div>
              <div className="text-sm text-gray-600">Quantity: {selectedPO.orderedQuantity}</div>
              <div className="text-sm text-gray-600">Total: {selectedPO.totalAmount}</div>
            </div>
            
            <form onSubmit={handleResponseSubmit} className="space-y-4">
              {responseAction === 'delay' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Proposed Delivery Date *
                  </label>
                  <input
                    type="date"
                    value={responseForm.proposedDeliveryDate}
                    onChange={(e) => setResponseForm({...responseForm, proposedDeliveryDate: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>
              )}
              
              {responseAction === 'accept' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Delivery Date
                  </label>
                  <input
                    type="date"
                    value={responseForm.proposedDeliveryDate}
                    onChange={(e) => setResponseForm({...responseForm, proposedDeliveryDate: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Leave blank to use expected delivery date
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {responseAction === 'reject' ? 'Rejection Reason' : 'Notes'} 
                  {responseAction === 'reject' && ' *'}
                </label>
                <textarea
                  value={responseForm.notes}
                  onChange={(e) => setResponseForm({...responseForm, notes: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  rows="3"
                  placeholder={
                    responseAction === 'accept' ? 'Any additional notes...' :
                    responseAction === 'reject' ? 'Please provide reason for rejection...' :
                    'Reason for delay request...'
                  }
                  required={responseAction === 'reject'}
                />
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowResponseModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-4 py-2 rounded-md text-white font-medium disabled:opacity-50 ${
                    responseAction === 'accept' ? 'bg-green-600 hover:bg-green-700' :
                    responseAction === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                    'bg-yellow-600 hover:bg-yellow-700'
                  }`}
                >
                  {loading ? 'Processing...' : `${responseAction.charAt(0).toUpperCase() + responseAction.slice(1)} Order`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierDashboard;