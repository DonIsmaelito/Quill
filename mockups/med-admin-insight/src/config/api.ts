// API Configuration for med-admin-insight
// This file manages API endpoints for different environments

const isDevelopment = process.env.VITE_DEV === 'true';
const isProduction = process.env.VITE_PROD === 'true';

// Production URLs (Vercel deployments)
const PRODUCTION_URLS = {
  // Main Quill API (your backend deployment)
  QUILL_API: 'https://backend-4444c30ou-flora-3a1bc29e.vercel.app/',
  // WebSocket endpoints
  WS_ENDPOINT: 'wss://backend-4444c30ou-flora-3a1bc29e.vercel.app/',
  // Frontend2 URL
  FRONTEND2_URL: 'https://flora-54fpr37zb-flora-3a1bc29e.vercel.app/', // Update this with your actual frontend2 deployment URL
};

// Development URLs (localhost)
const DEVELOPMENT_URLS = {
  QUILL_API: 'http://localhost:3000',
  WS_ENDPOINT: 'ws://localhost:8000',
  FRONTEND2_URL: 'http://localhost:5173',
};

// Export the appropriate URLs based on environment
export const API_CONFIG = isProduction ? PRODUCTION_URLS : DEVELOPMENT_URLS;

// Specific API endpoints
export const API_ENDPOINTS = {
  // RAG API endpoints
  RAG_QUERY: `${API_CONFIG.QUILL_API}/api/rag/query`,
  RAG_INGEST: `${API_CONFIG.QUILL_API}/api/rag/ingest`,
  RAG_UPDATE: `${API_CONFIG.QUILL_API}/api/rag/update`,
  RAG_BLANK: `${API_CONFIG.QUILL_API}/api/rag/blank`,
  RAG_GENERATE_FORM: `${API_CONFIG.QUILL_API}/api/rag/generate-form`,
  
  // EHR API endpoints
  EHR_SUBMIT_FORM: `${API_CONFIG.QUILL_API}/api/ehr/submit-form`,
  EHR_CREATE_PATIENT: `${API_CONFIG.QUILL_API}/api/ehr/create-patient-profile`,
  EHR_GET_PATIENT: `${API_CONFIG.QUILL_API}/api/ehr/get-patient-profile`,
  EHR_UPDATE_PATIENT: `${API_CONFIG.QUILL_API}/api/ehr/update-patient-data`,
  EHR_INITIALIZE_TABLES: `${API_CONFIG.QUILL_API}/api/ehr/initialize-tables`,
  
  // WebSocket endpoints
  CLINIC_VOICE_WS: `${API_CONFIG.WS_ENDPOINT}/clinic_voice_ws`,
  
  // Frontend2 endpoints
  FRONTEND2_FORM: `${API_CONFIG.FRONTEND2_URL}/`,
};

// Helper function to get the current environment
export const getEnvironment = () => {
  return isProduction ? 'production' : 'development';
};

// Helper function to check if we're in development
export const isDev = () => isDevelopment;

// Helper function to check if we're in production
export const isProd = () => isProduction; 