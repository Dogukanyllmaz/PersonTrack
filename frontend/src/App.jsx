import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { ChatHubProvider } from './hooks/useChatHub';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';

import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Persons from './pages/Persons';
import Meetings from './pages/Meetings';
import MeetingDetail from './pages/MeetingDetail';
import Tasks from './pages/Tasks';
import Timeline from './pages/Timeline';
import Admin from './pages/Admin';
import PersonDetail from './pages/PersonDetail';
import Notifications from './pages/Notifications';
import Reminders from './pages/Reminders';
import ActivityLog from './pages/ActivityLog';
import Calendar from './pages/Calendar';
import Tags from './pages/Tags';
import Messages from './pages/Messages';
import Monitor from './pages/Monitor';
import Profile from './pages/Profile';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route path="/dashboard" element={
        <PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>
      } />
      <Route path="/persons" element={
        <PrivateRoute managerOnly><Layout><Persons /></Layout></PrivateRoute>
      } />
      <Route path="/persons/:id" element={
        <PrivateRoute managerOnly><Layout><PersonDetail /></Layout></PrivateRoute>
      } />
      <Route path="/meetings" element={
        <PrivateRoute><Layout><Meetings /></Layout></PrivateRoute>
      } />
      <Route path="/meetings/:id" element={
        <PrivateRoute><Layout><MeetingDetail /></Layout></PrivateRoute>
      } />
      <Route path="/tasks" element={
        <PrivateRoute managerOnly><Layout><Tasks /></Layout></PrivateRoute>
      } />
      <Route path="/timeline" element={
        <PrivateRoute><Layout><Timeline /></Layout></PrivateRoute>
      } />
      <Route path="/notifications" element={
        <PrivateRoute><Layout><Notifications /></Layout></PrivateRoute>
      } />
      <Route path="/reminders" element={
        <PrivateRoute><Layout><Reminders /></Layout></PrivateRoute>
      } />
      <Route path="/calendar" element={
        <PrivateRoute><Layout><Calendar /></Layout></PrivateRoute>
      } />
      <Route path="/tags" element={
        <PrivateRoute managerOnly><Layout><Tags /></Layout></PrivateRoute>
      } />
      <Route path="/messages" element={
        <PrivateRoute><Layout><Messages /></Layout></PrivateRoute>
      } />
      <Route path="/activity-log" element={
        <PrivateRoute adminOnly><Layout><ActivityLog /></Layout></PrivateRoute>
      } />
      <Route path="/monitor" element={
        <PrivateRoute adminOnly><Layout><Monitor /></Layout></PrivateRoute>
      } />
      <Route path="/admin" element={
        <PrivateRoute adminOnly><Layout><Admin /></Layout></PrivateRoute>
      } />
      <Route path="/profile" element={
        <PrivateRoute><Layout><Profile /></Layout></PrivateRoute>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ThemeProvider>
          <ToastProvider>
            <ChatHubProvider>
              <AppRoutes />
            </ChatHubProvider>
          </ToastProvider>
        </ThemeProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}
