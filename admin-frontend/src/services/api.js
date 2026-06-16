import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Inject admin token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('dhan-virasat-admin-token');
    if (token) config.headers.Authorization = `Token ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Auto-logout on 401
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('dhan-virasat-admin-token');
      localStorage.removeItem('dhan-virasat-admin-username');
      localStorage.removeItem('dhan-virasat-admin-is-staff');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export const api = {
  // Auth — Admin portal also uses 2FA
  login: async (username, password) => {
    const step1 = await apiClient.post('/auth/login/', { username, password }).then(r => r.data);
    if (!step1.requires_otp) throw new Error('Unexpected login response.');
    return step1; // { requires_otp, user_id, otp_code }
  },

  verifyLoginOTP: async (user_id, otp_code) => {
    const data = await apiClient.post('/auth/verify-login-otp/', { user_id, otp_code }).then(r => r.data);
    if (!data.is_staff) {
      throw new Error('Access denied. You do not have staff administrator privileges.');
    }
    return data;
  },

  logout: () => apiClient.post('/auth/logout/').then(r => r.data),

  // User management
  adminGetUsers:      ()   => apiClient.get('/admin/users/').then(r => r.data),
  adminGetUserDetail: (id) => apiClient.get(`/admin/users/${id}/`).then(r => r.data),
  adminGetLogs:       ()   => apiClient.get('/admin/logs/').then(r => r.data),
  adminMarkDeceased:  (id) => apiClient.post(`/admin/users/${id}/mark-deceased/`).then(r => r.data),

  // AI Analytics
  adminGetAIAnalysis:     ()        => apiClient.get('/admin/ai-analysis/').then(r => r.data),
  adminAutoDispatchOTP:   (userIds) => apiClient.post('/admin/auto-dispatch-otp/', { user_ids: userIds || [] }).then(r => r.data),
};
