import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const GRN = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data states
  const [grns, setGrns] = useState([]);
  const [acknowledgedPOs, setAcknowledgedPOs] = useState([]);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [selectedGRN, setSelectedGRN] = useState(null);

  // Form state
  const [grnForm, setGrnForm] = useState({
    quantityReceived: '',
    batchNumber: '',
    expiryDate: '',
    notes: ''
  });

  // Role checks
  const isWarehouse = user?.role === 'warehouse';
  const isManager = user?.role === 'manager';
  const canCreateGRN = isWarehouse;
  const canApproveGRN = isManager;

  useEffect(() => {
    loadGRNs();
    if (canCreateGRN) {
      loadAcknowledgedPOs();
    }
  }, []);

  const loadGRNs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No authentication token found');
        return;
      }

      console.log('🔍 Loading GRNs from API...');
      
      const response = await fetch('/api/grn', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 GRN API Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ GRN API Error:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('✅ GRN API Data:', data);
      
      if (data.success) {
        setGrns(data.data || []);
        console.log(`📄 Loaded ${data.data?.length || 0} GRNs`);
      } else {
        setError('Failed to load GRNs: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('❌ GRN load error:', err);
      setError('Failed to load GRNs: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAcknowledgedPOs = async () => {
    try {
      const response = await fetch('/api/purchase-orders/all?status=acknowledged', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Filter POs that don't have GRN yet
        const posWithoutGRN = data.data.filter(po => !grns.some(grn => grn.poId === po.id));
        setAcknowledgedPOs(posWithoutGRN);
      }
    } catch (err) {
      console.error('Failed to load acknowledged POs:', err);
    }
  };

  const createGRN = async (e) => {
    e.preventDefault();
    
    if (!selectedPO) return;
    
    try {
      setLoading(true);
      
      const response = await fetch('/api/grn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          poId: selectedPO.id,
          quantityReceived: parseInt(grnForm.quantityReceived),
          batchNumber: grnForm.batchNumber,
          expiryDate: grnForm.expiryDate || null,
          notes: grnForm.notes
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess('GRN created successfully. Awaiting manager approval.');
        setShowCreateModal(false);
        setSelectedPO(null);
        setGrnForm({ quantityReceived: '', batchNumber: '', expiryDate: '', notes: '' });
        await loadGRNs();
        await loadAcknowledgedPOs();
      } else {
        setError('Failed to create GRN: ' + data.message);
      }
    } catch (err) {
      setError('Failed to create GRN: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const approveGRN = async (grnId, action) => {
    if (!canApproveGRN) return;
    
    const notes = prompt(`${action === 'approve' ? 'Approval' : 'Rejection'} notes:`);
    if (action === 'reject' && !notes) return;
    
    try {
      setLoading(true);
      
      const response = await fetch(`/api/grn/${grnId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ action, notes })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess(`GRN ${action}d successfully${action === 'approve' ? ' and stock updated' : ''}`);
        
        // If GRN was approved, trigger dashboard refresh
        if (action === 'approve') {
          window.dispatchEvent(new CustomEvent('grnApproved', {
            detail: { grnId, message: 'GRN approved - PO status updated to completed' }
          }));
        }
        
        await loadGRNs();
      } else {
        setError(`Failed to ${action} GRN: ` + data.message);
      }
    } catch (err) {
      setError(`Failed to ${action} GRN: ` + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'pending': { color: 'bg-yellow-100 text-yellow-800', text: 'Pending Approval' },
      'approved': { color: 'bg-green-100 text-green-800', text: 'Approved' },
      'rejected': { color: 'bg-red-100 text-red-800', text: 'Rejected' }
    };

    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', text: status };
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
        {config.text}
      </span>
    );
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

  if (!user) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!isWarehouse && !isManager) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Access denied. Only warehouse staff and managers can access GRN.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Goods Receipt Notes (GRN)</h1>
          <p className="text-gray-600">
            {isWarehouse ? 'Create GRNs for received goods' : 'Approve GRNs and update stock'}
          </p>
        </div>
        
        {canCreateGRN && acknowledgedPOs.length > 0 && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Create GRN
          </button>
        )}
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

      {/* GRN List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">GRN List</h2>
          
          {loading ? (
            <div className="text-center py-8">Loading GRNs...</div>
          ) : grns.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No GRNs found. {canCreateGRN && 'Create your first GRN from acknowledged POs.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      GRN Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      PO Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantities
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
                  {grns.map((grn) => (
                    <tr key={grn.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{grn.grnNumber}</div>
                        <div className="text-sm text-gray-500">
                          Received: {new Date(grn.receivedAt).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          By: {grn.receivedBy?.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {grn.purchaseOrder?.poNumber}
                        </div>
                        <div className="text-sm text-gray-500">{grn.item?.name}</div>
                        <div className="text-sm text-gray-500">{grn.warehouse?.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          Ordered: {grn.quantityOrdered}
                        </div>
                        <div className="text-sm text-gray-900">
                          Received: {grn.quantityReceived}
                        </div>
                        {grn.batchNumber && (
                          <div className="text-sm text-gray-500">
                            Batch: {grn.batchNumber}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(grn.status)}
                        {grn.approvedAt && (
                          <div className="text-xs text-gray-400 mt-1">
                            {grn.status === 'approved' ? 'Approved' : 'Rejected'}: {new Date(grn.approvedAt).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setSelectedGRN(grn);
                              setShowViewModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900 px-2 py-1 border border-blue-300 rounded text-xs"
                          >
                            View
                          </button>
                          
                          {canApproveGRN && grn.status === 'pending' && (
                            <>
                              <button
                                onClick={() => approveGRN(grn.id, 'approve')}
                                className="text-green-600 hover:text-green-900 px-2 py-1 border border-green-300 rounded text-xs"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => approveGRN(grn.id, 'reject')}
                                className="text-red-600 hover:text-red-900 px-2 py-1 border border-red-300 rounded text-xs"
                              >
                                Reject
                              </button>
                            </>
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

      {/* Create GRN Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Create GRN</h3>
            
            <form onSubmit={createGRN} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select PO *
                </label>
                <select
                  value={selectedPO?.id || ''}
                  onChange={(e) => {
                    const po = acknowledgedPOs.find(p => p.id === parseInt(e.target.value));
                    setSelectedPO(po);
                    setGrnForm({...grnForm, quantityReceived: po?.orderedQuantity || ''});
                  }}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                >
                  <option value="">Select a PO</option>
                  {acknowledgedPOs.map(po => (
                    <option key={po.id} value={po.id}>
                      {po.poNumber} - {po.item?.name} (Qty: {po.orderedQuantity})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity Received *
                </label>
                <input
                  type="number"
                  value={grnForm.quantityReceived}
                  onChange={(e) => setGrnForm({...grnForm, quantityReceived: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  min="1"
                  max={selectedPO?.orderedQuantity || 999}
                  required
                />
                {selectedPO && (
                  <div className="text-xs text-gray-500 mt-1">
                    Ordered quantity: {selectedPO.orderedQuantity}
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Batch Number
                </label>
                <input
                  type="text"
                  value={grnForm.batchNumber}
                  onChange={(e) => setGrnForm({...grnForm, batchNumber: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={grnForm.expiryDate}
                  onChange={(e) => setGrnForm({...grnForm, expiryDate: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={grnForm.notes}
                  onChange={(e) => setGrnForm({...grnForm, notes: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  rows="3"
                />
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create GRN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View GRN Modal */}
      {showViewModal && selectedGRN && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-lg font-semibold mb-4">GRN Details - {selectedGRN.grnNumber}</h3>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">GRN Information</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">GRN Number:</span> {selectedGRN.grnNumber}</div>
                  <div><span className="font-medium">Status:</span> {getStatusBadge(selectedGRN.status)}</div>
                  <div><span className="font-medium">Received Date:</span> {new Date(selectedGRN.receivedAt).toLocaleDateString()}</div>
                  <div><span className="font-medium">Received By:</span> {selectedGRN.receivedBy?.name}</div>
                  {selectedGRN.approvedAt && (
                    <div><span className="font-medium">Approved Date:</span> {new Date(selectedGRN.approvedAt).toLocaleDateString()}</div>
                  )}
                  {selectedGRN.batchNumber && (
                    <div><span className="font-medium">Batch Number:</span> {selectedGRN.batchNumber}</div>
                  )}
                  {selectedGRN.expiryDate && (
                    <div><span className="font-medium">Expiry Date:</span> {new Date(selectedGRN.expiryDate).toLocaleDateString()}</div>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Purchase Order Details</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">PO Number:</span> {selectedGRN.purchaseOrder?.poNumber}</div>
                  <div><span className="font-medium">Item:</span> {selectedGRN.item?.name}</div>
                  <div><span className="font-medium">Warehouse:</span> {selectedGRN.warehouse?.name}</div>
                  <div><span className="font-medium">Ordered Quantity:</span> {selectedGRN.quantityOrdered}</div>
                  <div><span className="font-medium">Received Quantity:</span> {selectedGRN.quantityReceived}</div>
                  <div className={`${selectedGRN.quantityReceived === selectedGRN.quantityOrdered ? 'text-green-600' : 'text-orange-600'}`}>
                    <span className="font-medium">Status:</span> {selectedGRN.quantityReceived === selectedGRN.quantityOrdered ? 'Full Delivery' : 'Partial Delivery'}
                  </div>
                </div>
              </div>
            </div>
            
            {selectedGRN.notes && (
              <div className="mt-4">
                <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  {selectedGRN.notes}
                </div>
              </div>
            )}
            
            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedGRN(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
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

export default GRN;