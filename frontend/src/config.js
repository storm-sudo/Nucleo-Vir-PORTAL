// Backend URL configuration
// Uses environment variable in development, falls back to current origin in production
// This ensures the app works correctly in both preview and deployed environments
export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;
