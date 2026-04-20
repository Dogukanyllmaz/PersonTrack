import axios from 'axios';

// Docker: VITE_API_URL=/api (nginx proxy), local dev: http://localhost:5000/api
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: BASE_URL });

// Attach JWT token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Refresh token logic ────────────────────────────────────────────────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    if (err.response?.status === 401 && !original._retry) {
      const refreshToken = localStorage.getItem('refreshToken');

      // No refresh token → go to login
      if (!refreshToken) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(err);
      }

      if (isRefreshing) {
        // Queue this request until refresh is done
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        }).catch(e => Promise.reject(e));
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        const { token, refreshToken: newRefreshToken } = res.data;

        localStorage.setItem('token', token);
        if (newRefreshToken) localStorage.setItem('refreshToken', newRefreshToken);

        processQueue(null, token);
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  }
);

// Auth
export const login = (data) => api.post('/auth/login', data);
export const refreshTokenCall = (refreshToken) => api.post('/auth/refresh', { refreshToken });
export const logoutApi = (refreshToken) => api.post('/auth/logout', { refreshToken });
export const getMe = () => api.get('/auth/me');
export const changePassword = (data) => api.post('/auth/change-password', data);
export const updateProfile = (data) => api.put('/auth/profile', data);

// Persons
export const getPersons = (search) => api.get('/persons', { params: { search } });
export const getPerson = (id) => api.get(`/persons/${id}`);
export const createPerson = (data) => api.post('/persons', data);
export const updatePerson = (id, data) => api.put(`/persons/${id}`, data);
export const deletePerson = (id) => api.delete(`/persons/${id}`);
export const addRelationship = (id, data) => api.post(`/persons/${id}/relationships`, data);
export const updateRelationship = (id, relId, data) => api.put(`/persons/${id}/relationships/${relId}`, data);
export const removeRelationship = (id, relId) => api.delete(`/persons/${id}/relationships/${relId}`);
export const importPersons = (file) => {
  const form = new FormData();
  form.append('file', file);
  return api.post('/persons/import', form);
};
export const downloadPersonTemplate = () =>
  api.get('/persons/template', { responseType: 'blob' });

// Meetings
export const getMeetings = (status) => api.get('/meetings', { params: { status } });
export const getMeeting = (id) => api.get(`/meetings/${id}`);
export const createMeeting = (data) => api.post('/meetings', data);
export const updateMeeting = (id, data) => api.put(`/meetings/${id}`, data);
export const completeMeeting = (id) => api.post(`/meetings/${id}/complete`);
export const deleteMeeting = (id) => api.delete(`/meetings/${id}`);
export const getMeetingNotes = (id) => api.get(`/meetings/${id}/notes`);
export const addMeetingNote = (id, data) => api.post(`/meetings/${id}/notes`, data);
export const deleteMeetingNote = (meetingId, noteId) => api.delete(`/meetings/${meetingId}/notes/${noteId}`);
export const importMeetingNotes = (meetingId, file) => {
  const form = new FormData();
  form.append('file', file);
  return api.post(`/meetings/${meetingId}/notes/import`, form);
};
export const previewMeetingNotes = (meetingId, file) => {
  const form = new FormData();
  form.append('file', file);
  return api.post(`/meetings/${meetingId}/notes/preview`, form);
};
export const importConfirmedNotes = (meetingId, rows) =>
  api.post(`/meetings/${meetingId}/notes/import-confirmed`, rows);
export const downloadNotesTemplate = () =>
  api.get('/meetings/notes-template', { responseType: 'blob' });

// Birthdays
export const getUpcomingBirthdays = (days = 30) => api.get('/persons/birthdays', { params: { days } });

// Person photo
export const uploadPersonPhoto = (personId, file) => {
  const form = new FormData();
  form.append('file', file);
  return api.post(`/persons/${personId}/photo`, form);
};
export const deletePersonPhoto = (personId) => api.delete(`/persons/${personId}/photo`);
export const getPersonPhotoUrl = (personId) => `${BASE_URL}/persons/${personId}/photo`;

