import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Database, Activity, Share2, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLogs } from '../context/LogContext';
import PageTransition from '../components/PageTransition';
import './LogResult.css';
import '../styles/MobileExperience.css';

const LogResult = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { addLog } = useLogs();
  
  const logData = useMemo(() => location.state || {
    id: id || 'LOG-UNKNOWN',
    title: 'UNKNOWN_ARTIFACT',
    type: 'UNKNOWN',
    experiences: { immersion: 0, addiction: 0, complexity: 0, visual: 0, derealization: 0, scale: 0 },
    emotions: ['NONE'],
    ideas: ['NONE']
  }, [id, location.state]);

  const [analyzing, setAnalyzing] = useState(true);
  const [scrambleText, setScrambleText] = useState("D3C0D1NG...");

  useEffect(() => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*";
    let interval = setInterval(() => {
      setScrambleText(Array.from({length: 10}).map(() => chars[Math.floor(Math.random() * chars.length)]).join(''));
    }, 50);

    const timer = setTimeout(() => {
      clearInterval(interval);
      setScrambleText("ANALYSIS_COMPLETE");
      setAnalyzing(false);
      
      if (location.state && location.state.title !== 'UNKNOWN_ARTIFACT') {
        addLog(logData);
      }
    }, 2500);
    
    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [addLog, location.state, logData]);

  const aggRisk = (logData.experiences.derealization + logData.experiences.complexity) / 2 || 1;
  const strokeDash = `${aggRisk} ${100 - aggRisk}`;
  
  const riskLevel = aggRisk > 80 ? "CLASS-4 HAZARD" : aggRisk > 50 ? "CLASS-2 WARNING" : "SAFE";
  const coordX = (logData.experiences.scale * 1.42).toFixed(2);
  const coordY = (aggRisk * 0.88).toFixed(2);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.2 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 120 } }
  };

  return (
    <PageTransition className="result-container">
      {analyzing ? (
        <div className="analyzing-overlay">
          <div className="spinner"></div>
          <span className="mono text-cyan glitch-hover">{scrambleText}</span>
          <div className="progress-bar-container">
             <div className="progress-bar"></div>
          </div>
        </div>
      ) : (
        <motion.div 
          className="report-content"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          <motion.header variants={itemVariants} className="report-header panel panel-accent">
            <div className="header-left">
              <span className="mono text-muted text-xs">REPORT_ID</span>
              <h2 className="mono text-cyan">{logData.id}</h2>
            </div>
            <Database className="text-cyan" />
          </motion.header>

          {aggRisk > 70 && (
            <motion.div variants={itemVariants} className="alert-panel panel panel-accent glitch-hover">
              <AlertTriangle className="text-amber alert-icon pulse" />
              <div className="alert-text">
                <span className="mono text-amber bold">WARNING: HIGH_DEREALIZATION_RISK</span>
                <span className="mono text-xs text-muted">현실감 상실 위험이 높습니다. 주의하십시오.</span>
              </div>
            </motion.div>
          )}

          <motion.div variants={itemVariants} className="data-visualization panel panel-accent">
            <h3 className="mono text-xs text-muted section-title">탐사 결과 <span className="text-cyan">/ DATA_ANALYSIS</span></h3>
            
            <div className="viz-content">
              <div className="pie-chart-container">
                <svg viewBox="0 0 32 32" className="pie-chart">
                  <circle r="16" cx="16" cy="16" className="pie-bg" />
                  <motion.circle 
                    r="16" cx="16" cy="16" 
                    className="pie-segment" 
                    initial={{ strokeDasharray: "0 100" }}
                    animate={{ strokeDasharray: strokeDash }}
                    transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
                    style={{ stroke: 'var(--accent-amber)' }}
                  />
                  <circle r="10" cx="16" cy="16" className="pie-inner" />
                </svg>
                <div className="pie-label mono">
                  <span className="text-amber">{Math.round(aggRisk)}%</span>
                  <span className="text-xs text-muted" style={{ display: 'block', fontSize: '6px' }}>RISK</span>
                </div>
              </div>

              <div className="viz-stats mono">
                <div className="stat-row">
                  <span className="text-muted text-xs">TARGET:</span>
                  <span className="text-main">{logData.title}</span>
                </div>
                <div className="stat-row">
                  <span className="text-muted text-xs">SECTOR:</span>
                  <span className="text-cyan">{logData.type}</span>
                </div>
                <div className="stat-row">
                  <span className="text-muted text-xs">EMOTIONS:</span>
                  <span className="text-blue text-xs">{logData.emotions.join(', ') || 'NONE'}</span>
                </div>
                <div className="stat-row">
                  <span className="text-muted text-xs">IDEAS:</span>
                  <span className="text-amber text-xs">{logData.ideas.join(', ') || 'NONE'}</span>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="analysis-metrics panel">
            <h3 className="mono text-xs text-muted section-title"><MapPin size={12}/> 세계관 벡터 <span className="text-cyan">/ WORLDVIEW_VECTOR</span></h3>
            <div className="metrics-grid mono">
              <div className="metric">
                <span className="text-xs text-muted">RISK_CLASS</span>
                <span className={aggRisk > 70 ? "text-amber" : "text-cyan"}>{riskLevel}</span>
              </div>
              <div className="metric">
                <span className="text-xs text-muted">GALACTIC_COORD</span>
                <span className="text-main">[{coordX}, {coordY}]</span>
              </div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="signal-graph panel">
            <h3 className="mono text-xs text-muted section-title"><Activity size={12}/> 뇌파 신호 <span className="text-cyan">/ SIGNAL_WAVE</span></h3>
            <div className="wave-container">
               <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="wave-svg">
                 <motion.polyline 
                   points="0,10 10,15 20,5 30,18 40,2 50,10 60,8 70,14 80,6 90,12 100,10" 
                   className="wave-line"
                   initial={{ pathLength: 0 }}
                   animate={{ pathLength: 1 }}
                   transition={{ duration: 2, ease: "linear" }}
                 />
               </svg>
               <div className="wave-scanner"></div>
            </div>
          </motion.div>

          <motion.button 
            variants={itemVariants} 
            className="panel share-btn" 
            onClick={() => navigate('/')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Share2 size={16} />
            <span className="mono">아카이브 송신 완료 / TRANSMIT_&_RETURN</span>
          </motion.button>
        </motion.div>
      )}
    </PageTransition>
  );
};

export default LogResult;
