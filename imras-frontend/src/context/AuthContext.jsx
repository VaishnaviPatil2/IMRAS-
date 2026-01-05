import { createContext, useState, useEffect } from "react";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simple initialization without async validation
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    const name = localStorage.getItem("name");
    const email = localStorage.getItem("email");
    
    if (token && role) {
      setUser({ token, role, name, email });
    }
    
    setLoading(false);
  }, []);

  const login = (token, role, name = null, email = null) => {
    localStorage.setItem("token", token);
    localStorage.setItem("role", role);
    if (name) localStorage.setItem("name", name);
    if (email) localStorage.setItem("email", email);
    setUser({ token, role, name, email });
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
