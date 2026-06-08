import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { BookOpen, Monitor, Smartphone, TerminalSquare } from 'lucide-react';
import './App.css';

import Navbar from './components/Navbar';
import InteractiveBackground from './components/InteractiveBackground';
import { ActivityToastProvider } from './context/ActivityToastContext';
import { AuthProvider } from './context/AuthContext';
import { getStorageItem, removeStorageItem, setStorageItem } from './lib/browserStorage';

const Home = lazy(() => import('./pages/Home'));
const ExplorationLog = lazy(() => import('./pages/ExplorationLog'));
const MediaArchive = lazy(() => import('./pages/MediaArchive'));
const WorksArchive = lazy(() => import('./pages/WorksArchive'));
const Questions = lazy(() => import('./pages/Questions'));
const LogEntry = lazy(() => import('./pages/LogEntry'));
const LogResult = lazy(() => import('./pages/LogResult'));
const Profile = lazy(() => import('./pages/Profile'));
const CrewMessage = lazy(() => import('./pages/CrewMessage'));
const Login = lazy(() => import('./pages/Login'));
const Badges = lazy(() => import('./pages/Badges'));
const Network = lazy(() => import('./pages/Network'));
const NetworkDetail = lazy(() => import('./pages/NetworkDetail'));
const Admin = lazy(() => import('./pages/Admin'));

function RouteLoader() {
  return (
    <div className="route-loader" role="status" aria-live="polite">
      <span className="mono">ARCHIVE SIGNAL LOADING</span>
      <i aria-hidden="true" />
    </div>
  );
}

const VIEW_MODE_STORAGE_KEY = 'sf-view-mode';
const MOBILE_VIEW_QUERY = '(max-width: 760px)';

function isMobileViewport() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(MOBILE_VIEW_QUERY).matches;
}

function getInitialViewMode() {
  if (isMobileViewport()) {
    removeStorageItem(VIEW_MODE_STORAGE_KEY);
    return 'mobile';
  }
  return getStorageItem(VIEW_MODE_STORAGE_KEY, 'mobile');
}

function App() {
  const location = useLocation();
  const [siteMode, setSiteMode] = useState(() => getStorageItem('sf-site-mode', 'console'));
  const [viewMode, setViewMode] = useState(getInitialViewMode);
  const isAdminSurface = location.pathname.startsWith('/admin');
  const isDeviceSurface = location.pathname.startsWith('/profile')
    || location.pathname.startsWith('/badges')
    || location.pathname.startsWith('/network');
  const isDesktopSurface = location.pathname === '/'
    || location.pathname.startsWith('/works')
    || location.pathname.startsWith('/media')
    || location.pathname === '/exploration-log'
    || location.pathname.startsWith('/questions');
  const isReadingMode = siteMode === 'reading';
  const isDesktopRequested = viewMode === 'desktop';
  const isMobileCompactSurface = !isDeviceSurface && !isDesktopRequested;
  const isLowPowerSurface = location.pathname.startsWith('/profile')
    || location.pathname.startsWith('/badges')
    || location.pathname.startsWith('/admin')
    || isMobileCompactSurface;

  const handleMapNavigate = useCallback(() => {
    if (!isMobileViewport()) return;
    removeStorageItem(VIEW_MODE_STORAGE_KEY);
    setViewMode('mobile');
  }, []);

  useEffect(() => {
    setStorageItem('sf-site-mode', siteMode);
    document.body.classList.toggle('reading-mode-active', siteMode === 'reading');
    return () => {
      document.body.classList.remove('reading-mode-active');
    };
  }, [siteMode]);

  useEffect(() => {
    if (isMobileViewport()) {
      removeStorageItem(VIEW_MODE_STORAGE_KEY);
    } else {
      setStorageItem(VIEW_MODE_STORAGE_KEY, viewMode);
    }
    document.body.classList.toggle('device-surface-active', isDeviceSurface);
    document.body.classList.toggle('desktop-view-requested', !isDeviceSurface && isDesktopRequested);
    document.body.classList.toggle('mobile-compact-active', !isDeviceSurface && !isDesktopRequested);
    return () => {
      document.body.classList.remove('device-surface-active');
      document.body.classList.remove('desktop-view-requested');
      document.body.classList.remove('mobile-compact-active');
    };
  }, [isDesktopRequested, isDeviceSurface, viewMode]);

  return (
    <AuthProvider>
      <ActivityToastProvider>
        <div className={`${isAdminSurface ? 'mobile-container desktop-admin' : isDesktopSurface ? 'mobile-container desktop-home' : isDeviceSurface ? 'mobile-container device-surface' : 'mobile-container'} ${isAdminSurface ? 'admin-mode' : isReadingMode ? 'reading-mode' : 'console-mode'} ${isLowPowerSurface ? 'low-power-surface' : ''}`}>
          <div className="app-wrapper">
            {!isAdminSurface && <InteractiveBackground lowPower={isLowPowerSurface} />}
            {isDesktopSurface && (
              <button
                className="site-mode-toggle"
                onClick={() => setSiteMode(isReadingMode ? 'console' : 'reading')}
                type="button"
              >
                {isReadingMode ? <TerminalSquare aria-hidden="true" /> : <BookOpen aria-hidden="true" />}
                <span>{isReadingMode ? 'Console Mode' : 'Reading Mode'}</span>
              </button>
            )}
            {!isAdminSurface && !isDeviceSurface && (
              <button
                className="viewport-mode-toggle"
                onClick={() => setViewMode(isDesktopRequested ? 'mobile' : 'desktop')}
                type="button"
              >
                {isDesktopRequested ? <Smartphone aria-hidden="true" /> : <Monitor aria-hidden="true" />}
                <span>{isDesktopRequested ? '모바일 버전으로 전환' : 'PC 버전으로 전환'}</span>
              </button>
            )}
            <div className="page-container">
              <Suspense fallback={<RouteLoader />}>
                <Routes location={location}>
                  <Route path="/" element={<Home />} />
                  <Route path="/works/:categorySlug" element={<WorksArchive />} />
                  <Route path="/media/:categorySlug" element={<MediaArchive />} />
                  <Route path="/exploration-log" element={<ExplorationLog />} />
                  <Route path="/questions" element={<Questions />} />
                  <Route path="/questions/:questionId" element={<Questions />} />
                  <Route path="/log" element={<LogEntry />} />
                  <Route path="/result/:id" element={<LogResult />} />
                  <Route path="/network" element={<Network />} />
                  <Route path="/network/:id" element={<NetworkDetail />} />
                  <Route path="/badges" element={<Badges />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/crew/:crewCode/message" element={<CrewMessage />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/admin" element={<Admin />} />
                </Routes>
              </Suspense>
            </div>
            {!isAdminSurface && <Navbar onMapNavigate={handleMapNavigate} />}
          </div>
        </div>
      </ActivityToastProvider>
    </AuthProvider>
  );
}

export default App;
