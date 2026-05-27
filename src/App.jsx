import { useEffect, useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { BookOpen, TerminalSquare } from 'lucide-react';
import './App.css';

// Components & Pages
import Home from './pages/Home';
import ExplorationLog from './pages/ExplorationLog';
import MediaArchive from './pages/MediaArchive';
import Questions from './pages/Questions';
import LogEntry from './pages/LogEntry';
import LogResult from './pages/LogResult';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Network from './pages/Network';
import NetworkDetail from './pages/NetworkDetail';
import Navbar from './components/Navbar';
import InteractiveBackground from './components/InteractiveBackground';
import { AuthProvider } from './context/AuthContext';

function App() {
  const location = useLocation();
  const [siteMode, setSiteMode] = useState(() => localStorage.getItem('sf-site-mode') || 'console');
  const isDesktopSurface = location.pathname === '/'
    || location.pathname.startsWith('/media')
    || location.pathname === '/exploration-log'
    || location.pathname.startsWith('/questions');
  const isReadingMode = siteMode === 'reading';

  useEffect(() => {
    localStorage.setItem('sf-site-mode', siteMode);
  }, [siteMode]);

  return (
    <AuthProvider>
      <div className={`${isDesktopSurface ? 'mobile-container desktop-home' : 'mobile-container'} ${isReadingMode ? 'reading-mode' : 'console-mode'}`}>
      <div className="app-wrapper">
        <InteractiveBackground />
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
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<Home />} />
              <Route path="/media/:categorySlug" element={<MediaArchive />} />
              <Route path="/exploration-log" element={<ExplorationLog />} />
              <Route path="/questions" element={<Questions />} />
              <Route path="/questions/:questionId" element={<Questions />} />
              <Route path="/log" element={<LogEntry />} />
              <Route path="/result/:id" element={<LogResult />} />
              <Route path="/network" element={<Network />} />
              <Route path="/network/:id" element={<NetworkDetail />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/login" element={<Login />} />
            </Routes>
          </AnimatePresence>
        </div>
        <Navbar />
      </div>
      </div>
    </AuthProvider>
  );
}

export default App;
