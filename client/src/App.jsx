import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import './socket.js';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import TripDetails from './pages/TripDetails.jsx';
import CreateTrip from './pages/CreateTrip.jsx';
import EditTrip from './pages/EditTrip.jsx';
import GenerateItinerary from './pages/GenerateItinerary.jsx';
import Itinerary from './pages/Itinerary.jsx';
import ItineraryCandidates from './pages/ItineraryCandidates.jsx';
import ItineraryDetails from './pages/ItineraryDetails.jsx';
import ItineraryCompare from './pages/ItineraryCompare.jsx';
import Expenses from './pages/Expenses.jsx';
import PackingList from './pages/PackingList.jsx';
import DiscoverDestinations from './pages/DiscoverDestinations.jsx';
import Gallery from './pages/Gallery.jsx';
import TripSummary from './pages/TripSummary.jsx';
import Profile from './pages/Profile.jsx';

import TripWorkspaceLayout from './components/TripWorkspaceLayout.jsx';

/**
 * 🚀 App Component: Configures React Router client-side routing.
 * Wrapped with AuthProvider to share authentication state across all routes.
 */
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/create"
            element={
              <ProtectedRoute>
                <CreateTrip />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/discover-destinations"
            element={
              <ProtectedRoute>
                <DiscoverDestinations />
              </ProtectedRoute>
            }
          />

          {/* 🧭 Trip Workspace Shell Routes with Persistent Sidebar */}
          <Route
            path="/dashboard/trip/:tripId"
            element={
              <ProtectedRoute>
                <TripWorkspaceLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<TripDetails />} />
            <Route path="generate-itinerary" element={<GenerateItinerary />} />
            <Route path="itinerary" element={<Itinerary />} />
            <Route path="itineraries" element={<ItineraryCandidates />} />
            <Route path="itineraries/compare" element={<ItineraryCompare />} />
            <Route path="itineraries/:itineraryId" element={<ItineraryDetails />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="packing-list" element={<PackingList />} />
            <Route path="gallery" element={<Gallery />} />
            <Route path="summary" element={<TripSummary />} />
            <Route path="edit" element={<EditTrip />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