// Person documents
export const uploadPersonDocument = (personId, file, categoryId) => {
  const form = new FormData();
  form.append('file', file);
  const url = categoryId ? `/persons/${personId}/documents?categoryId=${categoryId}` : `/persons/${personId}/documents`;
  return api.post(url, form);
};
export const downloadPersonDocument = (personId, docId) =>
  api.get(`/persons/${personId}/documents/${docId}/download`, { responseType: 'blob' });
export const deletePersonDocument = (personId, docId) =>
  api.delete(`/persons/${personId}/documents/${docId}`);

// Document categories
export const getDocumentCategories = () => api.get('/documentcategories');
export const createDocumentCategory = (data) => api.post('/documentcategories', data);
export const updateDocumentCategory = (id, data) => api.put(`/documentcategories/${id}`, data);
export const deleteDocumentCategory = (id) => api.delete(`/documentcategories/${id}`);

// Positions
export const getPositions = () => api.get('/positions');
export const createPosition = (data) => api.post('/positions', data);
export const updatePosition = (id, data) => api.put(`/positions/${id}`, data);
export const deletePosition = (id) => api.delete(`/positions/${id}`);

// Meeting documents
export const uploadMeetingDocument = (meetingId, file) => {
  const form = new FormData();
  form.append('file', file);
  return api.post(`/meetings/${meetingId}/documents`, form);
};
export const downloadMeetingDocument = (meetingId, docId) =>
  api.get(`/meetings/${meetingId}/documents/${docId}/download`, { responseType: 'blob' });
export const deleteMeetingDocument = (meetingId, docId) =>
  api.delete(`/meetings/${meetingId}/documents/${docId}`);

// Meeting links
export const addMeetingLink = (meetingId, data) => api.post(`/meetings/${meetingId}/links`, data);
export const removeMeetingLink = (meetingId, linkId) => api.delete(`/meetings/${meetingId}/links/${linkId}`);

// Tasks
export const getTasks = (params) => api.get('/tasks', { params });
export const getTask = (id) => api.get(`/tasks/${id}`);
export const createTask = (data) => api.post('/tasks', data);
export const updateTask = (id, data) => api.put(`/tasks/${id}`, data);
export const completeTask = (id) => api.post(`/tasks/${id}/complete`);
export const deleteTask = (id) => api.delete(`/tasks/${id}`);

// Task comments
export const getTaskComments = (taskId) => api.get(`/tasks/${taskId}/comments`);
export const addTaskComment = (taskId, text) => api.post(`/tasks/${taskId}/comments`, { text });
export const deleteTaskComment = (taskId, commentId) => api.delete(`/tasks/${taskId}/comments/${commentId}`);

// Timeline
export const getTimeline = (params) => api.get('/timeline', { params });

// Auth extras
export const forgotPassword = (email) => api.post('/auth/forgot-password', { email });
export const resetPassword = (otpCode, newPassword) => api.post('/auth/reset-password', { otpCode, newPassword });

// Admin
export const getUsers = () => api.get('/admin/users');
export const createUser = (data) => api.post('/admin/users', data);
export const setUserRole = (id, role) => api.put(`/admin/users/${id}/role`, JSON.stringify(role), {
  headers: { 'Content-Type': 'application/json' }
});
export const toggleUserActive = (id) => api.put(`/admin/users/${id}/toggle-active`);
export const deleteUser = (id) => api.delete(`/admin/users/${id}`);
export const adminResetPassword = (id, pwd) => api.post(`/admin/users/${id}/reset-password`, JSON.stringify(pwd), {
  headers: { 'Content-Type': 'application/json' }
});
export const generateOtp = (userId) => api.post(`/admin/users/${userId}/generate-otp`);
export const getResetTokens = () => api.get('/admin/reset-tokens');
export const getPersonAccount = (personId) => api.get(`/admin/persons/${personId}/account`);
export const createAccountForPerson = (personId, data) => api.post(`/admin/persons/${personId}/create-account`, data);
export const linkPersonToUser = (userId, personId) => api.put(`/admin/users/${userId}/link-person/${personId}`);
export const unlinkPerson = (userId) => api.put(`/admin/users/${userId}/unlink-person`);

