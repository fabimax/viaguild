import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';

/**
 * Create Guild Form Component
 * Allows users to create a new guild
 */
const CreateGuildForm = ({ onSubmit, isLoading = false }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isOpen: false
  });
  const [errors, setErrors] = useState({});

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  // Validate form inputs
  const validate = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Guild name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Guild name must be at least 3 characters';
    } else if (formData.name.length > 50) {
      newErrors.name = 'Guild name cannot exceed 50 characters';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Guild description is required';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    } else if (formData.description.length > 1000) {
      newErrors.description = 'Description cannot exceed 1000 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    try {
      await onSubmit(formData);
      navigate('/guilds');
    } catch (error) {
      // Handle API errors
      if (error.response?.data?.error) {
        if (error.response.data.error.includes('name already exists')) {
          setErrors(prev => ({ ...prev, name: 'A guild with this name already exists' }));
        } else {
          setErrors(prev => ({ ...prev, form: error.response.data.error }));
        }
      } else {
        setErrors(prev => ({ ...prev, form: 'Failed to create guild. Please try again.' }));
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error alert */}
      {errors.form && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{errors.form}</span>
        </div>
      )}
      
      {/* Guild Name */}
      <div>
        <label htmlFor="name" className="block text-gray-700 font-medium mb-2">
          Guild Name*
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none 
            ${errors.name ? 'border-red-300 focus:ring-red-200' : 'border-gray-300 focus:ring-indigo-200 focus:border-indigo-400'}`}
          placeholder="Enter your guild name"
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
      </div>
      
      {/* Guild Description */}
      <div>
        <label htmlFor="description" className="block text-gray-700 font-medium mb-2">
          Description*
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows="5"
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none 
            ${errors.description ? 'border-red-300 focus:ring-red-200' : 'border-gray-300 focus:ring-indigo-200 focus:border-indigo-400'}`}
          placeholder="Describe your guild's purpose and activities"
        ></textarea>
        {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
        <p className="mt-1 text-sm text-gray-500">
          Characters: {formData.description.length}/1000
        </p>
      </div>
      
      {/* Guild Joining Options */}
      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            name="isOpen"
            checked={formData.isOpen}
            onChange={handleChange}
            className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
          <span className="ml-2 text-gray-700">Open Guild (Anyone can join without invitation)</span>
        </label>
        <p className="mt-1 text-sm text-gray-500 ml-7">
          If turned off, new members can only join by invitation.
        </p>
      </div>
      
      {/* Form Actions */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg font-medium
            ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {isLoading ? 'Creating...' : 'Create Guild'}
        </button>
        <button
          type="button"
          onClick={() => navigate(-1)}
          disabled={isLoading}
          className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 py-2 px-4 rounded-lg font-medium"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

CreateGuildForm.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  isLoading: PropTypes.bool
};

export default CreateGuildForm; 