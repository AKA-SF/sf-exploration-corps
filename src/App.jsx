import { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { BookOpen, TerminalSquare } from 'lucide-react';
import './App.css';

import Navbar from './components/Navbar';
import InteractiveBackground from './components/InteractiveBackground';
import { AuthProvider } from './context/AuthContext';

const Home = lazy(() => import('./pages/Home'));
const ExplorationLog = lazy(() => import('./pages/ExplorationLog'));
const MediaArchive = lazy(() => import('./pages/MediaArchive'));
const WorksArchive = lazy(() => import('./pages/WorksArchive'));
const Questions = lazy(() => import('./pages/Questions'));
const LogEntry = lazy(() => import('./pages/LogEntry'));
const LogResult = lazy(() => import('./pages/LogResult'));
const Profile = lazy(() => import('./pages/Profile'));
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

function App() {
  const location = useLocation();
  const [siteMode, setSiteMode] = useState(() => localStorage.getItem('sf-site-mode') || 'console');
  const isDesktopSurface = location.pathname === '/'
    || location.pathname.startsWith('/works')
    || location.pathname.startsWith('/media')
    || location.pathname === '/exploration-log'
    || location.pathname.startsWith('/questions');
  const isReadingMode = siteMode === 'reading';
  const isLowPowerSurface = location.pathname.startsWith('/profile')
    || location.pathname.startsWith('/badges')
    || location.pathname.startsWith('/admin');

  useEffect(() => {
    localStorage.setItem('sf-site-mode', siteMode);
    document.body.classList.toggle('reading-mode-active', siteMode === 'reading');
    return () => {
      document.body.classList.remove('reading-mode-active');
    };
  }, [siteMode]);

  return (
    <AuthProvider>
      <div className={`${isDesktopSurface ? 'mobile-container desktop-home' : 'mobile-container'} ${isReadingMode ? 'reading-mode' : 'console-mode'} ${isLowPowerSurface ? 'low-power-surface' : ''}`}>
      <div className="app-wrapper">
        <InteractiveBackground lowPower={isLowPowerSurface} />
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
              <Route path="/login" element={<Login />} />
              <Route path="/admin" element={<Admin />} />
            </Routes>
          </Suspense>
        </div>
        <Navbar />
      </div>
      </div>
    </AuthProvider>
  );
}

export default App;
