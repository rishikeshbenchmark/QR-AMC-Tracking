import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';

import { AuthProvider } from '@/auth/AuthContext';
import { ProtectedRoute } from '@/auth/ProtectedRoute';
import { RequirePermission } from '@/auth/RequirePermission';
import { AppLayout } from '@/components/AppLayout';
import { LoginPage } from '@/features/auth/LoginPage';
import { MastersPage } from '@/features/masters/MastersPage';
import { CategoriesPage } from '@/features/masters/categories/CategoriesPage';
import { CustomersPage } from '@/features/masters/categories/customers/CustomersPage';
import { SuppliersPage } from '@/features/masters/categories/suppliers/suppliersPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { MakesPage } from '@/features/masters/makes/MakesPage';

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
                children: [
                  {
                    path: 'masters',
                    element: <MastersPage />,
                    children: [
                      { index: true, element: <Navigate to="categories" replace /> },
                      { path: 'categories', element: <CategoriesPage /> },
                      { path: 'customers', element: <CustomersPage /> },
                      { path: 'makes', element: <MakesPage /> },
                    ],
                  },
                  {
                    path: 'masters/suppliers',
                    element: <SuppliersPage />,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
]);