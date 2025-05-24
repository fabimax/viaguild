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
import EditProfile from './pages/EditProfile';
import Search from './pages/Search';
import PublicUserProfile from './pages/PublicUserProfile';
import HomePage from './pages/HomePage';
import CreateGuildPage from './pages/CreateGuildPage';
import GuildOverviewPage from './pages/GuildOverviewPage.temp';
import GuildProfilePage from './pages/GuildProfilePage';
import BadgeBuilderPage from './pages/BadgeBuilderPage';

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
                <Route path="/profile/edit" element={
                  <ProtectedRoute>
                    <ErrorBoundary>
                      <EditProfile />
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
                
                {/* Guild System Routes */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <ErrorBoundary>
                      <HomePage />
                    </ErrorBoundary>
                  </ProtectedRoute>
                } />
                <Route path="/guilds/create" element={
                  <ProtectedRoute>
                    <ErrorBoundary>
                      <CreateGuildPage />
                    </ErrorBoundary>
                  </ProtectedRoute>
                } />
                <Route path="/guilds/:identifier" element={
                  <ErrorBoundary>
                    <GuildProfilePage />
                  </ErrorBoundary>
                } />
                <Route path="/badge-builder" element={
                  <ErrorBoundary>
                    <BadgeBuilderPage />
                  </ErrorBoundary>
                } />
                
                {/* Temporary route for Guild Overview Mockup */}
                <Route path="/guild-overview-temp" element={
                  <ErrorBoundary>
                    <GuildOverviewPage />
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