import { createBrowserRouter, Outlet } from 'react-router-dom';

import { AuthProvider } from '@/auth/AuthContext';
import { ProtectedRoute } from '@/auth/ProtectedRoute';
import { AppLayout } from '@/components/AppLayout';
import { LoginPage } from '@/features/auth/LoginPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';

/** AuthProvider lives inside the router so it can use navigation (401 redirect, logout). */
function AuthLayout() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppLayout />,
            children: [{ index: true, element: <DashboardPage /> }],
          },
        ],
      },
    ],
  },
]);
