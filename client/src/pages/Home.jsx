import React, { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import {
  Compass,
  Sparkles,
  Calendar,
  CloudSun,
  Wallet,
  CreditCard,
  Search,
  PackageCheck,
  Users,
  Image,
  MapPin,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Activity,
  ChevronRight,
  Clock,
  Map,
  Heart,
  Play,
  Plane,
  Bell,
  Camera
} from 'lucide-react';

/**
 * 🏠 Home Page Component: Production-level landing page for TripPilot AI.
 */
export default function Home() {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('itinerary');
  const [promptText, setPromptText] = useState('');

  const samplePrompts = [
    '5 days in Tokyo for a culture & food trip',
    'Weekend getaway to Goa',
    '7 days adventure in Himachal Pradesh',
    '4 days in Jaipur palaces & heritage'
  ];

  return (
    <div className="tp-landing-page">
      {/* Sticky Navigation Header */}
      <Navbar />

      {/* ========================================================= */}
      {/* 🚀 1. HERO SECTION (Scenic Mountain Fortress Travel Editorial) */}
      {/* ========================================================= */}
      <section className="tp-hero-section">
        <div className="tp-hero-container">
          <div className="tp-hero-grid">
            {/* Left Column: Editorial Headline, Subtitle, and CTAs */}
            <div className="tp-hero-content">
              {/* Eyebrow */}
              <div className="tp-hero-eyebrow">
                <span className="tp-hero-eyebrow-text">YOUR TRAVEL COMPANION</span>
              </div>

              {/* Main Editorial Heading */}
              <h1 className="tp-hero-headline">
                Discover More<br />
                Travel Smarter<br />
                With <span className="tp-hero-brand-highlight">TripPilot</span>
              </h1>

              {/* Supporting Text */}
              <p className="tp-hero-description">
                Plan, manage, and experience unforgettable journeys tailored to you.
              </p>

              {/* Primary & Secondary Action Buttons */}
              <div className="tp-hero-actions">
                <Link
                  to={user ? '/dashboard/create' : '/register'}
                  className="tp-btn-hero-primary"
                >
                  Start Planning <ArrowRight size={16} />
                </Link>

                <Link
                  to={user ? '/dashboard/discover-destinations' : '/login'}
                  className="tp-btn-hero-secondary"
                >
                  <span className="tp-btn-icon-circle">
                    <Compass size={14} />
                  </span>
                  Discover Destinations
                </Link>
              </div>
            </div>

            {/* Right Column: Hand-lettered Script Quote over Sky */}
            <div className="tp-hero-visual-side">
              <div className="tp-hero-script-badge">
                <div className="tp-hero-script-text">
                  <span>Good</span>
                  <span>Trips</span>
                  <span>Better</span>
                  <span>Stories</span>
                </div>
                {/* Hand-drawn accent swoosh under 'Stories' */}
                <svg className="tp-hero-script-swoosh" viewBox="0 0 160 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 20C55 4 110 6 154 16" stroke="var(--color-travel-orange)" strokeWidth="4.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 📊 2. USER BENEFIT BAR - Clean Light Travel Feature Strip */}
      {/* ========================================================= */}
      <section className="tp-benefits-bar">
        <div className="tp-benefits-container">
          {/* Feature 1 */}
          <div className="tp-benefit-item">
            <div className="tp-benefit-icon-wrap tp-benefit-icon-plan">
              <Compass size={22} />
            </div>
            <div className="tp-benefit-content">
              <h4 className="tp-benefit-title">Personalized Itineraries</h4>
              <p className="tp-benefit-subtitle">Personalized plans for your travel style.</p>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="tp-benefit-item">
            <div className="tp-benefit-icon-wrap tp-benefit-icon-weather">
              <Map size={22} />
            </div>
            <div className="tp-benefit-content">
              <h4 className="tp-benefit-title">Real-time Travel Insights</h4>
              <p className="tp-benefit-subtitle">Stay updated, travel hassle-free.</p>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="tp-benefit-item">
            <div className="tp-benefit-icon-wrap tp-benefit-icon-budget">
              <Heart size={22} />
            </div>
            <div className="tp-benefit-content">
              <h4 className="tp-benefit-title">Smart Budget Planning</h4>
              <p className="tp-benefit-subtitle">Plan better, spend smarter.</p>
            </div>
          </div>

          {/* Feature 4 */}
          <div className="tp-benefit-item">
            <div className="tp-benefit-icon-wrap tp-benefit-icon-group">
              <Users size={22} />
            </div>
            <div className="tp-benefit-content">
              <h4 className="tp-benefit-title">Travel Together</h4>
              <p className="tp-benefit-subtitle">Collaborate, share, and make memories.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* ⚡ 3. PRODUCT CAPABILITIES STORY */}
      {/* ========================================================= */}
      {/* ========================================================= */}
      {/* ⚡ 3. COMPLETE WORKSPACE CAPABILITIES (STORYTELLING LAYOUT) */}
      {/* ========================================================= */}
      <section id="capabilities" className="tp-capabilities-section">
        {/* Section Header */}
        <div className="tp-capabilities-header">
          <span className="tp-capabilities-eyebrow">COMPLETE WORKSPACE CAPABILITIES</span>
          <h2 className="tp-capabilities-title">Built for Every Aspect of Your Trip</h2>
          <p className="tp-capabilities-subtitle">
            Everything you need to plan, manage, and enjoy your trip — all in one place.
          </p>
        </div>

        <div className="tp-capabilities-blocks">
          {/* 1. AI TRIP CREATION BLOCK */}
          <div className="tp-cap-story-card tp-cap-story-split">
            <div className="tp-cap-visual-wrap">
              <img
                src="/capabilities-ai-travel.webp"
                alt="Trip Creation"
                className="tp-cap-photo"
                loading="lazy"
              />
            </div>
            <div className="tp-cap-content-wrap">
              <div className="tp-cap-block-header">
                <div className="tp-cap-badge-circle tp-icon-orange">
                  <Sparkles size={20} />
                </div>
                <div className="tp-cap-header-text">
                  <span className="tp-cap-tag-label">TRIP CREATION</span>
                  <h3 className="tp-cap-story-heading">Smarter Plans, Happier Journeys</h3>
                  <p className="tp-cap-story-desc">
                    Get personalized itineraries, discover hidden gems, and plan your trip your way effortlessly.
                  </p>
                </div>
              </div>

              <div className="tp-cap-features-list">
                <div className="tp-cap-feature-row">
                  <div className="tp-cap-icon-circle tp-icon-orange">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <h4 className="tp-cap-feature-title">Smart Itinerary Generation</h4>
                    <p className="tp-cap-feature-text">
                      Create personalized day-by-day plans built around your travel style.
                    </p>
                  </div>
                </div>

                <div className="tp-cap-feature-row">
                  <div className="tp-cap-icon-circle tp-icon-rose">
                    <Search size={18} />
                  </div>
                  <div>
                    <h4 className="tp-cap-feature-title">Destination Discovery</h4>
                    <p className="tp-cap-feature-text">
                      Find destinations matched to your dates, interests, and travel style.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. SMART LOGISTICS & WEATHER BLOCK */}
          <div className="tp-cap-story-card tp-cap-story-split tp-cap-story-reverse">
            <div className="tp-cap-visual-wrap">
              <img
                src="/capabilities-logistics-scenic.webp"
                alt="Stay Prepared, Travel Smarter"
                className="tp-cap-photo"
                loading="lazy"
              />
            </div>
            <div className="tp-cap-content-wrap">
              <div className="tp-cap-block-header">
                <div className="tp-cap-badge-circle tp-icon-blue">
                  <Activity size={20} />
                </div>
                <div className="tp-cap-header-text">
                  <span className="tp-cap-tag-label">SMART LOGISTICS & WEATHER</span>
                  <h3 className="tp-cap-story-heading">Stay Prepared, Travel Smarter</h3>
                  <p className="tp-cap-story-desc">
                    From real-time weather updates to smart budgeting, we help you stay ahead and travel with confidence.
                  </p>
                </div>
              </div>

              <div className="tp-cap-features-grid">
                <div className="tp-cap-feature-row">
                  <div className="tp-cap-icon-circle tp-icon-blue">
                    <CloudSun size={18} />
                  </div>
                  <div>
                    <h4 className="tp-cap-feature-title">Weather Advisory & Replanning</h4>
                    <p className="tp-cap-feature-text">
                      Stay ahead of weather changes and adapt your itinerary.
                    </p>
                  </div>
                </div>

                <div className="tp-cap-feature-row">
                  <div className="tp-cap-icon-circle tp-icon-rose">
                    <Wallet size={18} />
                  </div>
                  <div>
                    <h4 className="tp-cap-feature-title">Smart Budget Planning</h4>
                    <p className="tp-cap-feature-text">
                      Plan transport, stays, and emergency costs with ease.
                    </p>
                  </div>
                </div>

                <div className="tp-cap-feature-row tp-feature-full-span">
                  <div className="tp-cap-icon-circle tp-icon-amber">
                    <PackageCheck size={18} />
                  </div>
                  <div>
                    <h4 className="tp-cap-feature-title">Smart Packing Checklists</h4>
                    <p className="tp-cap-feature-text">
                      Get a packing list tailored to your destination and activities.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. COLLABORATION & MEMORIES BLOCK */}
          <div className="tp-cap-story-card tp-cap-story-split">
            <div className="tp-cap-visual-wrap">
              <img
                src="/capabilities-group-memories.webp"
                alt="Friends traveling together"
                className="tp-cap-photo"
                loading="lazy"
              />
            </div>
            <div className="tp-cap-content-wrap">
              <div className="tp-cap-block-header">
                <div className="tp-cap-badge-circle tp-icon-purple">
                  <Users size={20} />
                </div>
                <div className="tp-cap-header-text">
                  <span className="tp-cap-tag-label">COLLABORATION & MEMORIES</span>
                  <h3 className="tp-cap-story-heading">Travel Together, Create Lasting Memories</h3>
                  <p className="tp-cap-story-desc">
                    Plan with your friends, track shared expenses, and keep your travel memories alive — all in one place.
                  </p>
                </div>
              </div>

              <div className="tp-cap-features-grid">
                <div className="tp-cap-feature-row">
                  <div className="tp-cap-icon-circle tp-icon-purple">
                    <Users size={18} />
                  </div>
                  <div>
                    <h4 className="tp-cap-feature-title">Collaborative Workspaces</h4>
                    <p className="tp-cap-feature-text">
                      Plan together with shared trips and member access.
                    </p>
                  </div>
                </div>

                <div className="tp-cap-feature-row">
                  <div className="tp-cap-icon-circle tp-icon-pink">
                    <Image size={18} />
                  </div>
                  <div>
                    <h4 className="tp-cap-feature-title">Shared Photo Memories</h4>
                    <p className="tp-cap-feature-text">
                      Keep your trip memories together in one shared space.
                    </p>
                  </div>
                </div>

                <div className="tp-cap-feature-row tp-feature-full-span">
                  <div className="tp-cap-icon-circle tp-icon-teal">
                    <CreditCard size={18} />
                  </div>
                  <div>
                    <h4 className="tp-cap-feature-title">Expense Splitting & Settlement</h4>
                    <p className="tp-cap-feature-text">
                      Track shared expenses and settle up with your group.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 🖼️ 4. PRODUCT EXPERIENCE PREVIEW (PREMIUM TRAVEL SHOWCASE) */}
      {/* ========================================================= */}
      <section className="tp-experience-section">
        <div className="tp-experience-container">
          {/* Section Header */}
          <div className="tp-experience-header">
            <div className="tp-experience-eyebrow">
              <Compass size={14} />
              <span>INTERACTIVE PREVIEW</span>
            </div>
            <h2 className="tp-experience-title">Experience TripPilot</h2>
            <p className="tp-experience-subtitle">
              See how TripPilot turns your travel plans into a smarter journey.
            </p>
          </div>

          {/* Elegant Navigation Tabs */}
          <div className="tp-exp-tabs-track" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'itinerary'}
              onClick={() => setActiveTab('itinerary')}
              className={`tp-exp-tab-item ${activeTab === 'itinerary' ? 'active' : ''}`}
            >
              <Calendar size={16} className="tp-exp-tab-icon" />
              <span>Smart Itinerary</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'weather'}
              onClick={() => setActiveTab('weather')}
              className={`tp-exp-tab-item ${activeTab === 'weather' ? 'active' : ''}`}
            >
              <CloudSun size={16} className="tp-exp-tab-icon" />
              <span>Weather Advisory</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'budget'}
              onClick={() => setActiveTab('budget')}
              className={`tp-exp-tab-item ${activeTab === 'budget' ? 'active' : ''}`}
            >
              <Wallet size={16} className="tp-exp-tab-icon" />
              <span>Budget Planning</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'expenses'}
              onClick={() => setActiveTab('expenses')}
              className={`tp-exp-tab-item ${activeTab === 'expenses' ? 'active' : ''}`}
            >
              <CreditCard size={16} className="tp-exp-tab-icon" />
              <span>Expense Splitting</span>
            </button>
          </div>

          {/* Realistic TripPilot Product Preview Application Window */}
          <div className="tp-exp-app-window">
            {/* Refined Product Preview Header */}
            <div className="tp-exp-app-bar">
              <div className="tp-exp-app-identity">
                <Compass size={15} className="tp-exp-app-icon" />
                <span className="tp-exp-brand-name">TripPilot Studio</span>
                <span className="tp-exp-title-sep">/</span>
                <span className="tp-exp-title-sub">Jaipur Cultural Odyssey · 4 Days</span>
              </div>
            </div>

            <div className="tp-experience-body">
              {/* Tab 1: Smart Itinerary */}
              {activeTab === 'itinerary' && (
                <div className="tp-exp-grid">
                  {/* Left Side: Editorial Story & Benefits */}
                  <div className="tp-exp-story">
                    <span className="tp-exp-story-eyebrow">Smart Itinerary</span>
                    <h3 className="tp-exp-story-title">
                      Personalized plans built around your trip.
                    </h3>
                    <div className="tp-exp-checklist">
                      <div className="tp-exp-check-item">
                        <CheckCircle2 size={16} className="tp-exp-check-icon" />
                        <span>Day-by-day schedule</span>
                      </div>
                      <div className="tp-exp-check-item">
                        <CheckCircle2 size={16} className="tp-exp-check-icon" />
                        <span>Activities matched to your interests</span>
                      </div>
                      <div className="tp-exp-check-item">
                        <CheckCircle2 size={16} className="tp-exp-check-icon" />
                        <span>Optimized travel route</span>
                      </div>
                    </div>
                    <div className="tp-exp-story-badge">
                      <Sparkles size={13} />
                      <span>Real-time smart rerouting active</span>
                    </div>
                  </div>

                  {/* Right Side: Travel Product Interface */}
                  <div className="tp-exp-preview-surface">
                    <div className="tp-exp-preview-header">
                      <div>
                        <div className="tp-exp-preview-meta">JAIPUR · 4 DAYS</div>
                        <h4 className="tp-exp-preview-title">DAY 2 · HERITAGE & CULTURE</h4>
                      </div>
                      <span className="tp-exp-pill-badge tp-exp-pill-orange">
                        <Clock size={12} />
                        Full Day Plan
                      </span>
                    </div>

                    <div className="tp-exp-itinerary-list">
                      <div className="tp-exp-itinerary-item">
                        <span className="tp-exp-time-badge">09:00 AM</span>
                        <div style={{ flex: 1 }}>
                          <h5 className="tp-exp-item-title">Amber Fort</h5>
                          <p className="tp-exp-item-desc">Historic fort & architecture</p>
                        </div>
                        <MapPin size={15} color="#ea580c" style={{ flexShrink: 0 }} />
                      </div>

                      <div className="tp-exp-itinerary-item">
                        <span className="tp-exp-time-badge">01:00 PM</span>
                        <div style={{ flex: 1 }}>
                          <h5 className="tp-exp-item-title">City Palace</h5>
                          <p className="tp-exp-item-desc">Royal heritage & museum</p>
                        </div>
                        <MapPin size={15} color="#0284c7" style={{ flexShrink: 0 }} />
                      </div>

                      <div className="tp-exp-itinerary-item">
                        <span className="tp-exp-time-badge">05:30 PM</span>
                        <div style={{ flex: 1 }}>
                          <h5 className="tp-exp-item-title">Hawa Mahal</h5>
                          <p className="tp-exp-item-desc">Evening heritage walk</p>
                        </div>
                        <MapPin size={15} color="#d97706" style={{ flexShrink: 0 }} />
                      </div>
                    </div>

                    <div className="tp-exp-route-tag">
                      <Sparkles size={14} />
                      <span>Optimized route · 25 min saved</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Weather Advisory */}
              {activeTab === 'weather' && (
                <div className="tp-exp-grid">
                  {/* Left Side: Editorial Story & Benefits */}
                  <div className="tp-exp-story">
                    <span className="tp-exp-story-eyebrow">Weather Advisory</span>
                    <h3 className="tp-exp-story-title">
                      Stay ahead of changing conditions.
                    </h3>
                    <div className="tp-exp-checklist">
                      <div className="tp-exp-check-item">
                        <CheckCircle2 size={16} className="tp-exp-check-icon" />
                        <span>Live forecast awareness</span>
                      </div>
                      <div className="tp-exp-check-item">
                        <CheckCircle2 size={16} className="tp-exp-check-icon" />
                        <span>Outdoor activity alerts</span>
                      </div>
                      <div className="tp-exp-check-item">
                        <CheckCircle2 size={16} className="tp-exp-check-icon" />
                        <span>Smarter itinerary decisions</span>
                      </div>
                    </div>
                    <div className="tp-exp-story-badge">
                      <CloudSun size={13} />
                      <span>Hourly micro-climate sync</span>
                    </div>
                  </div>

                  {/* Right Side: Travel Product Interface */}
                  <div className="tp-exp-preview-surface">
                    <div className="tp-exp-preview-header">
                      <div>
                        <div className="tp-exp-preview-meta">DESTINATION FORECAST</div>
                        <h4 className="tp-exp-preview-title">JAIPUR</h4>
                      </div>
                      <span className="tp-exp-pill-badge tp-exp-pill-green">
                        <CheckCircle2 size={12} />
                        Weather looks good
                      </span>
                    </div>

                    <div className="tp-exp-weather-hero">
                      <span className="tp-exp-weather-temp">24°C</span>
                      <span className="tp-exp-weather-condition">Clear skies</span>
                      <p className="tp-exp-weather-tip">
                        Good conditions for outdoor activities
                      </p>
                    </div>

                    <div className="tp-exp-weather-grid">
                      <div className="tp-exp-metric-card">
                        <span className="tp-exp-metric-label">Rain chance</span>
                        <span className="tp-exp-metric-val">Low</span>
                      </div>
                      <div className="tp-exp-metric-card">
                        <span className="tp-exp-metric-label">Wind</span>
                        <span className="tp-exp-metric-val">12 km/h</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Budget Planning */}
              {activeTab === 'budget' && (
                <div className="tp-exp-grid">
                  {/* Left Side: Editorial Story & Benefits */}
                  <div className="tp-exp-story">
                    <span className="tp-exp-story-eyebrow">Budget Planning</span>
                    <h3 className="tp-exp-story-title">
                      Plan your trip without losing control of your spending.
                    </h3>
                    <div className="tp-exp-checklist">
                      <div className="tp-exp-check-item">
                        <CheckCircle2 size={16} className="tp-exp-check-icon" />
                        <span>Transport planning</span>
                      </div>
                      <div className="tp-exp-check-item">
                        <CheckCircle2 size={16} className="tp-exp-check-icon" />
                        <span>Accommodation allocation</span>
                      </div>
                      <div className="tp-exp-check-item">
                        <CheckCircle2 size={16} className="tp-exp-check-icon" />
                        <span>Emergency buffer</span>
                      </div>
                    </div>
                    <div className="tp-exp-story-badge">
                      <Wallet size={13} />
                      <span>Automated cost estimations</span>
                    </div>
                  </div>

                  {/* Right Side: Travel Product Interface */}
                  <div className="tp-exp-preview-surface">
                    <div className="tp-exp-preview-header">
                      <div>
                        <div className="tp-exp-preview-meta">FINANCIAL SUMMARY</div>
                        <h4 className="tp-exp-preview-title">TRIP BUDGET</h4>
                      </div>
                      <span style={{ color: '#ea580c', fontSize: '1.25rem', fontWeight: '800' }}>
                        ₹45,000
                      </span>
                    </div>

                    <div className="tp-exp-budget-list">
                      <div className="tp-exp-budget-item">
                        <span className="tp-exp-budget-category">
                          <span className="tp-exp-category-dot" style={{ background: '#f97316' }} />
                          Transport
                        </span>
                        <span className="tp-exp-budget-amount">₹12,000</span>
                      </div>
                      <div className="tp-exp-budget-item">
                        <span className="tp-exp-budget-category">
                          <span className="tp-exp-category-dot" style={{ background: '#0284c7' }} />
                          Stay
                        </span>
                        <span className="tp-exp-budget-amount">₹18,000</span>
                      </div>
                      <div className="tp-exp-budget-item">
                        <span className="tp-exp-budget-category">
                          <span className="tp-exp-category-dot" style={{ background: '#10b981' }} />
                          Activities
                        </span>
                        <span className="tp-exp-budget-amount">₹15,000</span>
                      </div>
                    </div>

                    {/* Multi-segment Progress Bar */}
                    <div className="tp-exp-progress-bar">
                      <div style={{ width: '27%', background: '#f97316', height: '100%' }} />
                      <div style={{ width: '40%', background: '#0284c7', height: '100%' }} />
                      <div style={{ width: '33%', background: '#10b981', height: '100%' }} />
                    </div>

                    <div className="tp-exp-remaining-card">
                      <span className="tp-exp-remaining-label">Remaining Safe Buffer</span>
                      <span className="tp-exp-remaining-val">₹8,500</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Expense Splitting */}
              {activeTab === 'expenses' && (
                <div className="tp-exp-grid">
                  {/* Left Side: Editorial Story & Benefits */}
                  <div className="tp-exp-story">
                    <span className="tp-exp-story-eyebrow">Expense Splitting</span>
                    <h3 className="tp-exp-story-title">
                      Keep shared travel expenses simple and fair.
                    </h3>
                    <div className="tp-exp-checklist">
                      <div className="tp-exp-check-item">
                        <CheckCircle2 size={16} className="tp-exp-check-icon" />
                        <span>Split expenses automatically</span>
                      </div>
                      <div className="tp-exp-check-item">
                        <CheckCircle2 size={16} className="tp-exp-check-icon" />
                        <span>Track who paid</span>
                      </div>
                      <div className="tp-exp-check-item">
                        <CheckCircle2 size={16} className="tp-exp-check-icon" />
                        <span>See who owes whom</span>
                      </div>
                    </div>
                    <div className="tp-exp-story-badge">
                      <CreditCard size={13} />
                      <span>Instant UPI & payment settlement</span>
                    </div>
                  </div>

                  {/* Right Side: Travel Product Interface */}
                  <div className="tp-exp-preview-surface">
                    <div className="tp-exp-preview-header">
                      <div>
                        <div className="tp-exp-preview-meta">GROUP SETTLEMENT</div>
                        <h4 className="tp-exp-preview-title">GROUP EXPENSES</h4>
                      </div>
                      <span className="tp-exp-pill-badge tp-exp-pill-neutral">
                        <Users size={12} />
                        4 Travelers
                      </span>
                    </div>

                    <div className="tp-exp-expense-grid" style={{ marginBottom: '10px' }}>
                      <div className="tp-exp-expense-card">
                        <span className="tp-exp-metric-label">Total Shared</span>
                        <span style={{ color: '#0f172a', fontSize: '1.05rem', fontWeight: '800' }}>
                          ₹8,400
                        </span>
                      </div>
                      <div className="tp-exp-expense-card tp-exp-highlight-orange">
                        <span className="tp-exp-metric-label">You Paid</span>
                        <span style={{ color: '#ea580c', fontSize: '1.05rem', fontWeight: '800' }}>
                          ₹3,200
                        </span>
                      </div>
                    </div>

                    <div className="tp-exp-expense-grid">
                      <div className="tp-exp-expense-card">
                        <span className="tp-exp-metric-label">Your Share</span>
                        <span style={{ color: '#0f172a', fontSize: '1.05rem', fontWeight: '800' }}>
                          ₹2,100
                        </span>
                      </div>
                      <div className="tp-exp-expense-card tp-exp-highlight-green">
                        <span className="tp-exp-metric-label" style={{ color: '#166534' }}>
                          Balance (To Receive)
                        </span>
                        <span style={{ color: '#15803d', fontSize: '1.05rem', fontWeight: '800' }}>
                          +₹1,100
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 🧭 5. HOW TRIPPILOT AI WORKS (COMPACT VISUAL TRAVEL JOURNEY) */}
      {/* ========================================================= */}
      <section id="how-it-works" className="tp-how-works-section">
        <div className="tp-how-header">
          <div className="tp-how-tag">
            <Compass size={13} /> HOW TRIPPILOT WORKS
          </div>
          <h2 className="tp-how-title">How TripPilot Works</h2>
          <p className="tp-how-subtitle">
            From your first idea to a trip you’re ready to enjoy.
          </p>
        </div>

        <div className="tp-journey-container">
          {/* Subtle Dotted Flight Path Connector (Desktop) */}
          <div className="tp-journey-track-wrapper">
            <svg className="tp-journey-track-svg" viewBox="0 0 1000 60" preserveAspectRatio="none" fill="none">
              <path
                d="M 120 40 Q 320 8, 500 40 T 880 40"
                stroke="#f97316"
                strokeWidth="2"
                strokeDasharray="6 7"
                opacity="0.45"
              />
            </svg>
            <div className="tp-journey-plane-badge" title="Journey in flight">
              <Plane size={15} />
            </div>
            <div className="tp-journey-pin-badge" title="Destination arrived">
              <MapPin size={15} />
            </div>
          </div>

          <div className="tp-journey-grid">
            {/* Step 01: PLAN */}
            <div className="tp-journey-step tp-journey-step-plan">
              <div className="tp-journey-step-top">
                <span className="tp-journey-step-number">01</span>
                <span className="tp-journey-step-phase">PLAN</span>
              </div>
              <h3 className="tp-journey-step-heading">Tell Us What You Want</h3>
              <p className="tp-journey-step-desc">
                Choose your destination, dates, interests, and travel style.
              </p>

              {/* Micro-UI: Compact Travel-Planning Input / Checklist */}
              <div className="tp-micro-ui tp-micro-input-stack">
                <div className="tp-micro-itinerary-header">
                  <Compass size={13} className="tp-micro-sparkle-icon" />
                  <span>Trip Preferences</span>
                </div>

                <div className="tp-micro-input-item">
                  <div className="tp-micro-icon-badge tp-badge-orange">
                    <MapPin size={14} />
                  </div>
                  <div className="tp-micro-input-text">
                    <span className="tp-micro-input-label">Destination</span>
                    <span className="tp-micro-input-value">Goa, Coastal India</span>
                  </div>
                </div>

                <div className="tp-micro-input-item">
                  <div className="tp-micro-icon-badge tp-badge-orange">
                    <Calendar size={14} />
                  </div>
                  <div className="tp-micro-input-text">
                    <span className="tp-micro-input-label">Dates</span>
                    <span className="tp-micro-input-value">Nov 14 – Nov 19 · 5 Days</span>
                  </div>
                </div>

                <div className="tp-micro-input-item">
                  <div className="tp-micro-icon-badge tp-badge-orange">
                    <Heart size={14} />
                  </div>
                  <div className="tp-micro-input-text">
                    <span className="tp-micro-input-label">Interests</span>
                    <span className="tp-micro-input-value">Heritage, Beaches & Cafes</span>
                  </div>
                </div>

                <div className="tp-micro-input-item">
                  <div className="tp-micro-icon-badge tp-badge-orange">
                    <Users size={14} />
                  </div>
                  <div className="tp-micro-input-text">
                    <span className="tp-micro-input-label">Travel Style</span>
                    <span className="tp-micro-input-value">Couple / Friends · Relaxed</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 02: CREATE */}
            <div className="tp-journey-step tp-journey-step-create">
              <div className="tp-journey-step-top">
                <span className="tp-journey-step-number">02</span>
                <span className="tp-journey-step-phase">CREATE</span>
              </div>
              <h3 className="tp-journey-step-heading">Craft Your Journey</h3>
              <p className="tp-journey-step-desc">
                TripPilot turns your preferences into a personalized itinerary, budget, and travel plan.
              </p>

              {/* Micro-UI: Compact Itinerary & Planning Card */}
              <div className="tp-micro-ui tp-micro-itinerary-card">
                <div className="tp-micro-itinerary-header">
                  <Sparkles size={13} className="tp-micro-sparkle-icon" />
                  <span>Personalized Itinerary</span>
                </div>

                <div className="tp-micro-day-row">
                  <span className="tp-micro-day-tag">Day 1</span>
                  <div className="tp-micro-day-content">
                    <span className="tp-micro-act-name">Fort Aguada & Sunset Cruise</span>
                    <span className="tp-micro-act-meta">Morning · Sightseeing</span>
                  </div>
                </div>

                <div className="tp-micro-day-row">
                  <span className="tp-micro-day-tag">Day 2</span>
                  <div className="tp-micro-day-content">
                    <span className="tp-micro-act-name">Old Goa Cathedrals & Cafes</span>
                    <span className="tp-micro-act-meta">Full Day · Heritage & Food</span>
                  </div>
                </div>

                <div className="tp-micro-plan-pills">
                  <div className="tp-micro-pill tp-pill-budget">
                    <Wallet size={12} />
                    <span>Smart Budget Planning</span>
                  </div>
                  <div className="tp-micro-pill tp-pill-weather">
                    <CloudSun size={12} />
                    <span>Weather-aware Planning</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 03: TRAVEL */}
            <div className="tp-journey-step tp-journey-step-travel">
              <div className="tp-journey-step-top">
                <span className="tp-journey-step-number">03</span>
                <span className="tp-journey-step-phase">TRAVEL</span>
              </div>
              <h3 className="tp-journey-step-heading">Travel Together, Smarter</h3>
              <p className="tp-journey-step-desc">
                Manage your trip, share expenses, adapt plans, and keep your memories together.
              </p>

              {/* Workspace Card UI: Collaborative Trip Workspace */}
              <div className="tp-micro-ui tp-micro-workspace-card">
                {/* Top Row: Group icon + Your Trip Group & Green In Sync pill */}
                <div className="tp-ws-top-row">
                  <div className="tp-ws-group-title">
                    <Users size={14} className="tp-ws-group-icon" />
                    <span>Your Trip Group</span>
                  </div>
                  <span className="tp-ws-status-pill">
                    <span className="tp-ws-status-dot">●</span> In Sync
                  </span>
                </div>

                {/* Below Top: 4 Member avatars with initials L, P, R, S & 4 members count */}
                <div className="tp-ws-members-row">
                  <div className="tp-ws-avatar-cluster">
                    <span className="tp-ws-avatar avatar-l" title="Traveler L">L</span>
                    <span className="tp-ws-avatar avatar-p" title="Traveler P">P</span>
                    <span className="tp-ws-avatar avatar-r" title="Traveler R">R</span>
                    <span className="tp-ws-avatar avatar-s" title="Traveler S">S</span>
                  </div>
                  <span className="tp-ws-members-count">4 members</span>
                </div>

                {/* 2x2 Grid of Feature Tiles */}
                <div className="tp-ws-tiles-grid">
                  {/* Tile 1: Shared Expenses */}
                  <div className="tp-ws-tile">
                    <div className="tp-ws-tile-icon-wrap icon-wallet">
                      <Wallet size={13} />
                    </div>
                    <div className="tp-ws-tile-content">
                      <span className="tp-ws-tile-title">Shared Expenses</span>
                      <span className="tp-ws-tile-sub">Split & settle easily</span>
                    </div>
                  </div>

                  {/* Tile 2: Trip Itinerary */}
                  <div className="tp-ws-tile">
                    <div className="tp-ws-tile-icon-wrap icon-map">
                      <Map size={13} />
                    </div>
                    <div className="tp-ws-tile-content">
                      <span className="tp-ws-tile-title">Trip Itinerary</span>
                      <span className="tp-ws-tile-sub">View & update plans</span>
                    </div>
                  </div>

                  {/* Tile 3: Trip Memories */}
                  <div className="tp-ws-tile">
                    <div className="tp-ws-tile-icon-wrap icon-camera">
                      <Camera size={13} />
                    </div>
                    <div className="tp-ws-tile-content">
                      <span className="tp-ws-tile-title">Trip Memories</span>
                      <span className="tp-ws-tile-sub">Photos & moments</span>
                    </div>
                  </div>

                  {/* Tile 4: Trip Updates */}
                  <div className="tp-ws-tile">
                    <div className="tp-ws-tile-icon-wrap icon-bell">
                      <Bell size={13} />
                    </div>
                    <div className="tp-ws-tile-content">
                      <span className="tp-ws-tile-title">Trip Updates</span>
                      <span className="tp-ws-tile-sub">Stay in sync</span>
                    </div>
                  </div>
                </div>

                {/* Bottom: Slim highlighted notification bar */}
                <div className="tp-ws-notify-bar">
                  <Activity size={13} className="tp-ws-notify-icon" />
                  <div className="tp-ws-notify-text">
                    <span className="tp-ws-notify-title">Live Trip Updates</span>
                    <span className="tp-ws-notify-divider">·</span>
                    <span className="tp-ws-notify-sub">Everyone's on the same page</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Journey CTA Button */}
          <div className="tp-journey-cta-wrapper">
            <Link
              to={user ? '/dashboard/create' : '/register'}
              className="tp-journey-cta-btn"
            >
              Start Your Trip with TripPilot <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 🌏 6. POPULAR TRAVEL DESTINATIONS (LIGHT EDITORIAL SHOWCASE) */}
      {/* ========================================================= */}
      <section id="explore" className="tp-dest-section">
        <div className="tp-dest-header">
          <div className="tp-dest-tag">
            <MapPin size={13} /> EXPLORE TOP DESTINATIONS
          </div>
          <h2 className="tp-dest-heading">Popular Travel Destinations</h2>
          <p className="tp-dest-subtitle">
            Explore destinations worth discovering, then let TripPilot build the journey around your dates, interests, and travel style.
          </p>
        </div>

        <div className="tp-dest-grid">
          {/* 1. Goa, India */}
          <div className="tp-dest-card">
            <div className="tp-dest-card-img-wrap">
              <img
                src="https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80"
                alt="Goa, India"
                className="tp-dest-card-img"
              />
              <span className="tp-dest-category-badge">
                Beaches
              </span>
            </div>
            <div className="tp-dest-card-body">
              <span className="tp-dest-location">Goa, India</span>
              <h3 className="tp-dest-title">Sun, Sand & Heritage</h3>
              <p className="tp-dest-desc">
                Golden beaches, Portuguese architecture, vibrant night markets, and coastal cruises.
              </p>
              <div className="tp-dest-bestfor-wrap">
                <span className="tp-dest-bestfor-label">Best for:</span>
                <div className="tp-dest-tags">
                  <span className="tp-dest-tag-pill">Beaches</span>
                  <span className="tp-dest-tag-pill">Culture</span>
                  <span className="tp-dest-tag-pill">Relaxation</span>
                </div>
              </div>
              <Link to={user ? '/dashboard/create' : '/register'} className="tp-dest-link">
                Plan a trip <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* 2. Manali, Himachal Pradesh */}
          <div className="tp-dest-card">
            <div className="tp-dest-card-img-wrap">
              <img
                src="https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=800&q=80"
                alt="Manali, Himachal Pradesh"
                className="tp-dest-card-img"
              />
              <span className="tp-dest-category-badge">
                Mountains
              </span>
            </div>
            <div className="tp-dest-card-body">
              <span className="tp-dest-location">Himachal Pradesh, India</span>
              <h3 className="tp-dest-title">Manali Mountain Escape</h3>
              <p className="tp-dest-desc">
                Snow-capped Himalayan peaks, pine valleys, adventure sports, and peaceful hill towns.
              </p>
              <div className="tp-dest-bestfor-wrap">
                <span className="tp-dest-bestfor-label">Best for:</span>
                <div className="tp-dest-tags">
                  <span className="tp-dest-tag-pill">Mountains</span>
                  <span className="tp-dest-tag-pill">Adventure</span>
                  <span className="tp-dest-tag-pill">Nature</span>
                </div>
              </div>
              <Link to={user ? '/dashboard/create' : '/register'} className="tp-dest-link">
                Plan a trip <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* 3. Jaipur, Rajasthan */}
          <div className="tp-dest-card">
            <div className="tp-dest-card-img-wrap">
              <img
                src="https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=800&q=80"
                alt="Jaipur, Rajasthan"
                className="tp-dest-card-img"
              />
              <span className="tp-dest-category-badge">
                Heritage
              </span>
            </div>
            <div className="tp-dest-card-body">
              <span className="tp-dest-location">Rajasthan, India</span>
              <h3 className="tp-dest-title">Jaipur Royal Heritage</h3>
              <p className="tp-dest-desc">
                Historic Amber Fort, Hawa Mahal, royal palaces, and vibrant bazaars.
              </p>
              <div className="tp-dest-bestfor-wrap">
                <span className="tp-dest-bestfor-label">Best for:</span>
                <div className="tp-dest-tags">
                  <span className="tp-dest-tag-pill">Heritage</span>
                  <span className="tp-dest-tag-pill">Culture</span>
                  <span className="tp-dest-tag-pill">Architecture</span>
                </div>
              </div>
              <Link to={user ? '/dashboard/create' : '/register'} className="tp-dest-link">
                Plan a trip <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 🚀 7. FINAL SCENIC TRAVEL CTA BANNER (FULL WIDTH) */}
      {/* ========================================================= */}
      <section className="tp-scenic-cta-section">
        <div className="tp-scenic-cta-container">
          <div className="tp-scenic-cta-content">
            <h2 className="tp-scenic-cta-heading">
              Ready for Your Next Adventure?
            </h2>
            <p className="tp-scenic-cta-subtitle">
              Let TripPilot turn your travel dreams into reality.
            </p>

            <Link
              to={user ? '/dashboard/create' : '/register'}
              className="tp-scenic-cta-btn"
            >
              Start Your Journey <ArrowRight size={17} />
            </Link>
          </div>

          {/* Hand-lettered script quote in corner with orange curved swoosh */}
          <div className="tp-scenic-cta-script-wrap">
            <div className="tp-scenic-cta-script">
              <span>Collect</span>
              <span>Moments</span>
              <span>Not Things</span>
            </div>
            <svg
              className="tp-scenic-cta-swoosh"
              viewBox="0 0 140 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4 16C45 4 95 3 136 10"
                stroke="#ea580c"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </section>

      {/* Footer Component */}
      <Footer />
    </div>
  );
}
