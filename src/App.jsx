import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Navigate, Routes, Route, useLocation } from 'react-router-dom';
import { BookOpen, TerminalSquare } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import './App.css';

import Navbar from './components/Navbar';
import InteractiveBackground from './components/InteractiveBackground';
import { ActivityToastProvider } from './context/ActivityToastContext';
import { AuthProvider } from './context/AuthContext';
import { MobileActionLayerProvider } from './context/MobileActionLayerContext';
import { getStorageItem, setStorageItem } from './lib/browserStorage';
import { applySeoMetadata, getSeoMetadata } from './lib/seo';

const HomeV2 = lazy(() => import('./pages/HomeV2'));
const SfDiscoveries = lazy(() => import('./pages/SfDiscoveries'));
const SfDiscoveryDetail = lazy(() => import('./pages/SfDiscoveryDetail'));
const ExplorationLog = lazy(() => import('./pages/ExplorationLog'));
const MediaArchive = lazy(() => import('./pages/MediaArchive'));
const WorksArchive = lazy(() => import('./pages/WorksArchive'));
const Questions = lazy(() => import('./pages/Questions'));
const LogEntry = lazy(() => import('./pages/LogEntry'));
const LogResult = lazy(() => import('./pages/LogResult'));
const Profile = lazy(() => import('./pages/Profile'));
const CrewMessage = lazy(() => import('./pages/CrewMessage'));
const Login = lazy(() => import('./pages/Login'));

const Network = lazy(() => import('./pages/Network'));
const NetworkDetail = lazy(() => import('./pages/NetworkDetail'));
const AdminAccessBoundary = lazy(() => import('./components/admin/AdminAccessBoundary'));
const Admin = lazy(() => import('./pages/Admin'));
const AdminDiscoveries = lazy(() => import('./pages/AdminDiscoveries'));
const AdminVisualPreview = import.meta.env.DEV ? lazy(() => import('./pages/AdminVisualPreview')) : null;
const EditorialDraftPreview = import.meta.env.DEV ? lazy(() => import('./pages/EditorialDraftPreview')) : null;

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
  const shouldEnableAnalytics = import.meta.env.PROD
    && !['localhost', '127.0.0.1'].includes(window.location.hostname);
  const [siteMode, setSiteMode] = useState(() => getStorageItem('sf-site-mode', 'console'));
  const [mobileActionLayer, setMobileActionLayer] = useState(null);
  const seoMetadata = useMemo(() => getSeoMetadata(location.pathname), [location.pathname]);
  const isAdminSurface = location.pathname.startsWith('/admin');
  const isHomeV2Surface = location.pathname === '/' || location.pathname === '/home-v2';
  const isDeviceSurface = false;
  const isDesktopSurface = location.pathname === '/'
    || location.pathname.startsWith('/discover')
    || location.pathname.startsWith('/works')
    || location.pathname.startsWith('/media')
    || location.pathname === '/exploration-log'
    || location.pathname === '/log'
    || location.pathname.startsWith('/result/')
    || location.pathname.startsWith('/questions')
    || location.pathname.startsWith('/network')
    || location.pathname.startsWith('/profile')
    || location.pathname === '/login'
    || location.pathname.startsWith('/badges');
  const isReadingMode = siteMode === 'reading';
  const supportsSiteMode = location.pathname.startsWith('/works')
    || location.pathname.startsWith('/media')
    || location.pathname === '/exploration-log'
    || location.pathname.startsWith('/questions');
  const isLowPowerSurface = location.pathname.startsWith('/profile')
    || location.pathname.startsWith('/badges')
    || location.pathname.startsWith('/admin');

  useEffect(() => {
    applySeoMetadata(seoMetadata);
  }, [seoMetadata]);

  useEffect(() => {
    setStorageItem('sf-site-mode', siteMode);
    document.body.classList.toggle('reading-mode-active', siteMode === 'reading');
    return () => {
      document.body.classList.remove('reading-mode-active');
    };
  }, [siteMode]);


  return (
    <AuthProvider>
      <ActivityToastProvider>
        <MobileActionLayerProvider value={mobileActionLayer}>
          <div className={`${isAdminSurface ? 'mobile-container desktop-admin' : isDesktopSurface ? 'mobile-container desktop-home' : isDeviceSurface ? 'mobile-container device-surface' : 'mobile-container'} ${isAdminSurface ? 'admin-mode' : isReadingMode ? 'reading-mode' : 'console-mode'} ${isLowPowerSurface ? 'low-power-surface' : ''}`}>
          <div className="app-wrapper">
            {!isAdminSurface && <InteractiveBackground lowPower={isLowPowerSurface} />}
            {supportsSiteMode && (
              <button
                className="site-mode-toggle"
                onClick={() => setSiteMode(isReadingMode ? 'console' : 'reading')}
                type="button"
              >
                {isReadingMode ? <TerminalSquare aria-hidden="true" /> : <BookOpen aria-hidden="true" />}
                <span>{isReadingMode ? '콘솔 모드' : '읽기 모드'}</span>
              </button>
            )}
            <div className={`page-container${isHomeV2Surface ? ' home-v2-page-container' : ''}`}>
              <Suspense fallback={<RouteLoader />}>
                <Routes location={location}>
                  <Route path="/" element={<HomeV2 />} />
                  <Route path="/home-v2" element={<HomeV2 />} />
                  <Route path="/discover" element={<SfDiscoveries />} />
                  <Route path="/discover/:slug" element={<SfDiscoveryDetail />} />
                  <Route path="/works/:categorySlug" element={<WorksArchive />} />
                  <Route path="/media/:categorySlug" element={<MediaArchive />} />
                  <Route path="/exploration-log" element={<ExplorationLog />} />
                  <Route path="/questions" element={<Questions />} />
                  <Route path="/questions/:questionId" element={<Questions />} />
                  <Route path="/log" element={<LogEntry />} />
                  <Route path="/result/:id" element={<LogResult />} />
                  <Route path="/network" element={<Network />} />
                  <Route path="/network/:id" element={<NetworkDetail />} />
                  <Route path="/badges" element={<Navigate to="/profile?tab=progress" replace />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/crew/:crewCode/message" element={<CrewMessage />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/admin" element={<AdminAccessBoundary><Admin /></AdminAccessBoundary>} />
                  <Route path="/admin/discoveries" element={<AdminAccessBoundary><AdminDiscoveries /></AdminAccessBoundary>} />
                  {AdminVisualPreview && <Route path="/admin/__visual-preview" element={<AdminVisualPreview />} />}
                  {EditorialDraftPreview && <Route path="/__editorial-preview" element={<EditorialDraftPreview />} />}
                </Routes>
              </Suspense>
            </div>
            <div id="mobile-action-layer" ref={setMobileActionLayer} />
            {!isAdminSurface && <Navbar />}
          </div>
          </div>
        </MobileActionLayerProvider>
        {shouldEnableAnalytics && <Analytics />}
      </ActivityToastProvider>
    </AuthProvider>
  );
}

export default App;
