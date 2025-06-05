const API_BASE_URL = 'http://localhost:3000/api';

/**
 * Service for handling badge-related API calls
 */
class BadgeService {
  /**
   * Make authenticated API request
   * @private
   */
  async makeRequest(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
      },
      ...options
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get all badges received by a user
   * @param {string} username - Username to fetch badges for
   * @returns {Promise<Array>} Array of badge instances
   */
  async getUserReceivedBadges(username) {
    const response = await this.makeRequest(`/users/${username}/badges/received`);
    return response.data;
  }

  /**
   * Get user's badge case
   * @param {string} username - Username to fetch badge case for
   * @returns {Promise<Object>} Badge case with badges
   */
  async getUserBadgeCase(username) {
    const response = await this.makeRequest(`/users/${username}/badgecase`);
    return response.data;
  }

  /**
   * Add a badge to user's badge case
   * @param {string} username - Username
   * @param {string} badgeInstanceId - Badge instance ID to add
   * @returns {Promise<Object>} Created badge item
   */
  async addBadgeToCase(username, badgeInstanceId) {
    const response = await this.makeRequest(
      `/users/${username}/badgecase/badges/${badgeInstanceId}`,
      { method: 'POST' }
    );
    return response.data;
  }

  /**
   * Remove a badge from user's badge case
   * @param {string} username - Username
   * @param {string} badgeInstanceId - Badge instance ID to remove
   * @returns {Promise<void>}
   */
  async removeBadgeFromCase(username, badgeInstanceId) {
    await this.makeRequest(
      `/users/${username}/badgecase/badges/${badgeInstanceId}`,
      { method: 'DELETE' }
    );
  }

  /**
   * Reorder badges in user's badge case
   * @param {string} username - Username
   * @param {Array} orderData - Array of {badgeInstanceId, displayOrder} objects
   * @returns {Promise<void>}
   */
  async reorderBadgeCase(username, orderData) {
    await this.makeRequest(
      `/users/${username}/badgecase/order`,
      {
        method: 'PATCH',
        body: JSON.stringify({ badges: orderData })
      }
    );
  }

  /**
   * Toggle badge case visibility
   * @param {string} username - Username
   * @param {boolean} isPublic - New visibility state
   * @returns {Promise<Object>} Updated badge case
   */
  async toggleBadgeCaseVisibility(username, isPublic) {
    const response = await this.makeRequest(
      `/users/${username}/badgecase/visibility`,
      {
        method: 'PATCH',
        body: JSON.stringify({ isPublic })
      }
    );
    return response.data;
  }

  /**
   * Delete a badge permanently
   * @param {string} username - Username
   * @param {string} badgeInstanceId - Badge instance ID to delete
   * @returns {Promise<void>}
   */
  async deleteBadgePermanently(username, badgeInstanceId) {
    await this.makeRequest(
      `/users/${username}/badges/${badgeInstanceId}`,
      { method: 'DELETE' }
    );
  }

  /**
   * Get public badge case for any user (no authentication required)
   * @param {string} username - Username to fetch public badge case for
   * @returns {Promise<Object>} Public badge case
   */
  async getPublicBadgeCase(username) {
    // This endpoint should be implemented for public viewing
    const response = await fetch(`${API_BASE_URL}/users/${username}/badgecase/public`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.data;
  }
}

// Export a singleton instance
export default new BadgeService();