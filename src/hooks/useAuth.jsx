import { useState, useEffect, useCallback, createContext, useContext } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('fc_user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (sleeperName, password) => {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sleeperName, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');

    setUser(data);
    localStorage.setItem('fc_user', JSON.stringify(data));
    return data;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('fc_user');
  }, []);

  // Role-based access helpers
  // Fallback: if session was created before roles shipped, derive from ownerId
  const ROLE_BY_OWNER = {
    '863922541440425984': 'super_admin',  // Demar / Donkey Kong
    '463127531231375360': 'admin',        // Drew / Wario
  };
  const role = user?.role || ROLE_BY_OWNER[user?.ownerId] || 'user';
  const isSuperAdmin = role === 'super_admin';
  const isAdmin = role === 'admin' || role === 'super_admin';

  // Backwards compat — isCommissioner now maps to isAdmin
  const isCommissioner = isAdmin;

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, role, isSuperAdmin, isAdmin, isCommissioner }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
