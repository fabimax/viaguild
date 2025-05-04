import React from 'react';
import PropTypes from 'prop-types';

/**
 * VisibilitySettingsForm Component
 * Form specifically for editing profile visibility and hidden accounts.
 */
function VisibilitySettingsForm({ 
  isPublic,
  hiddenAccounts,
  socialAccounts,
  onIsPublicChange,
  onToggleAccountVisibility,
  isSubmitting, 
  onSave, 
  onCancel
}) {

  const handleInternalSave = (e) => {
    e.preventDefault();
    if (onSave) {
      onSave({ isPublic, hiddenAccounts });
    }
  };

  return (
    <form onSubmit={handleInternalSave} className="visibility-settings-form">
      <h4>Edit Visibility Settings</h4>

      <div className="form-group">
        <label className="checkbox-label public-toggle">
          <span>Make my profile public</span>
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => onIsPublicChange(e.target.checked)}
            aria-describedby="visibility-help"
          />
        </label>
        <p id="visibility-help" className="form-help">
          When disabled, your profile will not be visible to other users
        </p>
      </div>
      
      <div className="form-group">
        <label>Account Visibility</label>
        <p className="form-help">
          Choose which social accounts are visible on your public profile
        </p>
        
        <div className="account-visibility-list">
          {socialAccounts.length === 0 ? (
            <p>No social accounts connected yet</p>
          ) : (
            <ul className="visibility-items">
              {socialAccounts.map(account => (
                <li key={account.id} className="visibility-item">
                  <label className="checkbox-label account-toggle">
                    <div>
                      <span className="provider-name">
                        {account.provider.charAt(0).toUpperCase() + account.provider.slice(1)}
                      </span>
                      <span className="account-name">@{account.username}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={!hiddenAccounts.includes(account.id)}
                      onChange={() => onToggleAccountVisibility(account.id)}
                      aria-label={`Show ${account.provider} account @${account.username} on public profile`}
                    />
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="form-actions">
        {onCancel && (
          <button 
            type="button" 
            className="btn-secondary"
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
        <button 
          type="submit"
          className="btn-primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </form>
  );
}

VisibilitySettingsForm.propTypes = {
  isPublic: PropTypes.bool.isRequired,
  hiddenAccounts: PropTypes.arrayOf(PropTypes.string).isRequired,
  socialAccounts: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      provider: PropTypes.string.isRequired,
      username: PropTypes.string.isRequired,
    })
  ).isRequired,
  onIsPublicChange: PropTypes.func.isRequired,
  onToggleAccountVisibility: PropTypes.func.isRequired,
  isSubmitting: PropTypes.bool,
  onSave: PropTypes.func,
  onCancel: PropTypes.func,
};

export default VisibilitySettingsForm; 