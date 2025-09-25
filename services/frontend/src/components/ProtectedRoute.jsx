import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  // Try sessionStorage first, fallback to localStorage for backwards compatibility
  const token =
    sessionStorage.getItem("token") || localStorage.getItem("token");
  return token ? children : <Navigate to="/login" replace />;
}
