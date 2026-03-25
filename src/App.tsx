/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { Dashboard } from './components/Dashboard';
import { Login } from './components/Login';
import { CategoryDetail } from './components/CategoryDetail';
import { InventorySummary } from './components/InventorySummary';
import { HistoryLog } from './components/HistoryLog';
import { AdminPanel } from './components/AdminPanel';
import { Receipts } from './components/Receipts';
import { inventoryService } from './services/inventoryService';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Toaster } from 'sonner';
import { auth } from './firebase';

// Remove Reports placeholder

const ProtectedRoute = () => {
  const { user, isLoading, isFirebaseReady } = useAuth();
  
  if (isLoading || !isFirebaseReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

const AppRoutes = () => {
  const { user, isLoading, isFirebaseReady } = useAuth();

  useEffect(() => {
    if (isFirebaseReady) {
      inventoryService.seedInitialData();
    }
  }, [isFirebaseReady]);

  if (isLoading || !isFirebaseReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={user ? <Navigate to="/dashboard" replace /> : <Login />} 
      />
      
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/history" element={<HistoryLog />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/receipts" element={<Receipts />} />
          <Route path="/category/:id" element={<CategoryDetail />} />
          <Route path="/summary/:id" element={<InventorySummary />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
    </Routes>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Toaster position="top-right" richColors />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
