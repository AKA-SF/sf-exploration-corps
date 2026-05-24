import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import './App.css';

// Components & Pages
import Home from './pages/Home';
import ExplorationLog from './pages/ExplorationLog';
import Questions from './pages/Questions';
import LogEntry from './pages/LogEntry';
import LogResult from './pages/LogResult';
import Profile from './pages/Profile';
import Network from './pages/Network';
import NetworkDetail from './pages/NetworkDetail';
import Navbar from './components/Navbar';
import InteractiveBackground from './components/InteractiveBackground';

function App() {
  const location = useLocation();
  const isDesktopSurface = location.pathname === '/'
    || location.pathname === '/exploration-log'
    || location.pathname === '/questions';

  return (
    <div className={isDesktopSurface ? 'mobile-container desktop-home' : 'mobile-container'}>
      <div className="app-wrapper">
        <InteractiveBackground />
        <div className="page-container">
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<Home />} />
              <Route path="/exploration-log" element={<ExplorationLog />} />
              <Route path="/questions" element={<Questions />} />
              <Route path="/log" element={<LogEntry />} />
              <Route path="/result/:id" element={<LogResult />} />
              <Route path="/network" element={<Network />} />
              <Route path="/network/:id" element={<NetworkDetail />} />
              <Route path="/profile" element={<Profile />} />
            </Routes>
          </AnimatePresence>
        </div>
        <Navbar />
      </div>
    </div>
  );
}

export default App;
