# Frontend Mock Data Strategy

This document outlines the strategy for building the React frontend for the authenticated homepage, initially using mock data, while ensuring a smooth transition to a live backend API later.

## Goal

Create a React frontend component structure based on the `mockup-viaguild-authenticated-homepage.html` mockup. The initial implementation will use static mock data for development and UI testing.

## Tech Stack

- Frontend: React (with Vite)

## Implementation Plan

1.  **File Structure:** Organize the frontend code into pages (`src/pages`), reusable components (`src/components`), styles (`src/styles`), and mock data (`src/data`).
2.  **Mock Data File (`src/data/mockData.js`):**
    *   This file will contain sample JavaScript objects representing the data needed for the homepage (user info, guilds, badges, notifications, etc.).
    *   **Crucially, the structure (keys, data types) of this mock data will precisely mirror the expected JSON response structure from the future backend API endpoints.**
3.  **Main Page Component (`src/pages/HomePage.jsx`):**
    *   This component will be responsible for acquiring the data.
    *   Initially, it will import data directly from `src/data/mockData.js` within a `useEffect` hook (possibly using `useState` to hold the data).
    *   Basic loading states (`isLoading`) will be implemented even during the mock data phase to simulate asynchronous fetching.
4.  **Child Components (`src/components/...`):**
    *   Components like `GuildCarousel`, `TrophyCase`, `NotificationsPanel`, etc., will receive all necessary data solely through props passed down from `HomePage.jsx`.
    *   These components will be agnostic to the data source (mock file vs. API).
5.  **Styling (`src/styles/HomePage.css`):**
    *   CSS will be adapted from the `mockup-viaguild-authenticated-homepage.html` file.

## Transitioning to Backend API

When the backend API is ready:

1.  **Modify `HomePage.jsx`:**
    *   Replace the mock data import and `useEffect` logic with actual API calls (using `fetch`, `axios`, or a data fetching library).
    *   Populate the component's state (`user`, `guilds`, etc.) with the data received from the API responses.
    *   Enhance loading and implement error handling for the API calls.
2.  **No Changes to Child Components:** Because child components receive data via props and the data *shape* remains consistent, **no changes should be required in the child components**.

## Benefits

*   Allows parallel development of frontend and backend.
*   Ensures UI components are built against the correct data structures from the start.
*   Minimizes frontend refactoring when integrating with the live API.
*   Provides a clear separation of concerns between data fetching and UI rendering. 