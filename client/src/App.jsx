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
          <Route
            path="/dashboard/trip/:tripId"
            element={
              <ProtectedRoute>
                <TripDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/trip/:tripId/expenses"
            element={
              <ProtectedRoute>
                <Expenses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/trip/:tripId/packing-list"
            element={
              <ProtectedRoute>
                <PackingList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/trip/:tripId/gallery"
            element={
              <ProtectedRoute>
                <Gallery />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/trip/:tripId/summary"
            element={
              <ProtectedRoute>
                <TripSummary />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/trip/:tripId/edit"
            element={
              <ProtectedRoute>
                <EditTrip />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/trip/:tripId/generate-itinerary"
            element={
              <ProtectedRoute>
                <GenerateItinerary />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/trip/:tripId/itinerary"
            element={
              <ProtectedRoute>
                <Itinerary />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/trip/:tripId/itineraries"
            element={
              <ProtectedRoute>
                <ItineraryCandidates />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/trip/:tripId/itineraries/compare"
            element={
              <ProtectedRoute>
                <ItineraryCompare />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/trip/:tripId/itineraries/:itineraryId"
            element={
              <ProtectedRoute>
                <ItineraryDetails />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
