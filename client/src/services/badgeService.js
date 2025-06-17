import api from './api';

/**
 * Service for handling badge-related API calls
 */
class BadgeService {
  /**
   * Get all badges received by a user
   * @param {string} username - Username to fetch badges for
   * @returns {Promise<Array>} Array of badge instances
   */
  async getUserReceivedBadges(username) {
    const response = await api.get(`/users/${username}/badges/received`);
    return response.data.data;
  }

  /**
   * Get user's badge case
   * @param {string} username - Username to fetch badge case for
   * @returns {Promise<Object>} Badge case with badges
   */
  async getUserBadgeCase(username) {
    const response = await api.get(`/users/${username}/badgecase`);
    return response.data.data;
  }

  /**
   * Add a badge to user's badge case
   * @param {string} username - Username
   * @param {string} badgeInstanceId - Badge instance ID to add
   * @returns {Promise<Object>} Created badge item
   */
  async addBadgeToCase(username, badgeInstanceId) {
    const response = await api.post(`/users/${username}/badgecase/badges/${badgeInstanceId}`);
    return response.data.data;
  }

  /**
   * Remove a badge from user's badge case
   * @param {string} username - Username
   * @param {string} badgeInstanceId - Badge instance ID to remove
   * @returns {Promise<void>}
   */
  async removeBadgeFromCase(username, badgeInstanceId) {
    await api.delete(`/users/${username}/badgecase/badges/${badgeInstanceId}`);
  }

  /**
   * Reorder badges in user's badge case
   * @param {string} username - Username
   * @param {Array} orderData - Array of {badgeInstanceId, displayOrder} objects
   * @returns {Promise<void>}
   */
  async reorderBadgeCase(username, orderData) {
    await api.patch(`/users/${username}/badgecase/order`, { badges: orderData });
  }

  /**
   * Toggle badge case visibility
   * @param {string} username - Username
   * @param {boolean} isPublic - New visibility state
   * @returns {Promise<Object>} Updated badge case
   */
  async toggleBadgeCaseVisibility(username, isPublic) {
    const response = await api.patch(`/users/${username}/badgecase/visibility`, { isPublic });
    return response.data.data;
  }

  /**
   * Delete a badge permanently
   * @param {string} username - Username
   * @param {string} badgeInstanceId - Badge instance ID to delete
   * @returns {Promise<void>}
   */
  async deleteBadgePermanently(username, badgeInstanceId) {
    await api.delete(`/users/${username}/badges/${badgeInstanceId}`);
  }

  /**
   * Get public badge case for any user (no authentication required)
   * @param {string} username - Username to fetch public badge case for
   * @returns {Promise<Object>} Public badge case
   */
  async getPublicBadgeCase(username) {
    // This endpoint should be implemented for public viewing
    const response = await api.get(`/users/${username}/badgecase/public`);
    return response.data.data;
  }

  /**
   * Create a new badge template
   * @param {Object} templateData - Badge template data
   * @returns {Promise<Object>} Created badge template
   */
  async createBadgeTemplate(templateData) {
    const response = await api.post('/badge-templates', templateData);
    return response.data.data;
  }

  /**
   * Get all badge templates owned by a user
   * @param {string} username - Username to fetch templates for
   * @returns {Promise<Array>} Array of badge templates
   */
  async getUserBadgeTemplates(username) {
    const response = await api.get(`/users/${username}/badge-templates`);
    return response.data.data;
  }

  /**
   * Get a specific badge template
   * @param {string} templateId - Template ID
   * @returns {Promise<Object>} Badge template
   */
  async getBadgeTemplate(templateId) {
    const response = await api.get(`/badge-templates/${templateId}`);
    return response.data.data;
  }

  /**
   * Update a badge template
   * @param {string} templateId - Template ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated badge template
   */
  async updateBadgeTemplate(templateId, updateData) {
    const response = await api.patch(`/badge-templates/${templateId}`, updateData);
    return response.data.data;
  }

  /**
   * Delete a badge template
   * @param {string} templateId - Template ID
   * @returns {Promise<void>}
   */
  async deleteBadgeTemplate(templateId) {
    await api.delete(`/badge-templates/${templateId}`);
  }

  /**
   * Give a badge to a user
   * @param {string} templateId - Template ID
   * @param {string} recipientUsername - Username of recipient
   * @param {Object} customizations - Badge customizations
   * @returns {Promise<Object>} Created badge instance
   */
  async giveBadge(templateId, recipientUsername, customizations = {}) {
    const response = await api.post('/badges/give', {
      templateId,
      recipientUsername,
      customizations
    });
    return response.data.data;
  }

  /**
   * Give badges to multiple users
   * @param {string} templateId - Template ID
   * @param {Array} recipients - Array of recipient data
   * @returns {Promise<Object>} Bulk operation results
   */
  async giveBadgesBulk(templateId, recipients) {
    const response = await api.post('/badges/give/bulk', {
      templateId,
      recipients
    });
    return response.data.data;
  }

  /**
   * Get user's badge allocations
   * @param {string} username - Username
   * @returns {Promise<Array>} Allocation records
   */
  async getUserAllocations(username) {
    const response = await api.get(`/users/${username}/allocations`);
    return response.data.data;
  }

  /**
   * Get badges given by a user
   * @param {string} username - Username
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Given badges
   */
  async getUserGivenBadges(username, filters = {}) {
    const queryString = new URLSearchParams(filters).toString();
    const endpoint = `/users/${username}/badges/given${queryString ? `?${queryString}` : ''}`;
    const response = await api.get(endpoint);
    return response.data.data;
  }

  async getAssetUrl(assetId) {
    if (!assetId) return null;
    try {
      // Assuming assetId is just the ID, not the full "upload://" string
      const response = await api.get(`/assets/${assetId}`);
      return response.data?.hostedUrl || null;
    } catch (error) {
      console.error(`Error fetching asset URL for ID ${assetId}:`, error);
      return null;
    }
  }
}

// Export a singleton instance
export default new BadgeService();