import React, { createContext, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

interface User {
  id: number;
  name: string;
  role: string;
}

interface AuthContextType {
  accessToken: string | null;
  user: User | null;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [accessToken, setAccessToken] = useState<string | null>(
    localStorage.getItem("accessToken")
  );
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  const logout = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    localStorage.removeItem("accessToken");
    navigate("/login");
  }, [navigate]);

  const fetchUserInfo = useCallback(
    async (token: string) => {
      try {
        const response = await axios.get("https://api.example.com/user-info", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(response.data);
      } catch (error) {
        console.error("Error fetching user info:", error);
        logout();
      }
    },
    [logout]
  );

  const login = async (token: string) => {
    setAccessToken(token);
    localStorage.setItem("accessToken", token);
    await fetchUserInfo(token);
  };

 useEffect(() => {
  if (!accessToken) return;

  try {
    const payload = JSON.parse(atob(accessToken.split(".")[1]));

    // Check token expiration
    if (payload.exp * 1000 < Date.now()) {
      logout();
      return;
    }

    fetchUserInfo(accessToken);
  } catch (error) {
    console.error("Invalid token:", error);
    logout();
  }
}, [accessToken, fetchUserInfo, logout]);

  return (
    <AuthContext.Provider value={{ accessToken, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
