import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

// Create Auth Context
const AuthContext = createContext();

/**
 * Custom hook to use the auth context
 * Usage: const { currentUser, login, register, logout } = useAuth();
 */
export const useAuth = () => {
  return useContext(AuthContext);
};

/**
 * Authentication Provider Component
 * Manages authentication state and provides auth-related functions
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 */
export const AuthProvider = ({ children }) => {
  // State for current user, token, and loading status
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Create axios instance
  const api = axios.create({
    baseURL: '/api',
  });

  // Add auth token to requests if available
  api.interceptors.request.use(
    (config) => {
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Registered user data
   */
  const register = async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      const { user, token } = response.data;
      
      setCurrentUser(user);
      setToken(token);
      localStorage.setItem('token', token);
      
      return user;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  };

  /**
   * Login a user
   * @param {Object} credentials - User login credentials
   * @returns {Promise<Object>} Logged in user data
   */
  const login = async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      const { user, token } = response.data;
      
      setCurrentUser(user);
      setToken(token);
      localStorage.setItem('token', token);
      
      return user;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  };

  /**
   * Logout the current user
   * Removes user data and token from state and localStorage
   */
  const logout = () => {
    setCurrentUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  /**
   * Get current user data from the API
   * Used to restore user session on page reload
   */
  const getCurrentUser = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/auth/me');
      setCurrentUser(response.data.user);
    } catch (error) {
      console.error('Error fetching user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  /**
   * Refresh the current user's data
   * Can be called after profile updates to ensure data consistency
   * @returns {Promise<Object|null>} Updated user data or null if error
   */
  const refreshUserData = async () => {
    if (!token) {
      return null;
    }

    try {
      // Add cache-busting parameter
      const response = await api.get('/auth/me', { 
        params: { _: Date.now() } 
      });
      const userData = response.data.user;
      setCurrentUser(userData);
      return userData;
    } catch (error) {
      console.error('Error refreshing user data:', error);
      return null;
    }
  };

  /**
   * Connect a social account
   * Redirects to the social provider authorization page
   * Includes JWT token in the URL for authentication
   * 
   * @param {string} provider - The social provider (twitter or bluesky)
   */
  const connectSocialAccount = (provider) => {
    // Include the token in the URL to maintain authentication through redirects
    const currentToken = localStorage.getItem('token');
    if (!currentToken) {
      console.error('No token available for authentication');
      return;
    }
    
    window.location.href = `/api/auth/connect/${provider}?token=${currentToken}`;
  };

  // Effect to load user on first render if token exists
  useEffect(() => {
    getCurrentUser();
  }, [token]);

  // Context value
  const value = {
    currentUser,
    loading,
    register,
    login,
    logout,
    connectSocialAccount,
    refreshUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};