import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireRole?: "ADMIN" | "CONGTACVIEN" | "USER";
  requireRoles?: ("ADMIN" | "CONGTACVIEN" | "USER")[];
}

export function ProtectedRoute({
  children,
  requireAuth = true,
  requireRole,
  requireRoles,
}: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    // Redirect to login with return URL
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role requirements
  if (requireRole || requireRoles) {
    const allowedRoles = requireRoles || (requireRole ? [requireRole] : []);
    const userRole = user?.role;
    
    if (!userRole || !allowedRoles.includes(userRole)) {
      // Redirect to home if user doesn't have required role
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}

