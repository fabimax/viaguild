import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';

// Import components
import Header from './components/Header';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

// Import pages
import Home from './pages/Home';
import Register from './pages/Register';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Search from './pages/Search';
import PublicUserProfile from './pages/PublicUserProfile';

/**
 * Custom error fallback UI for the main application
 * @param {Error} error - The caught error
 * @param {Function} resetError - Function to reset the error state
 */
const AppErrorFallback = (error, resetError) => (
  <div className="error-boundary">
    <h2>Application Error</h2>
    <p>We're sorry, but something went wrong with the application.</p>
    <p>Please try again or contact support if the problem persists.</p>
    
    {process.env.NODE_ENV !== 'production' && (
      <details className="error-details">
        <summary>Error Details (Developer Only)</summary>
        <p>{error.toString()}</p>
      </details>
    )}
    
    <button 
      className="btn-primary reset-button" 
      onClick={resetError}
    >
      Reload Application
    </button>
  </div>
);

/**
 * Main App component
 * Sets up routing and authentication context
 * Wrapped in ErrorBoundary for top-level error handling
 */
function App() {
  return (
    <ErrorBoundary fallback={AppErrorFallback}>
      <AuthProvider>
        <Router>
          <div className="app">
            <Header />
            <main className="container">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/register" element={<Register />} />
                <Route path="/login" element={<Login />} />
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <ErrorBoundary>
                      <Profile />
                    </ErrorBoundary>
                  </ProtectedRoute>
                } />
                <Route path="/search" element={
                  <ErrorBoundary>
                    <Search />
                  </ErrorBoundary>
                } />
                <Route path="/users/:username" element={
                  <ErrorBoundary>
                    <PublicUserProfile />
                  </ErrorBoundary>
                } />
              </Routes>
            </main>
          </div>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;