import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const Admin = () => {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    pageSize: 10,
    totalUsers: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [selectedRole, setSelectedRole] = useState({});
  
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  // Function to format image URL
  const formatImageUrl = (path) => {
    if (!path) return "https://placehold.co/150"; // Default placeholder
    
    // If path is already a full URL
    if (path.startsWith('http')) return path;
    
    // Base URL for images
    const baseUrl = 'http://localhost:8000';
    
    // Replace backslashes with forward slashes (for Windows paths)
    let formattedPath = path.replace(/\\/g, '/');
    
    // If path is a relative server path starting with public
    if (formattedPath.startsWith('public/')) {
      formattedPath = formattedPath.replace('public/', '/');
    }
    
    // If path starts with ./public/, replace it with /
    if (formattedPath.startsWith('./public/')) {
      formattedPath = formattedPath.replace('./public/', '/');
    }
    
    // If path doesn't start with a slash, add it
    if (!formattedPath.startsWith('/')) {
      formattedPath = `/${formattedPath}`;
    }
    
    return `${baseUrl}${formattedPath}`;
  };
  
  // Check if user is admin, if not redirect
  useEffect(() => {
    if (currentUser && currentUser.role !== 'Admin') {
      navigate('/');
    }
  }, [currentUser, navigate]);
  
  // Load users on mount and page change
  useEffect(() => {
    fetchUsers(pagination.currentPage, pagination.pageSize);
  }, [pagination.currentPage, pagination.pageSize]);
  
  const fetchUsers = async (page, limit) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await adminService.getAllUsers(page, limit);
      setUsers(response.data.data.users);
      setPagination(response.data.data.pagination);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRoleChange = (userId, e) => {
    setSelectedRole({
      ...selectedRole,
      [userId]: e.target.value
    });
  };
  
  const handleRoleSubmit = async (userId, currentRole) => {
    if (!selectedRole[userId] || selectedRole[userId] === currentRole) {
      return; // No change
    }
    
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      await adminService.changeUserRole(userId, selectedRole[userId]);
      
      // Update the user in the list
      setUsers(users.map(user => 
        user._id === userId 
          ? { ...user, role: selectedRole[userId] } 
          : user
      ));
      
      setSuccessMessage(`User role updated to ${selectedRole[userId]} successfully`);
      
      // Clear the success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error changing user role:', err);
      setError(err.message || 'Failed to update user role');
    } finally {
      setIsLoading(false);
    }
  };
  
  const changePage = (newPage) => {
    if (newPage > 0 && newPage <= pagination.totalPages) {
      setPagination({
        ...pagination,
        currentPage: newPage
      });
    }
  };
  
  // Verification badge/checkmark component for mentors
  const VerifiedBadge = () => (
    <svg 
      className="w-4 h-4 ml-1 text-blue-500 inline-block" 
      fill="currentColor" 
      viewBox="0 0 20 20" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path 
        fillRule="evenodd" 
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" 
        clipRule="evenodd" 
      />
    </svg>
  );
  
  if (!currentUser || currentUser.role !== 'Admin') {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-xl text-red-600">You do not have permission to access this page.</p>
      </div>
    );
  }
  
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">User Management</h2>
        
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}
        
        {successMessage && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4 rounded">
            <p>{successMessage}</p>
          </div>
        )}
        
        {isLoading ? (
          <div className="flex justify-center my-8">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-3 px-4 text-left">User</th>
                    <th className="py-3 px-4 text-left">Email</th>
                    <th className="py-3 px-4 text-left">Current Role</th>
                    <th className="py-3 px-4 text-left">Change Role</th>
                    <th className="py-3 px-4 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map(user => (
                    <tr key={user._id} className={currentUser._id === user._id ? "bg-blue-50" : ""}>
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          {user.profileImage ? (
                            <img 
                              src={formatImageUrl(user.profileImage)} 
                              alt={user.username} 
                              className="w-10 h-10 rounded-full mr-3 object-cover ring-2 ring-blue-100"
                              onError={(e) => {
                                e.target.src = "https://placehold.co/100";
                              }}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-300 mr-3 flex items-center justify-center ring-2 ring-blue-100">
                              <span className="text-sm font-semibold text-gray-600">
                                {user.username.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="font-medium flex items-center">
                              {user.username}
                              {user.role === 'Mentor' && <VerifiedBadge />}
                            </p>
                            <p className="text-xs text-gray-500">{user.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">{user.email}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.role === 'Admin' ? 'bg-purple-100 text-purple-800' :
                          user.role === 'Mentor' ? 'bg-green-100 text-green-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {currentUser._id !== user._id ? (
                          <select
                            className="border rounded px-2 py-1 text-sm"
                            value={selectedRole[user._id] || user.role}
                            onChange={(e) => handleRoleChange(user._id, e)}
                          >
                            <option value="Student">Student</option>
                            <option value="Mentor">Mentor</option>
                            <option value="Admin">Admin</option>
                          </select>
                        ) : (
                          <span className="text-sm italic text-gray-500">Cannot change own role</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {currentUser._id !== user._id && (
                          <button
                            className="bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded text-sm"
                            onClick={() => handleRoleSubmit(user._id, user.role)}
                            disabled={!selectedRole[user._id] || selectedRole[user._id] === user.role}
                          >
                            Update
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            <div className="flex justify-between items-center mt-6">
              <div className="text-sm text-gray-600">
                Showing {(pagination.currentPage - 1) * pagination.pageSize + 1} to {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalUsers)} of {pagination.totalUsers} users
              </div>
              <div className="flex space-x-2">
                <button
                  className="border rounded px-3 py-1 text-sm disabled:opacity-50"
                  disabled={pagination.currentPage === 1}
                  onClick={() => changePage(pagination.currentPage - 1)}
                >
                  Previous
                </button>
                <button
                  className="border rounded px-3 py-1 text-sm disabled:opacity-50"
                  disabled={pagination.currentPage === pagination.totalPages}
                  onClick={() => changePage(pagination.currentPage + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}; 