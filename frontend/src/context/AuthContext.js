import React, { createContext, useContext, useEffect, useState } from "react";
import api from "@/lib/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // null = checking, false = anon, object = authed
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("arsa_token");
    if (!token) {
      setUser(false);
      setChecking(false);
      return;
    }
    api
      .get("/auth/me")
      .then((res) => setUser(res.data))
      .catch(() => {
        localStorage.removeItem("arsa_token");
        setUser(false);
      })
      .finally(() => setChecking(false));
  }, []);

  const login = (token, userData) => {
    localStorage.setItem("arsa_token", token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("arsa_token");
    setUser(false);
  };

  return (
    <AuthContext.Provider value={{ user, checking, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
