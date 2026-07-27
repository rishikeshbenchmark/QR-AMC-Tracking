import { createBrowserRouter, Outlet } from 'react-router-dom';

import { AuthProvider } from '@/auth/AuthContext';
import { ProtectedRoute } from '@/auth/ProtectedRoute';
import { RequirePermission } from '@/auth/RequirePermission';
import { AppLayout } from '@/components/AppLayout';
import { LoginPage } from '@/features/auth/LoginPage';
import { CategoriesPage } from '@/features/masters/categories/CategoriesPage';
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
            children: [
              { index: true, element: <DashboardPage /> },
              {
                element: <RequirePermission permission="master.manage" />,
                children: [{ path: 'masters/categories', element: <CategoriesPage /> }],
              },
            ],
          },
        ],
      },
    ],
  },
]);
