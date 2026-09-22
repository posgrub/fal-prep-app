import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { fetchMe, login as apiLogin, logout as apiLogout, type Account } from './api';

interface AuthState {
  user: Account | null | undefined;          // undefined = still checking
  setUser: (u: Account | null) => void;
  login: (email: string, password: string) => Promise<Account>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Account | null | undefined>(undefined);
  useEffect(() => { fetchMe().then(setUser); }, []);
  const login = async (email: string, password: string) => { const u = await apiLogin(email, password); setUser(u); return u; };
  const logout = async () => { await apiLogout(); setUser(null); };
  return <Ctx.Provider value={{ user, setUser, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth outside AuthProvider');
  return v;
}
