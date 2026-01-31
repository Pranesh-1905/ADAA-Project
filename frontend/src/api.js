const API_BASE_URL = 'http://127.0.0.1:8000';

// Token management
export const getToken = () => localStorage.getItem('token');
export const setToken = (token) => localStorage.setItem('token', token);
export const removeToken = () => localStorage.removeItem('token');

// Helper function for API requests
const apiRequest = async (endpoint, options = {}) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token && !options.skipAuth) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid
        removeToken();
        window.location.href = '/login';
      }
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

// Auth endpoints
export const register = async (username, password) => {
  const response = await apiRequest('/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
    skipAuth: true,
  });
  return response;
};

export const login = async (username, password) => {
  const response = await apiRequest('/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
    skipAuth: true,
  });
  if (response.access_token) {
    setToken(response.access_token);
  }
  return response;
};

export const getCurrentUser = async () => {
  return await apiRequest('/me');
};

export const logout = () => {
  removeToken();
  window.location.href = '/';
};

// File upload
export const uploadFile = async (file) => {
  const token = getToken();
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(error.detail || 'Upload failed');
  }

  return await response.json();
};

// Analysis endpoints
export const analyzeFile = async (filename) => {
  return await apiRequest(`/analyze?filename=${encodeURIComponent(filename)}`, {
    method: 'POST',
  });
};

export const getJobStatus = async (taskId) => {
  return await apiRequest(`/status/${taskId}`);
};

export const getJobs = async () => {
  return await apiRequest('/jobs');
};

export const previewJob = async (taskId) => {
  return await apiRequest(`/preview/${taskId}`);
};

export const deleteJob = async (taskId) => {
  return await apiRequest(`/jobs/${taskId}`, { method: 'DELETE' });
};

export const renameJob = async (taskId, filename) => {
  return await apiRequest(`/jobs/${taskId}/rename`, {
    method: 'POST',
    body: JSON.stringify({ filename }),
  });
};

export const cancelJob = async (taskId) => {
  return await apiRequest(`/jobs/${taskId}/cancel`, { method: 'POST' });
};

export const visualizeJob = async (taskId) => {
  return await apiRequest(`/visualize/${taskId}`);
};

export const askQuestion = async (question, taskId) => {
  return await apiRequest(
    `/ask?question=${encodeURIComponent(question)}&task_id=${taskId}`,
    {
      method: 'POST',
    }
  );
};

// Chart endpoint
export const getChartUrl = (imageName) => {
  return `${API_BASE_URL}/charts/${imageName}`;
};

// Health check
export const healthCheck = async () => {
  return await apiRequest('/', { skipAuth: true });
};
