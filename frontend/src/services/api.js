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

// Redirect to login on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const login = (data) => api.post('/auth/login', data);
export const getMe = () => api.get('/auth/me');
export const changePassword = (data) => api.post('/auth/change-password', data);

// Persons
export const getPersons = (search) => api.get('/persons', { params: { search } });
export const getPerson = (id) => api.get(`/persons/${id}`);
export const createPerson = (data) => api.post('/persons', data);
export const updatePerson = (id, data) => api.put(`/persons/${id}`, data);
export const deletePerson = (id) => api.delete(`/persons/${id}`);
export const addRelationship = (id, data) => api.post(`/persons/${id}/relationships`, data);
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
export const uploadPersonDocument = (personId, file) => {
  const form = new FormData();
  form.append('file', file);
  return api.post(`/persons/${personId}/documents`, form);
};
export const downloadPersonDocument = (personId, docId) =>
  api.get(`/persons/${personId}/documents/${docId}/download`, { responseType: 'blob' });
export const deletePersonDocument = (personId, docId) =>
  api.delete(`/persons/${personId}/documents/${docId}`);

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

export default api;
