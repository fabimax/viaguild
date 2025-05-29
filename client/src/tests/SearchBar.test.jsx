import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchBar from '../components/SearchBar';

describe('SearchBar Component', () => {
  const mockOnSearch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with default values', () => {
    render(<SearchBar onSearch={mockOnSearch} />);
    
    // Check if search input exists
    const searchInput = screen.getByPlaceholderText('Search users...');
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveValue('');
    
    // Check if platform dropdown exists
    const platformSelect = screen.getByLabelText('Filter by platform');
    expect(platformSelect).toBeInTheDocument();
    expect(platformSelect).toHaveValue('all');
    
    // Check if search button exists and is disabled when input is empty
    const searchButton = screen.getByRole('button', { name: /search/i });
    expect(searchButton).toBeInTheDocument();
    expect(searchButton).toBeDisabled();
  });

  it('renders correctly with initial values', () => {
    render(
      <SearchBar 
        onSearch={mockOnSearch} 
        initialQuery="test" 
        initialPlatform="twitter" 
      />
    );
    
    // Check if search input has initial value
    const searchInput = screen.getByPlaceholderText('Search users...');
    expect(searchInput).toHaveValue('test');
    
    // Check if platform dropdown has initial value
    const platformSelect = screen.getByLabelText('Filter by platform');
    expect(platformSelect).toHaveValue('twitter');
    
    // Check if search button is enabled when input has initial value
    const searchButton = screen.getByRole('button', { name: /search/i });
    expect(searchButton).not.toBeDisabled();
  });

  it('enables search button when input has at least 2 characters', async () => {
    render(<SearchBar onSearch={mockOnSearch} />);
    
    const searchInput = screen.getByPlaceholderText('Search users...');
    const searchButton = screen.getByRole('button', { name: /search/i });
    
    // Button should be disabled initially
    expect(searchButton).toBeDisabled();
    
    // Type 1 character - button should still be disabled
    await userEvent.type(searchInput, 'a');
    expect(searchButton).toBeDisabled();
    
    // Type second character - button should be enabled
    await userEvent.type(searchInput, 'b');
    expect(searchButton).not.toBeDisabled();
  });

  it('calls onSearch with correct parameters when submitted', async () => {
    render(<SearchBar onSearch={mockOnSearch} />);
    
    const searchInput = screen.getByPlaceholderText('Search users...');
    const platformSelect = screen.getByLabelText('Filter by platform');
    const searchButton = screen.getByRole('button', { name: /search/i });
    
    // Type search query
    await userEvent.type(searchInput, 'test query');
    
    // Change platform
    await userEvent.selectOptions(platformSelect, 'bluesky');
    
    // Submit the form
    await userEvent.click(searchButton);
    
    // Check if onSearch was called with correct parameters
    expect(mockOnSearch).toHaveBeenCalledTimes(1);
    expect(mockOnSearch).toHaveBeenCalledWith('test query', 'bluesky');
  });

  it('trims whitespace from query before submitting', async () => {
    render(<SearchBar onSearch={mockOnSearch} />);
    
    const searchInput = screen.getByPlaceholderText('Search users...');
    const searchButton = screen.getByRole('button', { name: /search/i });
    
    // Type search query with whitespace
    await userEvent.type(searchInput, '  test  ');
    await userEvent.click(searchButton);
    
    // Check if onSearch was called with trimmed query
    expect(mockOnSearch).toHaveBeenCalledWith('test', 'all');
  });

  it('does not submit when query is too short', async () => {
    render(<SearchBar onSearch={mockOnSearch} />);
    
    const searchInput = screen.getByPlaceholderText('Search users...');
    const searchForm = searchInput.closest('form');
    
    // Type a short query
    await userEvent.type(searchInput, 'a');
    
    // Try to submit the form directly
    fireEvent.submit(searchForm);
    
    // Check that onSearch was not called
    expect(mockOnSearch).not.toHaveBeenCalled();
  });
});