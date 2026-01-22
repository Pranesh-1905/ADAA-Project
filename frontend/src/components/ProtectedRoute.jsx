import { Navigate } from 'react-router-dom';
import { getToken } from '../api';

export const ProtectedRoute = ({ children }) => {
  const token = getToken();
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

export const PublicRoute = ({ children }) => {
  const token = getToken();
  
  if (token) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};
