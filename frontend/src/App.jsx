import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { LanguageProvider } from './context/LanguageContext';
import { ChatHubProvider } from './hooks/useChatHub';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import { PageLoader } from './components/Skeleton';

// ── Eager: auth pages are tiny and always needed first ──────────────
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// ── Lazy: every protected page gets its own JS chunk ────────────────
const Dashboard    = lazy(() => import('./pages/Dashboard'));
const Persons      = lazy(() => import('./pages/Persons'));
const PersonDetail = lazy(() => import('./pages/PersonDetail'));
const Meetings     = lazy(() => import('./pages/Meetings'));
const MeetingDetail= lazy(() => import('./pages/MeetingDetail'));
const Tasks        = lazy(() => import('./pages/Tasks'));
const Timeline     = lazy(() => import('./pages/Timeline'));
const Notifications= lazy(() => import('./pages/Notifications'));
const Reminders    = lazy(() => import('./pages/Reminders'));
const Calendar     = lazy(() => import('./pages/Calendar'));
const Tags         = lazy(() => import('./pages/Tags'));
const Messages     = lazy(() => import('./pages/Messages'));
const ActivityLog  = lazy(() => import('./pages/ActivityLog'));
const Monitor      = lazy(() => import('./pages/Monitor'));
const Admin        = lazy(() => import('./pages/Admin'));
const Profile      = lazy(() => import('./pages/Profile'));
const PersonsPrint = lazy(() => import('./pages/PersonsPrint'));

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login"            element={<Login />} />
        <Route path="/forgot-password"  element={<ForgotPassword />} />
        <Route path="/reset-password"   element={<ResetPassword />} />
        <Route path="/"                 element={<Navigate to="/dashboard" replace />} />

        <Route path="/dashboard" element={
          <PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>
        } />
        <Route path="/persons" element={
          <PrivateRoute managerOnly><Layout><Persons /></Layout></PrivateRoute>
        } />
        <Route path="/persons/print" element={
          <PrivateRoute managerOnly><PersonsPrint /></PrivateRoute>
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
    </Suspense>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ThemeProvider>
          <LanguageProvider>
            <ToastProvider>
              <ChatHubProvider>
                <AppRoutes />
              </ChatHubProvider>
            </ToastProvider>
          </LanguageProvider>
        </ThemeProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}
