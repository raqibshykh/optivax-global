/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

// Updated imports for pure React
import { fetchSession, api, MockUserSession, mockLogin } from "../lib/client";
import { User, UserRole } from "../types";
import { useSSE } from "../hooks/useSSE";
import { getRoleHome } from "../lib/roles";

// Convert MockUserSession to User
const sessionToUser = (session: MockUserSession): User => ({
  id: session.id,
  email: session.email,
  password: "",
  name: session.user_metadata.full_name,
  role: session.user_metadata.role,
  avatar: session.user_metadata.avatar_url ?? "",
  company: session.user_metadata.company ?? "",
  joinDate: new Date().toISOString(),
});

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<string>;
  logout: () => Promise<void>;
  register: (
    email: string,
    password: string,
    name: string,
    role?: UserRole
  ) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

/*
const sessionToUser = (session: WpUserSession): User => ({
  id: session.id,
  email: session.email,
  password: "",
  name: session.user_metadata?.full_name || session.email,
  role: session.user_metadata?.role || "client",
  avatar: session.user_metadata?.avatar_url || "",
  company: session.user_metadata?.company || "",
  joinDate: new Date().toISOString(),
});
*/

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Start SSE when a user is authenticated
  useSSE(!!user);

  useEffect(() => {
    (async () => {
      try {
        const session = await fetchSession();
        if (session) {
          setUser(sessionToUser(session));
        }
      } catch {
        // No valid session — user stays null
      } finally {
        setIsInitializing(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string): Promise<string> => {
    // Use mock login for development
    const session = await mockLogin(email, password);
    if (!session) throw new Error("Failed to retrieve user session");
    const profile = sessionToUser(session);
    setUser(profile);
    return getRoleHome(profile.role);
  };

  const logout = async (): Promise<void> => {
    try {
      await api.post("/saas/v1/auth/logout", {});
    } catch {
      // ignore — still clear local state
    }
    setUser(null);
  };

  const register = async (
    email: string,
    password: string,
    name: string,
    role: UserRole = "client"
  ): Promise<void> => {
    await api.post("/saas/v1/auth/signup", {
      email,
      password,
      options: {
        data: { full_name: name, role },
      },
    });

    await api.post("/saas/v1/auth/login", { email, password });

    const session = await fetchSession();
    if (!session) {
      throw new Error("Registration succeeded but failed to fetch session");
    }

    setUser(sessionToUser(session));
  };

  const updateProfile = async (data: Partial<User>): Promise<void> => {
    if (!user) throw new Error("No user logged in");

    await api.put("/saas/v1/profiles/update", {
      id: user.id,
      full_name: data.name ?? user.name,
      company: data.company ?? user.company,
      avatar_url: data.avatar ?? user.avatar,
    });
    setUser({ ...user, ...data });
  };

  const value: AuthContextType = {
    user,
    isLoading: isInitializing,
    isAuthenticated: !!user,
    login,
    logout,
    register,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
