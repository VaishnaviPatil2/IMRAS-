import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { fetchSuppliers, createSupplier, updateSupplier, deleteSupplier, resetSupplierPassword } from '../api/supplierApi';

const SupplierPage = () => {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('suppliers');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data states
  const [suppliers, setSuppliers] = useState([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [filters, setFilters] = useState({
    search: ''
  });

  // Modal states
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [selectedSupplierForReset, setSelectedSupplierForReset] = useState(null);
  const [editingSupplier, setEditingSupplier] = useState(null);

  // Form state
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    email: '',
    contactNumber: '',
    address: '',
    leadTimeDays: 7,
    pricingTier: 'Standard'
  });

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const isWarehouse = user?.role === 'warehouse';

  // Load suppliers
  useEffect(() => {
    loadSuppliers();
  }, [currentPage, filters.search]);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const response = await fetchSuppliers({
        page: currentPage,
        limit: 10,
        search: filters.search
      });
      
      // The fetchSuppliers function returns { data: [...], totalSuppliers: n, ... }
      // where data contains the suppliers array
      if (response && response.data) {
        setSuppliers(response.data);
        setTotalPages(response.totalPages || 1);
      } else if (Array.isArray(response)) {
        setSuppliers(response);
        setTotalPages(1);
      } else {
        console.error('Unexpected response format:', response);
        setSuppliers([]);
        setTotalPages(1);
      }
    } catch (err) {
      console.error('Load suppliers error:', err);
      setError('Failed to load suppliers: ' + (err.error || err.message || 'Unknown error'));
      setSuppliers([]);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!supplierForm.name || !supplierForm.email) {
      setError('Name and email are required');
      return;
    }

    try {
      setLoading(true);
      
      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, supplierForm);
        setSuccess('Supplier updated successfully');
      } else {
        const response = await createSupplier(supplierForm);
        setSuccess(`Supplier created successfully! Default login password: "supplier123" (Please ask supplier to change this password after first login)`);
      }
      
      setShowSupplierModal(false);
      setEditingSupplier(null);
      setSupplierForm({
        name: '',
        email: '',
        contactNumber: '',
        address: '',
        leadTimeDays: 7,
        pricingTier: 'Standard'
      });
      
      await loadSuppliers();
    } catch (err) {
      setError('Failed to save supplier: ' + (err.error || err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (supplier) => {
    if (!window.confirm(`Are you sure you want to delete supplier "${supplier.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      await deleteSupplier(supplier.id);
      setSuccess('Supplier deleted successfully');
      await loadSuppliers();
    } catch (err) {
      setError('Failed to delete supplier: ' + (err.error || err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (supplier) => {
    setSupplierForm({
      name: supplier.name,
      email: supplier.email,
      contactNumber: supplier.contactNumber || '',
      address: supplier.address || '',
      leadTimeDays: supplier.leadTimeDays || 7,
      pricingTier: supplier.pricingTier || 'Standard'
    });
    setEditingSupplier(supplier);
    setShowSupplierModal(true);
  };

  const handleResetPassword = async () => {
    if (!selectedSupplierForReset) return;
    
    try {
      setLoading(true);
      console.log('Resetting password for supplier ID:', selectedSupplierForReset.id); // Debug log
      
      const response = await resetSupplierPassword(selectedSupplierForReset.id);
      console.log('Reset password response:', response); // Debug log
      
      setSuccess(`Password reset successfully for ${selectedSupplierForReset.name}! New password: "supplier123"`);
      setShowPasswordResetModal(false);
      setSelectedSupplierForReset(null);
    } catch (err) {
      console.error('Reset password error:', err); // Debug log
      setError('Failed to reset password: ' + (err.error || err.message || JSON.stringify(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Supplier Management</h1>
        
        {/* Only admin can add suppliers */}
        {isAdmin && (
          <button
            onClick={() => {
              setSupplierForm({
                name: '',
                email: '',
                contactNumber: '',
                address: '',
                leadTimeDays: 7,
                pricingTier: 'Standard'
              });
              setEditingSupplier(null);
              setShowSupplierModal(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Add Supplier
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

      {/* Content */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Suppliers</h2>
          
          {/* Filters */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search suppliers..."
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              className="border border-gray-300 rounded-md px-3 py-2 w-full md:w-1/3"
            />
          </div>

          {/* Suppliers Table */}
          {loading ? (
            <div className="text-center py-4">Loading suppliers...</div>
          ) : suppliers.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No suppliers found. {filters.search && `Try clearing the search filter.`}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Supplier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lead Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pricing Tier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {suppliers.map((supplier) => (
                    <tr key={supplier.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{supplier.name}</div>
                        <div className="text-sm text-gray-500">{supplier.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{supplier.contactNumber || 'N/A'}</div>
                        <div className="text-sm text-gray-500">{supplier.address || 'No address'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{supplier.leadTimeDays} days</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          supplier.pricingTier === 'Premium' ? 'bg-purple-100 text-purple-800' :
                          supplier.pricingTier === 'Standard' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {supplier.pricingTier}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {/* Only admin can edit/delete suppliers */}
                        {isAdmin && (
                          <div className="flex space-x-3">
                            <button
                              onClick={() => handleEdit(supplier)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                setSelectedSupplierForReset(supplier);
                                setShowPasswordResetModal(true);
                              }}
                              className="text-green-600 hover:text-green-900"
                              title="Reset login password"
                            >
                              Reset Password
                            </button>
                            <button
                              onClick={() => handleDelete(supplier)}
                              className="text-red-600 hover:text-red-900"
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
      </div>

      {/* Supplier Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {!editingSupplier && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <div className="text-sm font-medium text-blue-800">Default Login Information</div>
                      <div className="text-xs text-blue-700 mt-1">
                        New suppliers will receive login credentials with password: <code className="bg-blue-100 px-1 rounded">supplier123</code>
                        <br />Please ask them to change this password after first login.
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({...supplierForm, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={supplierForm.email}
                  onChange={(e) => setSupplierForm({...supplierForm, email: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                <input
                  type="text"
                  value={supplierForm.contactNumber}
                  onChange={(e) => setSupplierForm({...supplierForm, contactNumber: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  value={supplierForm.address}
                  onChange={(e) => setSupplierForm({...supplierForm, address: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  rows="3"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lead Time (Days)</label>
                <input
                  type="number"
                  min="1"
                  value={supplierForm.leadTimeDays}
                  onChange={(e) => setSupplierForm({...supplierForm, leadTimeDays: parseInt(e.target.value)})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pricing Tier</label>
                <select
                  value={supplierForm.pricingTier}
                  onChange={(e) => setSupplierForm({...supplierForm, pricingTier: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="Standard">Standard</option>
                  <option value="Premium">Premium</option>
                  <option value="Budget">Budget</option>
                </select>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : (editingSupplier ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Password Reset Modal */}
      {showPasswordResetModal && selectedSupplierForReset && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-red-600">
              Reset Supplier Password
            </h3>
            
            <div className="mb-4">
              <p className="text-gray-700 mb-2">
                Are you sure you want to reset the password for:
              </p>
              <div className="bg-gray-50 p-3 rounded">
                <div className="font-medium">{selectedSupplierForReset.name}</div>
                <div className="text-sm text-gray-600">{selectedSupplierForReset.email}</div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                The password will be reset to: <code className="bg-gray-100 px-1 rounded">supplier123</code>
              </p>
              <p className="text-xs text-orange-600 mt-1">
                ⚠️ Please inform the supplier about the new password and ask them to change it after login.
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowPasswordResetModal(false);
                  setSelectedSupplierForReset(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleResetPassword}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierPage;