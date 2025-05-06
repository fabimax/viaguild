import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import CreateGuildForm from '../components/guilds/CreateGuildForm';
import guildService from '../services/guild.service';

/**
 * Create Guild Page
 * Allows users to create a new guild
 */
const CreateGuildPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleCreateGuild = async (formData) => {
    setIsLoading(true);
    try {
      await guildService.createGuild(formData);
    } catch (error) {
      console.error('Error creating guild:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link to="/" className="text-indigo-600 hover:text-indigo-800">Home</Link>
        <i className="fas fa-chevron-right text-xs"></i>
        <Link to="/guilds" className="text-indigo-600 hover:text-indigo-800">Guilds</Link>
        <i className="fas fa-chevron-right text-xs"></i>
        <span>Create Guild</span>
      </div>
      
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create a New Guild</h1>
        <p className="text-gray-600">
          Start a new community for people with shared interests or goals.
        </p>
      </div>
      
      {/* Main Content */}
      <div className="bg-white rounded-lg shadow-md p-6 md:p-8 mb-8">
        <CreateGuildForm
          onSubmit={handleCreateGuild}
          isLoading={isLoading}
        />
      </div>
      
      {/* Guidelines Section */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-indigo-800 mb-3">Guild Creation Guidelines</h2>
        <ul className="list-disc pl-5 space-y-2 text-gray-700">
          <li>Choose a unique, memorable name for your guild</li>
          <li>Write a clear description explaining your guild's purpose</li>
          <li>Consider whether you want an open guild or invitation-only</li>
          <li>As the creator, you'll automatically become the guild owner</li>
          <li>You can invite members and assign roles after creation</li>
        </ul>
      </div>
    </div>
  );
};

export default CreateGuildPage; 