// Notifications
export const getNotifications = (unreadOnly = false) => api.get('/notifications', { params: { unreadOnly } });
export const getUnreadCount = () => api.get('/notifications/unread-count');
export const markNotificationRead = (id) => api.put(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => api.put('/notifications/read-all');
export const deleteNotification = (id) => api.delete(`/notifications/${id}`);

// Tags
export const getTags = () => api.get('/tags');
export const createTag = (data) => api.post('/tags', data);
export const updateTag = (id, data) => api.put(`/tags/${id}`, data);
export const deleteTag = (id) => api.delete(`/tags/${id}`);
export const addTagToPerson = (personId, tagId) => api.post(`/tags/persons/${personId}`, tagId, { headers: { 'Content-Type': 'application/json' } });
export const removeTagFromPerson = (personId, tagId) => api.delete(`/tags/persons/${personId}/${tagId}`);
export const addTagToMeeting = (meetingId, tagId) => api.post(`/tags/meetings/${meetingId}`, tagId, { headers: { 'Content-Type': 'application/json' } });
export const removeTagFromMeeting = (meetingId, tagId) => api.delete(`/tags/meetings/${meetingId}/${tagId}`);

// Reminders
export const getReminders = () => api.get('/reminders');
export const createReminder = (data) => api.post('/reminders', data);
export const completeReminder = (id) => api.put(`/reminders/${id}/complete`);
export const deleteReminder = (id) => api.delete(`/reminders/${id}`);

// Activity log
export const getActivityLog = (params) => api.get('/activitylog', { params });
export const getActivityLogStats = (days = 7) => api.get('/activitylog/stats', { params: { days } });
export const getActivityLogUsers = () => api.get('/activitylog/users');

// Messages
export const getConversations = () => api.get('/messages/conversations');
export const startConversation = (targetUserId) => api.post('/messages/conversations', targetUserId, { headers: { 'Content-Type': 'application/json' } });
export const getMessages = (conversationId, params) => api.get(`/messages/conversations/${conversationId}/messages`, { params });
export const deleteMessage = (messageId) => api.delete(`/messages/${messageId}`);
export const getMessageUnreadCount = () => api.get('/messages/unread-count');
export const getMessageUsers = () => api.get('/messages/users');
export const deleteConversation = (conversationId) => api.delete(`/messages/conversations/${conversationId}`);

// System monitoring
export const getSystemMetrics = () => api.get('/system/metrics');

// Global search
export const globalSearch = (q) => api.get('/search', { params: { q } });

// ── Error message helper ───────────────────────────────────────────────────────
export function getErrorMessage(error) {
  // Server returned a structured message
  const serverMsg = error?.response?.data?.message
    || error?.response?.data?.title
    || error?.response?.data?.detail;
  if (serverMsg && typeof serverMsg === 'string' && serverMsg.length < 300) return serverMsg;

  // Map HTTP status codes to Turkish messages
  switch (error?.response?.status) {
    case 400: return 'Girilen bilgiler geçersiz. Lütfen formu kontrol edin.';
    case 401: return 'Oturum süreniz doldu. Lütfen tekrar giriş yapın.';
    case 403: return 'Bu işlem için yetkiniz bulunmuyor.';
    case 404: return 'İstenen kayıt bulunamadı.';
    case 409: return 'Bu kayıt zaten mevcut.';
    case 413: return 'Dosya boyutu çok büyük.';
    case 422: return 'Girilen veriler işlenemedi. Lütfen kontrol edin.';
    case 429: return 'Çok fazla istek gönderildi. Lütfen bir dakika bekleyin.';
    case 500: return 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.';
    case 502:
    case 503: return 'Sunucu şu anda yanıt veremiyor. Lütfen daha sonra deneyin.';
    default:  return error?.message || 'Beklenmedik bir hata oluştu.';
  }
}

// Export
export const exportPersons = () => api.get('/export/persons', { responseType: 'blob' });
export const exportTasks = () => api.get('/export/tasks', { responseType: 'blob' });
export const exportMeetings = () => api.get('/export/meetings', { responseType: 'blob' });

export default api;
