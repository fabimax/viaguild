import React, { Component } from 'react';
import PropTypes from 'prop-types';

/**
 * ErrorBoundary component
 * Catches JavaScript errors in child component tree
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  /**
   * Update state when component catches an error
   * @param {Object} error - The error that was thrown
   */
  static getDerivedStateFromError(error) {
    // Update state to trigger fallback UI
    return { hasError: true, error };
  }

  /**
   * Lifecycle method called after an error is caught
   * @param {Object} error - The error that was thrown
   * @param {Object} errorInfo - Component stack information
   */
  componentDidCatch(error, errorInfo) {
    // Capture error details for logging
    this.setState({ errorInfo });
    
    // Log error to console in development
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error caught by ErrorBoundary:', error);
      console.error('Component stack:', errorInfo.componentStack);
    }
    
    // You could also log to an error reporting service here
  }

  /**
   * Reset the error state to allow recovery
   */
  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    // If there's an error, show fallback UI
    if (this.state.hasError) {
      // Check if there's a custom fallback
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }
      
      // Default error UI
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>We're sorry, but an unexpected error occurred.</p>
          
          {/* Show error details in development */}
          {process.env.NODE_ENV !== 'production' && this.state.error && (
            <details className="error-details">
              <summary>Error Details (Developer Only)</summary>
              <p>{this.state.error.toString()}</p>
              {this.state.errorInfo && (
                <pre className="error-stack">
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </details>
          )}
          
          <button
            className="btn-primary reset-button"
            onClick={this.handleReset}
          >
            Try Again
          </button>
        </div>
      );
    }

    // If no error, render children normally
    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.func
};

export default ErrorBoundary;