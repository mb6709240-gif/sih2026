// Centralized API Service Layer for ArtisanAI Frontend
// This file manages all communication between frontend and backend

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

/**
 * Core API request handler with error handling and authentication
 */
async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('artisanai_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(data.message || `HTTP ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    console.error(`API Error [${endpoint}]:`, err.message);
    throw err;
  }
}

/**
 * Authentication Service
 */
export const authService = {
  login: (email, password) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (name, email, password, role = 'customer', phone = '', language = 'English') =>
    apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role, phone, language }),
    }),

  getMe: () => apiRequest('/auth/me'),

  logout: () =>
    apiRequest('/auth/logout', { method: 'POST' }),
};

/**
 * Product Service
 */
export const productService = {
  getAll: (query = '') => {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    return apiRequest(`/products?${params.toString()}`);
  },

  getById: (id) => apiRequest(`/products/${id}`),

  create: (formData) => {
    // FormData requires special handling - no JSON encoding
    const token = localStorage.getItem('artisanai_token');
    return fetch(`${API_URL}/products`, {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: formData,
    })
      .then(r => r.json().catch(() => ({})))
      .then(data => {
        if (!data || data.error) throw new Error(data.message || 'Upload failed');
        return data;
      });
  },

  update: (id, data) =>
    apiRequest(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getArtisanProducts: () => apiRequest('/artisan/products'),
};

/**
 * Order Service
 */
export const orderService = {
  create: (items, address) =>
    apiRequest('/orders', {
      method: 'POST',
      body: JSON.stringify({ items, address }),
    }),

  getAll: () => apiRequest('/orders'),

  getById: (id) => apiRequest(`/orders/${id}`),
};

/**
 * AI Service - All AI-powered features
 */
export const aiService = {
  generateCatalog: (name, category, material, story) =>
    apiRequest('/ai/catalog', {
      method: 'POST',
      body: JSON.stringify({ name, category, material, story }),
    }),

  generateDescription: (name, category, material, story) =>
    apiRequest('/ai/generate-description', {
      method: 'POST',
      body: JSON.stringify({ name, category, material, story }),
    }),

  calculatePrice: (cost, hours, category, material, demand = 'normal') =>
    apiRequest('/ai/suggest-price', {
      method: 'POST',
      body: JSON.stringify({ cost, hours, category, material, demand }),
    }),

  analyzeImage: (formData) => {
    const token = localStorage.getItem('artisanai_token');
    return fetch(`${API_URL}/ai/analyze-image`, {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: formData,
    })
      .then(r => r.json().catch(() => ({})))
      .then(data => {
        if (!data.result) throw new Error(data.message || 'Image analysis failed');
        return data;
      });
  },

  enhancePhoto: (formData) => {
    const token = localStorage.getItem('artisanai_token');
    return fetch(`${API_URL}/ai/photo`, {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: formData,
    })
      .then(r => r.json().catch(() => ({})))
      .then(data => {
        if (!data.image) throw new Error(data.message || 'Photo enhancement failed');
        return data;
      });
  },

  search: (query) =>
    apiRequest('/ai/search', {
      method: 'POST',
      body: JSON.stringify({ query }),
    }),

  chat: (message) =>
    apiRequest('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),

  generateMarketing: (name, price, category, material, description) =>
    apiRequest('/ai/marketing', {
      method: 'POST',
      body: JSON.stringify({ name, price, category, material, description }),
    }),

  generateTags: (category, material) =>
    apiRequest('/ai/generate-tags', {
      method: 'POST',
      body: JSON.stringify({ category, material }),
    }),

  translate: (text, language) =>
    apiRequest('/ai/translate', {
      method: 'POST',
      body: JSON.stringify({ text, language }),
    }),

  getBusinessInsight: () => apiRequest('/ai/insight'),

  customerAssistant: (query, preferences = {}) =>
    apiRequest('/ai/customer-assistant', {
      method: 'POST',
      body: JSON.stringify({ query, preferences }),
    }),

  getStatus: () => apiRequest('/ai/status'),
};

/**
 * Admin Service
 */
export const adminService = {
  getStats: () => apiRequest('/admin/stats'),

  verifyUser: (userId) =>
    apiRequest(`/admin/verify/${userId}`, { method: 'POST' }),
};

/**
 * Utility: Format currency for India
 */
export const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

/**
 * Utility: Store auth token
 */
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('artisanai_token', token);
  } else {
    localStorage.removeItem('artisanai_token');
  }
};

/**
 * Utility: Get current auth token
 */
export const getAuthToken = () => localStorage.getItem('artisanai_token');

/**
 * Utility: Check if user is authenticated
 */
export const isAuthenticated = () => !!getAuthToken();

export default {
  apiRequest,
  authService,
  productService,
  orderService,
  aiService,
  adminService,
  money,
  setAuthToken,
  getAuthToken,
  isAuthenticated,
};
