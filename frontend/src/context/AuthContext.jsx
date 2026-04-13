import { createContext, useContext, useState, useEffect } from 'react';
import { getMe, logoutApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const stored = localStorage.getItem('user');
    if (token && stored) {
      setUser(JSON.parse(stored));
      // Verify token validity
      getMe()
        .then((res) => setUser(res.data))
        .catch(() => logout())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const loginUser = (userData, token, refreshToken) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    setUser(userData);
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try { await logoutApi(refreshToken); } catch {}
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  const isAdmin = user?.role === 'Admin';
  const isManager = user?.role === 'Manager';
  const canManage = isAdmin || isManager;

  return (
    <AuthContext.Provider value={{ user, loading, loginUser, logout, isAdmin, isManager, canManage }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
