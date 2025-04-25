import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './styles/social.css';
import './styles/search.css';
import './styles/profile.css';
import './styles/error.css';
import './styles/debug.css'; // Added debug CSS

/**
 * Application entry point
 * Renders the App component into the DOM
 */
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);