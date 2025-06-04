import axios from 'axios';
import { mockUserGuilds, mockGuildDetails, mockGuildSearch } from '../data/mockGuilds';

// Environment-based API URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Helper to determine if we should use mock data
const useMockData = () => {
  return import.meta.env.VITE_USE_MOCK_DATA === 'true';
};

// Helper to create axios instance with auth token
const getAuthAxios = () => {
  const token = localStorage.getItem('token');
  return axios.create({
    baseURL: API_URL,
    withCredentials: true,
    headers: {
      'Authorization': token ? `Bearer ${token}` : ''
    }
  });
};

/**
 * Guild Service for frontend - handles all API calls related to guilds
 * Provides mock data during development when API is not available
 */
class GuildService {
  /**
   * Get all guilds for the current user
   * @returns {Promise<Array>} List of guilds
   */
  async getUserGuilds() {
    if (useMockData()) {
      // Use mock data for development
      return new Promise((resolve) => {
        setTimeout(() => resolve(mockUserGuilds), 500);
      });
    }

    // Real API call with authentication
    const api = getAuthAxios();
    const response = await api.get(`/guilds/user/me`);
    return response.data;
  }

  /**
   * Get a guild by ID
   * @param {string} guildId - Guild ID
   * @returns {Promise<Object>} Guild details
   */
  async getGuildById(guildId) {
    if (useMockData()) {
      // Use mock data for development
      return new Promise((resolve) => {
        setTimeout(() => resolve(mockGuildDetails), 500);
      });
    }

    // Real API call with authentication
    const api = getAuthAxios();
    const response = await api.get(`/guilds/${guildId}`);
    return response.data;
  }

  /**
   * Get public guild profile by identifier (ID or name_ci)
   * @param {string} identifier - Guild ID or name_ci
   * @returns {Promise<Object>} Guild details (displayName, description, avatar)
   */
  async getGuildPublicProfile(identifier) {
    if (useMockData()) {
      // Simulate fetching specific fields for mock data
      return new Promise((resolve, reject) => {
        const foundGuild = mockGuildSearch.find(g => g.id === identifier || g.name.toLowerCase() === identifier.toLowerCase());
        if (foundGuild) {
          setTimeout(() => resolve({
            displayName: foundGuild.displayName || foundGuild.name,
            description: foundGuild.description,
            avatar: foundGuild.avatar
          }), 500);
        } else {
          setTimeout(() => reject(new Error('Mock Guild not found')), 500);
        }
      });
    }

    // Real API call.
    // Note: The new backend endpoint is /guilds/:identifier, which getGuildById already effectively calls if we pass identifier to it.
    // However, to keep concerns separate and match the new backend service method name,
    // we make a distinct frontend service method.
    // This can be a simple GET request without auth if the endpoint is public.
    // Assuming the endpoint /api/guilds/:identifier is public and doesn't strictly need the auth token.
    // If it does need auth, getAuthAxios() should be used.
    try {
      // If the endpoint is public and doesn't need auth:
      // const response = await axios.get(`${API_URL}/guilds/${identifier}`);
      // If it might need auth (or to be consistent):
      const api = getAuthAxios();
      const response = await api.get(`/guilds/${identifier}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching guild profile for ${identifier}:`, error.response ? error.response.data : error.message);
      throw error; // Re-throw to be caught by the component
    }
  }

  /**
   * Create a new guild
   * @param {Object} guildData - Guild data
   * @returns {Promise<Object>} Created guild
   */
  async createGuild(guildData) {
    if (useMockData()) {
      // Use mock data for development
      return new Promise((resolve) => {
        const newGuild = {
          id: `g${Math.floor(Math.random() * 1000)}`,
          name: guildData.name,
          displayName: guildData.displayName || guildData.name,
          description: guildData.description,
          avatar: guildData.avatar || null,
          isOpen: guildData.isOpen || false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          role: 'OWNER',
          isPrimary: false,
          memberCount: 1,
          creator: {
            id: 'u1',
            username: 'currentuser',
            avatar: null
          }
        };
        
        setTimeout(() => resolve(newGuild), 500);
      });
    }

    // Real API call with authentication
    const api = getAuthAxios();
    const response = await api.post(`/guilds`, guildData);
    return response.data;
  }

  /**
   * Update a guild
   * @param {string} guildId - Guild ID
   * @param {Object} guildData - New guild data
   * @returns {Promise<Object>} Updated guild
   */
  async updateGuild(guildId, guildData) {
    if (useMockData()) {
      // Use mock data for development
      return new Promise((resolve) => {
        const updatedGuild = {
          ...mockGuildDetails,
          ...guildData,
          displayName: guildData.displayName || guildData.name,
          updatedAt: new Date().toISOString()
        };
        
        setTimeout(() => resolve(updatedGuild), 500);
      });
    }

    // Real API call with authentication
    const api = getAuthAxios();
    const response = await api.put(`/guilds/${guildId}`, guildData);
    return response.data;
  }

