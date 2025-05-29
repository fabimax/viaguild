import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import PropTypes from 'prop-types';
import blueskyIcon from '../assets/bluesky.svg';

/**
 * Component for connecting a Bluesky account with app password
 * @param {Object} props - Component props
 * @param {Function} props.onConnect - Function to call on successful connection
 * @param {boolean} props.isLoading - Whether a connection attempt is in progress
 */
function BlueskyConnectForm({ onConnect, isLoading }) {
  const [showForm, setShowForm] = useState(false);
  
  // Initialize react-hook-form
  const { 
    register, 
    handleSubmit, 
    formState: { errors },
    reset
  } = useForm();
  
  /**
   * Form submission handler
   * @param {Object} data - Form data containing identifier and appPassword
   */
  const onSubmit = async (data) => {
    await onConnect(data);
    // Reset form after submission attempt
    reset();
  };
  
  if (!showForm) {
    return (
      <div className="connect-bluesky">
        <button
          className="social-btn bluesky-btn"
          onClick={() => setShowForm(true)}
        >
          <img src={blueskyIcon} alt="Bluesky logo" className="icon" />
          <span>Connect Bluesky</span>
        </button>
      </div>
    );
  }
  
  return (
    <div className="bluesky-form">
      <h4>Connect your Bluesky Account</h4>
      
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="form-group">
          <label htmlFor="identifier">Username or Email</label>
          <input
            id="identifier"
            type="text"
            placeholder="e.g., username.bsky.social"
            {...register('identifier', {
              required: 'Username or email is required',
            })}
          />
          {errors.identifier && <span className="error">{errors.identifier.message}</span>}
        </div>
        
        <div className="form-group">
          <label htmlFor="appPassword">App Password</label>
          <input
            id="appPassword"
            type="password"
            {...register('appPassword', {
              required: 'App password is required',
            })}
          />
          {errors.appPassword && <span className="error">{errors.appPassword.message}</span>}
        </div>
        
        <div className="form-help">
          <p><small>
            <a href="https://bsky.app/settings/app-passwords" target="_blank" rel="noopener noreferrer">
              Create an app password
            </a> in your Bluesky settings.
          </small></p>
        </div>
        
        <div className="form-actions">
          <button 
            type="button" 
            className="btn-secondary"
            onClick={() => {
              setShowForm(false);
              reset();
            }}
          >
            Cancel
          </button>
          <button 
            type="submit"
            className="btn-primary"
            disabled={isLoading}
          >
            {isLoading ? 'Connecting...' : 'Connect'}
          </button>
        </div>
      </form>
    </div>
  );
}

BlueskyConnectForm.propTypes = {
  onConnect: PropTypes.func.isRequired,
  isLoading: PropTypes.bool
};

BlueskyConnectForm.defaultProps = {
  isLoading: false
};

export default BlueskyConnectForm;