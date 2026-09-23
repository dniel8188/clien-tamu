import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, checking } = useAuth();
  if (checking)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBF9F5] text-[#756B64] font-serif text-xl">
        Memuat…
      </div>
    );
  if (!user) return <Navigate to="/admin/login" replace />;
  return children;
}