  /**
   * Delete a guild
   * @param {string} guildId - Guild ID
   * @returns {Promise<void>}
   */
  async deleteGuild(guildId) {
    if (useMockData()) {
      // Use mock data for development
      return new Promise((resolve) => {
        setTimeout(() => resolve(), 500);
      });
    }

    // Real API call with authentication
    const api = getAuthAxios();
    await api.delete(`/guilds/${guildId}`);
  }

  /**
   * Search for guilds
   * @param {string} query - Search query
   * @param {Object} filters - Search filters
   * @returns {Promise<Array>} List of guilds
   */
  async searchGuilds(query, filters = {}) {
    if (useMockData()) {
      // Use mock data for development
      return new Promise((resolve) => {
        let results = [...mockGuildSearch];
        
        // Filter by query
        if (query) {
          const lowerQuery = query.toLowerCase();
          results = results.filter(guild => 
            guild.name.toLowerCase().includes(lowerQuery) || 
            guild.description.toLowerCase().includes(lowerQuery)
          );
        }
        
        // Filter by isOpen
        if (filters.isOpen !== undefined) {
          results = results.filter(guild => guild.isOpen === filters.isOpen);
        }
        
        setTimeout(() => resolve(results), 500);
      });
    }

    // Prepare query parameters
    const params = { query };
    if (filters.isOpen !== undefined) {
      params.isOpen = filters.isOpen;
    }

    // Real API call with authentication
    const api = getAuthAxios();
    const response = await api.get(`/guilds/search`, { params });
    return response.data;
  }

  /**
   * Join a guild
   * @param {string} guildId - Guild ID
   * @returns {Promise<Object>} Membership details
   */
  async joinGuild(guildId) {
    if (useMockData()) {
      // Use mock data for development
      return new Promise((resolve) => {
        const membership = {
          id: `m${Math.floor(Math.random() * 1000)}`,
          userId: 'u1',
          guildId,
          role: 'MEMBER',
          isPrimary: false,
          joinedAt: new Date().toISOString()
        };
        
        setTimeout(() => resolve(membership), 500);
      });
    }

    // Real API call with authentication
    const api = getAuthAxios();
    const response = await api.post(`/guilds/${guildId}/join`, {});
    return response.data;
  }

  /**
   * Leave a guild
   * @param {string} guildId - Guild ID
   * @returns {Promise<void>}
   */
  async leaveGuild(guildId) {
    if (useMockData()) {
      // Use mock data for development
      return new Promise((resolve) => {
        setTimeout(() => resolve(), 500);
      });
    }

    // Real API call with authentication
    const api = getAuthAxios();
    await api.delete(`/guilds/${guildId}/leave`);
  }

  /**
   * Set a guild as the user's primary guild
   * @param {string} guildId - Guild ID
   * @returns {Promise<Object>} Updated membership
   */
  async setPrimaryGuild(guildId) {
    if (useMockData()) {
      // Use mock data for development
      return new Promise((resolve) => {
        const membership = {
          id: `m${Math.floor(Math.random() * 1000)}`,
          userId: 'u1',
          guildId,
          role: 'MEMBER',
          isPrimary: true,
          joinedAt: new Date().toISOString()
        };
        
        setTimeout(() => resolve(membership), 500);
      });
    }

    // Real API call with authentication
    const api = getAuthAxios();
    const response = await api.put(`/guilds/${guildId}/primary`, {});
    return response.data;
  }

  /**
   * Update a member's role in a guild
   * @param {string} guildId - Guild ID
   * @param {string} userId - User ID
   * @param {string} role - New role
   * @returns {Promise<Object>} Updated membership
   */
  async updateMemberRole(guildId, userId, role) {
    if (useMockData()) {
      // Use mock data for development
      return new Promise((resolve) => {
        const membership = {
          id: `m${Math.floor(Math.random() * 1000)}`,
          userId,
          guildId,
          role,
          isPrimary: false,
          joinedAt: new Date().toISOString()
        };
        
        setTimeout(() => resolve(membership), 500);
      });
    }

    // Real API call with authentication
    const api = getAuthAxios();
    const response = await api.put(`/guilds/${guildId}/members/${userId}/role`, { role });
    return response.data;
  }

  /**
   * Get current user's permissions for a specific guild
   * @param {string} guildId - Guild ID
   * @returns {Promise<Object>} User's permissions in the guild
   */
  async getMyGuildPermissions(guildId) {
    if (useMockData()) {
      // Use mock data for development - simulate having edit permissions
      return new Promise((resolve) => {
        const permissions = {
          guildId,
          userId: 'u1',
          roles: [{ id: 'r1', name: 'Owner', isSystemRole: true, displayColor: '#4f46e5', apiVisible: true }],
          permissions: ['GUILD_EDIT_DETAILS', 'GUILD_MANAGE_RELATIONSHIPS', 'GUILD_MANAGE_CONTACTS'],
          rank: 'S',
          guildMembershipId: 'm1'
        };
        
        setTimeout(() => resolve(permissions), 500);
      });
    }

    // Real API call with authentication
    const api = getAuthAxios();
    const response = await api.get(`/guilds/${guildId}/my-permissions`);
    return response.data;
  }
}

export default new GuildService(); 