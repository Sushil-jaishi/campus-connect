import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is logged in on initial load
  useEffect(() => {
    const checkUserLoggedIn = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('accessToken');
        if (token) {
          const response = await authService.getCurrentUser();
          setCurrentUser(response.data.data);
        }
      } catch (err) {
        // Token might be invalid, remove it
        localStorage.removeItem('accessToken');
        setError(err.response?.data?.message || 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };

    checkUserLoggedIn();
  }, []);

  // Login user
  const login = async (credentials) => {
    setLoading(true);
    setError(null);
    try {
      console.log('Login attempt with:', { email: credentials.email });
      
      if (!credentials.email || !credentials.password) {
        const errorMsg = 'Email and password are required';
        console.error(errorMsg);
        setError(errorMsg);
        throw new Error(errorMsg);
      }
      
      const response = await authService.login(credentials);
      console.log('Login response received:', response.status);
      
      if (!response || !response.data || !response.data.data) {
        const errorMsg = 'Invalid response from server';
        console.error(errorMsg, response);
        setError(errorMsg);
        throw new Error(errorMsg);
      }
      
      const { user, accessToken } = response.data.data;
      
      if (!user || !accessToken) {
        const errorMsg = 'Missing user data or token in response';
        console.error(errorMsg, response.data);
        setError(errorMsg);
        throw new Error(errorMsg);
      }
      
      // Save token to localStorage
      localStorage.setItem('accessToken', accessToken);
      
      setCurrentUser(user);
      return user;
    } catch (err) {
      console.error("LOGIN AUTH ERROR:", err);
      
      // Enhanced error handling
      let errorMessage = 'Login failed. Please try again.';
      
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.log('Error response status:', err.response.status);
        console.log('Error response data:', err.response.data);
        
        if (err.response.status === 404) {
          errorMessage = 'User not found. Please check your email address.';
        } else if (err.response.status === 401) {
          // Special handling for password errors to make them more visible
          errorMessage = 'INCORRECT_PASSWORD: The password you entered is incorrect. Please try again.';
          console.log('Password error detected - using special marker');
        } else if (err.response.status === 400) {
          errorMessage = 'Both email and password are required.';
        } else if (err.response.status === 403) {
          // Better message for session expired
          errorMessage = 'Your session has expired. Please sign in again.';
        } else if (err.response.data && err.response.data.message) {
          // Parse server message for more user-friendly display
          const serverMessage = err.response.data.message;
          if (serverMessage.includes("doesn't exist")) {
            errorMessage = 'Account not found. Please check your email or register a new account.';
          } else if (serverMessage.includes("password is incorrect")) {
            // Special handling for password errors to make them more visible
            errorMessage = 'INCORRECT_PASSWORD: The password you entered is incorrect. Please try again.';
            console.log('Password error detected in message - using special marker');
          } else if (serverMessage.includes("required")) {
            errorMessage = 'Please enter both your email and password.';
          } else if (serverMessage.includes("Token invalid") || serverMessage.includes("expired")) {
            errorMessage = 'Your session has expired. Please sign in again to continue.';
          } else {
            errorMessage = serverMessage;
          }
        }
      } else if (err.request) {
        // The request was made but no response was received
        errorMessage = 'No response from server. Please check your internet connection.';
      }
      
      console.log('AUTH CONTEXT - Setting error to:', errorMessage);
      setError(errorMessage);
      
      // Make sure we're actually throwing an error with the correct message
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Register user
  const register = async (userData, skipLogin = false) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authService.register(userData);
      
      // Only set current user and save token if not skipping login
      if (!skipLogin) {
        const { user, accessToken } = response.data.data;
        localStorage.setItem('accessToken', accessToken);
        setCurrentUser(user);
      }
      
      return response.data.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Logout user
  const logout = async () => {
    setLoading(true);
    try {
      await authService.logout();
      localStorage.removeItem('accessToken');
      setCurrentUser(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Logout failed');
    } finally {
      setLoading(false);
    }
  };

  // Update user profile
  const updateProfile = async (userData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authService.updateProfile(userData);
      const updatedUser = response.data.data;
      setCurrentUser(updatedUser);
      return updatedUser;
    } catch (err) {
      setError(err.response?.data?.message || 'Profile update failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Change password
  const changePassword = async (passwords) => {
    setLoading(true);
    setError(null);
    try {
      await authService.changePassword(passwords);
    } catch (err) {
      setError(err.response?.data?.message || 'Password change failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    currentUser,
    loading,
    error,
    login,
    register,
    logout,
    updateProfile,
    changePassword
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 