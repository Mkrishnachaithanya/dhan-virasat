import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically inject Authorization header if token exists
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('dhan-virasat-token');
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Redirect to login if a 401 is received (session expired)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('dhan-virasat-token');
      localStorage.removeItem('dhan-virasat-username');
      localStorage.removeItem('dhan-virasat-is-staff');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export const api = {
  // Auth
  register: (username, email, password) => 
    apiClient.post('/auth/register/', { username, email, password }).then(res => res.data),
  
  login: (username, password) => 
    apiClient.post('/auth/login/', { username, password }).then(res => res.data),

  verifyLoginOTP: (user_id, otp_code) =>
    apiClient.post('/auth/verify-login-otp/', { user_id, otp_code }).then(res => res.data),

  logout: () => 
    apiClient.post('/auth/logout/').then(res => res.data),

  // Profile
  getProfile: () => apiClient.get('/profile/').then(res => res.data),
  updateProfile: (data) => apiClient.patch('/profile/update/', data).then(res => res.data),
  changePassword: (current_password, new_password, confirm_password) =>
    apiClient.post('/profile/change-password/', { current_password, new_password, confirm_password }).then(res => res.data),


  sendOTP: () => apiClient.post('/checkin/send-otp/').then(res => res.data),
  verifyOTP: (code) => apiClient.post('/checkin/verify-otp/', { code }).then(res => res.data),
  simulateLeap: () => apiClient.post('/checkin/simulate-leap/').then(res => res.data),

  // Staff Administration Portal Endpoints
  adminGetUsers: () => apiClient.get('/admin/users/').then(res => res.data),
  adminGetUserDetail: (id) => apiClient.get(`/admin/users/${id}/`).then(res => res.data),
  adminGetLogs: () => apiClient.get('/admin/logs/').then(res => res.data),
  adminMarkDeceased: (id) => apiClient.post(`/admin/users/${id}/mark-deceased/`).then(res => res.data),

  // Nominees
  getNominees: () => apiClient.get('/nominees/').then(res => res.data),
  getNominee: (id) => apiClient.get(`/nominees/${id}/`).then(res => res.data),
  createNominee: (data) => apiClient.post('/nominees/', data).then(res => res.data),
  updateNominee: (id, data) => apiClient.put(`/nominees/${id}/`, data).then(res => res.data),
  deleteNominee: (id) => apiClient.delete(`/nominees/${id}/`).then(res => res.data),

  // Assets
  getAssets: () => apiClient.get('/assets/').then(res => res.data),
  getAsset: (id) => apiClient.get(`/assets/${id}/`).then(res => res.data),
  createAsset: (data) => apiClient.post('/assets/', data).then(res => res.data),
  updateAsset: (id, data) => apiClient.put(`/assets/${id}/`, data).then(res => res.data),
  deleteAsset: (id) => apiClient.delete(`/assets/${id}/`).then(res => res.data),

  // Dashboard Statistics
  getDashboardStats: () => apiClient.get('/dashboard/').then(res => res.data),
};
