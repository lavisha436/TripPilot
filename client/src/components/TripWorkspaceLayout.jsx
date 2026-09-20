import React from 'react';
import { useParams, useLocation, Link, Outlet } from 'react-router-dom';
import {
  Compass,
  Wand2,
  Calendar,
  Layers,
  Wallet,
  Luggage,
  Image,
  Sparkles,
  ArrowLeft
} from 'lucide-react';

/**
 * 🧭 TripWorkspaceLayout Component: Shared persistent layout shell for all Trip Workspace pages.
 * Houses the persistent Trip Workspace sidebar and renders current page content via Outlet.
 */
export default function TripWorkspaceLayout() {
  const { tripId } = useParams();
  const location = useLocation();

  const pathname = location.pathname;

  // Mutually exclusive active state matching based on existing routes
  const isOverview =
    pathname === `/dashboard/trip/${tripId}` ||
    pathname === `/dashboard/trip/${tripId}/`;
  const isGenerateItinerary = pathname.startsWith(
    `/dashboard/trip/${tripId}/generate-itinerary`
  );
  const isActiveItinerary =
    pathname === `/dashboard/trip/${tripId}/itinerary` ||
    pathname === `/dashboard/trip/${tripId}/itinerary/`;
  const isItineraryVersions = pathname.startsWith(
    `/dashboard/trip/${tripId}/itineraries`
  );
  const isExpenses =
    pathname.startsWith(`/dashboard/trip/${tripId}/expenses`) ||
    pathname.startsWith(`/dashboard/trip/${tripId}/budget`);
  const isPackingList = pathname.startsWith(
    `/dashboard/trip/${tripId}/packing-list`
  );
  const isGallery = pathname.startsWith(`/dashboard/trip/${tripId}/gallery`);
  const isSummary = pathname.startsWith(`/dashboard/trip/${tripId}/summary`);

  return (
    <div className="tp-workspace-page">
      {/* 🧭 Persistent Left Workspace Sidebar */}
      <aside className="tp-workspace-sidebar">
        <div className="tp-workspace-sidebar-header">
          <Link to="/" className="tp-brand" title="TripPilot Home">
            <div className="tp-brand-icon-plane">
              <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="tp-plane-svg">
                <path d="M2.5 13L25.5 2.5L14 25.5L10.5 16L2.5 13Z" fill="#1e293b" />
                <path d="M10.5 16L25.5 2.5L14 25.5L10.5 16Z" fill="#0f172a" />
                <path d="M25.5 2.5L10.5 16" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
                <path d="M10.5 16V21.5L13.5 18.5" fill="#334155" stroke="#334155" strokeWidth="1" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="tp-brand-text-group">
              <span className="tp-brand-name">TripPilot</span>
              <span className="tp-brand-tagline">Plan • Explore • Belong</span>
            </div>
          </Link>

          <Link to="/dashboard" className="tp-workspace-back-link" title="Return to Dashboard">
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
          </Link>
        </div>

        <nav className="tp-workspace-nav">
          <div className="tp-workspace-nav-section">
            <div className="tp-workspace-nav-heading">TRIP</div>
            <div className="tp-workspace-nav-list">
              <Link
                to={`/dashboard/trip/${tripId}`}
                className={`tp-workspace-nav-item ${isOverview ? 'active' : ''}`}
                title="Trip Overview"
              >
                <Compass size={18} className="tp-workspace-nav-icon" />
                <span>Overview</span>
              </Link>

              <Link
                to={`/dashboard/trip/${tripId}/generate-itinerary`}
                className={`tp-workspace-nav-item ${isGenerateItinerary ? 'active' : ''}`}
                title="Generate Itinerary"
              >
                <Wand2 size={18} className="tp-workspace-nav-icon" />
                <span>Generate Itinerary</span>
              </Link>

              <Link
                to={`/dashboard/trip/${tripId}/itinerary`}
                className={`tp-workspace-nav-item ${isActiveItinerary ? 'active' : ''}`}
                title="Active Itinerary"
              >
                <Calendar size={18} className="tp-workspace-nav-icon" />
                <span>Active Itinerary</span>
              </Link>

              <Link
                to={`/dashboard/trip/${tripId}/itineraries`}
                className={`tp-workspace-nav-item ${isItineraryVersions ? 'active' : ''}`}
                title="Itinerary Versions"
              >
                <Layers size={18} className="tp-workspace-nav-icon" />
                <span>Itinerary Versions</span>
              </Link>

              <Link
                to={`/dashboard/trip/${tripId}/expenses`}
                className={`tp-workspace-nav-item ${isExpenses ? 'active' : ''}`}
                title="Budget & Expenses"
              >
                <Wallet size={18} className="tp-workspace-nav-icon" />
                <span>Budget & Expenses</span>
              </Link>

              <Link
                to={`/dashboard/trip/${tripId}/packing-list`}
                className={`tp-workspace-nav-item ${isPackingList ? 'active' : ''}`}
                title="Packing List"
              >
                <Luggage size={18} className="tp-workspace-nav-icon" />
                <span>Packing List</span>
              </Link>

              <Link
                to={`/dashboard/trip/${tripId}/gallery`}
                className={`tp-workspace-nav-item ${isGallery ? 'active' : ''}`}
                title="Photo Gallery"
              >
                <Image size={18} className="tp-workspace-nav-icon" />
                <span>Photo Gallery</span>
              </Link>

              <Link
                to={`/dashboard/trip/${tripId}/summary`}
                className={`tp-workspace-nav-item ${isSummary ? 'active' : ''}`}
                title="Trip Summary"
              >
                <Sparkles size={18} className="tp-workspace-nav-icon" />
                <span>Trip Summary</span>
              </Link>
            </div>
          </div>
        </nav>
      </aside>

      {/* Main Workspace Area */}
      <main className="tp-workspace-main">
        <Outlet />
      </main>
    </div>
  );
}
