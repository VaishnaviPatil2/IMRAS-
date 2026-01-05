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
      'acknowledged': { color: 'bg-green-100 text-green-800', text: 'Accepted' },
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

  const canRespond = (po) => {
    return ['draft', 'sent'].includes(po.status);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          {supplierInfo && (
            <p className="text-gray-600">Welcome, {supplierInfo.name}</p>
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

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Status</option>
              <option value="sent">Pending Response</option>
              <option value="acknowledged">Accepted</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Purchase Orders */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Your Purchase Orders</h2>
          
          {loading ? (
            <div className="text-center py-8">Loading purchase orders...</div>
          ) : purchaseOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No purchase orders found. {statusFilter && `Try clearing the status filter.`}
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
                      Quantity & Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Delivery
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
                  {purchaseOrders.map((po) => (
                    <tr key={po.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{po.poNumber}</div>
                        <div className="text-sm text-gray-500">
                          {getPriorityBadge(po.priority)}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          Created: {new Date(po.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{po.item?.name}</div>
                        <div className="text-sm text-gray-500">{po.item?.sku}</div>
                        <div className="text-xs text-gray-400">{po.item?.category?.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">Qty: {po.orderedQuantity}</div>
                        <div className="text-sm text-gray-500">Unit: ${po.unitPrice}</div>
                        <div className="text-sm font-medium text-gray-900">Total: ${po.totalAmount}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          To: {po.warehouse?.name}
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(po.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {canRespond(po) ? (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => openResponseModal(po, 'accept')}
                              className="text-green-600 hover:text-green-900 px-2 py-1 border border-green-300 rounded text-xs"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => openResponseModal(po, 'delay')}
                              className="text-yellow-600 hover:text-yellow-900 px-2 py-1 border border-yellow-300 rounded text-xs"
                            >
                              Delay
                            </button>
                            <button
                              onClick={() => openResponseModal(po, 'reject')}
                              className="text-red-600 hover:text-red-900 px-2 py-1 border border-red-300 rounded text-xs"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-500 text-xs">No actions available</span>
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
              <div className="text-sm text-gray-600">Total: ${selectedPO.totalAmount}</div>
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