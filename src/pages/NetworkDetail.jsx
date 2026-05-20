import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLogs } from '../context/LogContext';
import { ChevronLeft, Send, Activity, BarChart2, RadioReceiver } from 'lucide-react';
import PageTransition from '../components/PageTransition';
import { motion } from 'framer-motion';
import './NetworkDetail.css';

const NetworkDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { networkLogs, addResponseSignal, setCurrentSystemState } = useLogs();
  
  const log = networkLogs.find(l => l.id === id);
  const [signalText, setSignalText] = useState('');

  if (!log) {
    return (
      <PageTransition className="network-detail-container">
        <div className="error-panel mono">
          <span className="text-amber">ERROR: LOG_NOT_FOUND</span>
          <button onClick={() => navigate('/network')} className="btn-secondary">ABORT_CONNECTION</button>
        </div>
      </PageTransition>
    );
  }

  const handleSendSignal = (e) => {
    e.preventDefault();
    if (!signalText.trim()) return;
    
    // Typing effect triggers background pulse
    setCurrentSystemState(prev => ({ ...prev, isTyping: true }));
    
    addResponseSignal(log.id, signalText);
    setSignalText('');
    
    setTimeout(() => {
      setCurrentSystemState(prev => ({ ...prev, isTyping: false }));
    }, 500);
  };

  // Mock Collective Data Analysis based on the log's primary emotion
  const collectiveData = [
    { label: log.emotions[0] || "알 수 없음", value: 82 },
    { label: log.emotions[1] || "몰입감", value: 64 },
    { label: "현실감 상실", value: Math.floor(log.experiences.derealization * 0.9) }
  ];

  return (
    <PageTransition className="network-detail-container">
      <header className="detail-header">
        <button onClick={() => navigate('/network')} className="btn-icon">
          <ChevronLeft size={24} />
        </button>
        <h2 className="mono title-glitch text-sm">COMM_LINK: {log.id}</h2>
      </header>

      <div className="log-data-panel panel">
        <div className="log-data-header">
          <h1 className="mono">{log.title}</h1>
          <span className="mono text-xs text-cyan">SENDER: {log.explorerId}</span>
        </div>
        
        <div className="log-metrics mono text-xs">
          <div className="metric">
            <span className="text-muted">SECTOR</span>
            <span>{log.type}</span>
          </div>
          <div className="metric">
            <span className="text-muted">TIME</span>
            <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
          </div>
        </div>

        <div className="memo-box">
          <Activity size={16} className="text-cyan" />
          <p className="mono">"{log.memo}"</p>
        </div>
      </div>

      <div className="collective-analysis panel">
        <h3 className="mono text-xs text-muted section-title">
          <BarChart2 size={14} /> 집단 감정 동기화율 <span className="text-cyan">/ SYNC_RATE</span>
        </h3>
        <div className="analysis-bars">
          {collectiveData.map((data, i) => (
            <div key={i} className="bar-container mono text-xs">
              <div className="bar-labels">
                <span>{data.label}</span>
                <span className="text-cyan">{data.value}%</span>
              </div>
              <div className="bar-bg">
                <motion.div 
                  className="bar-fill" 
                  initial={{ width: 0 }}
                  animate={{ width: `${data.value}%` }}
                  transition={{ duration: 1, delay: i * 0.2 }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="response-signals panel">
        <h3 className="mono text-xs text-muted section-title">
          <RadioReceiver size={14} /> 수신된 교신 로그 <span className="text-cyan">/ COMM_LOGS</span>
        </h3>
        
        <div className="signals-list">
          {log.responseSignals.length === 0 ? (
            <div className="no-signals mono text-xs text-muted">NO_SIGNALS_DETECTED</div>
          ) : (
            log.responseSignals.map((sig, i) => (
              <motion.div 
                key={sig.signalId} 
                className="signal-item"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="signal-header mono text-[10px] text-muted">
                  <span className="text-amber">{sig.sender}</span> // {new Date(sig.time).toLocaleTimeString()}
                </div>
                <div className="signal-body mono text-sm">
                  {sig.message}
                </div>
              </motion.div>
            ))
          )}
        </div>

        <form onSubmit={handleSendSignal} className="signal-form">
          <input
            type="text"
            className="signal-input mono text-sm"
            placeholder="응답 신호 송신..."
            value={signalText}
            onChange={(e) => setSignalText(e.target.value)}
          />
          <button type="submit" className="btn-send" disabled={!signalText.trim()}>
            <Send size={18} />
          </button>
        </form>
      </div>

    </PageTransition>
  );
};

export default NetworkDetail;
