import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Contexts
import { AuthProvider } from './contexts/AuthContext';
import RestaurantProvider from './contexts/RestaurantContext';

// Components
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RestaurantListPage from './pages/restaurants/RestaurantListPage';
import AddRestaurantPage from './pages/restaurants/AddRestaurantPage';
import RestaurantDetailPage from './pages/restaurants/RestaurantDetailPage';
import EditRestaurantPage from './pages/restaurants/EditRestaurantPage';
import AddReviewPage from './pages/restaurants/AddReviewPage';

function App() {
  return (
    <AuthProvider>
      <RestaurantProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="login" element={<LoginPage />} />

              {/* Protected routes */}
              <Route
                path="restaurants"
                element={
                  <ProtectedRoute>
                    <RestaurantListPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="restaurants/new"
                element={
                  <ProtectedRoute>
                    <AddRestaurantPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="restaurants/:restaurantId"
                element={
                  <ProtectedRoute>
                    <RestaurantDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="restaurants/:restaurantId/edit"
                element={
                  <ProtectedRoute>
                    <EditRestaurantPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="restaurants/:restaurantId/review"
                element={
                  <ProtectedRoute>
                    <AddReviewPage />
                  </ProtectedRoute>
                }
              />

              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </RestaurantProvider>
    </AuthProvider>
  );
}

export default App;
