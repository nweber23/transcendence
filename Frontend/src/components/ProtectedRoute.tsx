import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { isSessionExpired } from '@/utils/authStorage';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { token, logout } = useAuth();
  const expired = isSessionExpired();

  useEffect(() => {
    if (token && expired) {
      logout();
    }
  }, [token, expired, logout]);

  if (!token || expired) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
