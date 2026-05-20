import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FilePlus, Target, Brain, Activity, Save, Lightbulb, HeartPulse, RadioTower, CheckCircle2 } from 'lucide-react';
import { useLogs } from '../context/LogContext';
import PageTransition from '../components/PageTransition';
import './LogEntry.css';

const EMOTION_TAGS = ['우울함', '압도감', '외로움', '희망', '공포감', '기괴함'];
const IDEA_TAGS = ['아이디어 충격', '미래 상상력', '기술 공포', '인간성 질문', '여운'];

const LogEntry = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setCurrentSystemState } = useLogs();
  
  const prefilled = location.state || {};

  const [formData, setFormData] = useState({
    title: prefilled.prefilledTitle || '',
    type: prefilled.prefilledType || '',
    experiences: prefilled.prefilledExperiences || {
      immersion: 50,
      addiction: 50,
      complexity: 50,
      visual: 50,
      derealization: 50,
      scale: 50
    },
    emotions: prefilled.prefilledEmotions || [],
    ideas: prefilled.prefilledIdeas || [],
    memo: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const coords = useMemo(() => {
    const x = (formData.experiences.immersion * 0.45).toFixed(3);
    const y = (formData.experiences.scale * 0.81).toFixed(3);
    const zSeed = (formData.title.length * 13 + formData.memo.length * 7 + formData.experiences.complexity) % 997;
    const z = (zSeed / 997).toFixed(3);
    return `X: ${x} Y: ${y} Z: ${z}`;
  }, [formData.experiences.immersion, formData.experiences.scale, formData.experiences.complexity, formData.title.length, formData.memo.length]);

  useEffect(() => {
    // Calculate aggregate risk based on derealization and complexity
    const aggRisk = (formData.experiences.derealization + formData.experiences.complexity) / 2;
    
    setCurrentSystemState({
      riskLevel: aggRisk,
      isTyping: formData.title.length > 0 || formData.memo.length > 0,
      selectedGenre: formData.type
    });
    
  }, [formData, setCurrentSystemState]);

  useEffect(() => {
    return () => setCurrentSystemState({ riskLevel: 0, isTyping: false, selectedGenre: null });
  }, [setCurrentSystemState]);

  const toggleTag = (category, tag) => {
    setFormData(prev => {
      const list = prev[category];
      if (list.includes(tag)) return { ...prev, [category]: list.filter(t => t !== tag) };
      if (list.length >= 3) return prev; // max 3 tags
      return { ...prev, [category]: [...list, tag] };
    });
  };

  const handleSlider = (key, val) => {
    setFormData(prev => ({ ...prev, experiences: { ...prev.experiences, [key]: parseInt(val) } }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title) return;
    
    setIsSubmitting(true);
    setTimeout(() => {
      const generatedId = `LOG-${Math.floor(Math.random() * 900 + 100)}`;
      navigate(`/result/${generatedId}`, { state: { ...formData, id: generatedId } });
    }, 2500);
  };

  const Sliders = [
    { key: 'immersion', labelKr: '몰입감', labelEn: 'IMMERSION', color: 'cyan' },
    { key: 'addiction', labelKr: '중독성', labelEn: 'ADDICTION', color: 'cyan' },
    { key: 'complexity', labelKr: '난해함', labelEn: 'COMPLEXITY', color: 'amber' },
    { key: 'visual', labelKr: '영상화됨', labelEn: 'VISUALIZATION', color: 'blue' },
    { key: 'derealization', labelKr: '현실감 상실', labelEn: 'DEREALIZATION', color: 'amber' },
    { key: 'scale', labelKr: '세계관 규모감', labelEn: 'WORLD_SCALE', color: 'cyan' }
  ];

  const reportReadiness = useMemo(() => {
    const score = [
      formData.title.trim().length > 0,
      formData.type.trim().length > 0,
      formData.emotions.length > 0,
      formData.ideas.length > 0,
      formData.memo.trim().length > 8,
    ].filter(Boolean).length;

    return Math.round((score / 5) * 100);
  }, [formData.emotions.length, formData.ideas.length, formData.memo, formData.title, formData.type]);

  return (
    <PageTransition className={`log-entry-container ${isSubmitting ? 'submitting' : ''}`}>
      <header className="page-header">
        <h2 className="mono title-glitch"><FilePlus size={20} /> 탐사 로그 <span className="text-muted text-xs">/ EXPLORATION LOG</span></h2>
        <div className="terminal-decor">
          <span className="mono text-cyan text-xs">{coords}</span>
        </div>
      </header>

      <section className="uplink-brief panel">
        <div>
          <span className="mono brief-kicker"><RadioTower size={12} /> REPORT_UPLINK</span>
          <h3>탐사 보고서 작성 중</h3>
          <p>제출하면 개인 아카이브와 LIVE_SIGNAL_NET에 동시에 송신됩니다.</p>
        </div>
        <div className="readiness-ring mono" style={{ '--ready': `${reportReadiness}%` }}>
          <strong>{reportReadiness}</strong>
          <span>READY</span>
        </div>
      </section>

      <form className="log-form" onSubmit={handleSubmit}>
        <div className="form-group panel">
          <label className="mono text-cyan"><Target size={14} /> 탐사 대상 <span className="text-muted">/ TARGET_IDENTIFIER</span></label>
          <input 
            type="text" 
            placeholder="작품명을 입력하세요..." 
            className="sf-input mono"
            value={formData.title}
            onChange={e => setFormData({...formData, title: e.target.value})}
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group panel">
          <label className="mono text-cyan"><Brain size={14} /> 탐사 구역 <span className="text-muted">/ SECTOR (TYPE)</span></label>
          <input 
            type="text" 
            className="sf-input mono"
            value={formData.type}
            onChange={e => setFormData({...formData, type: e.target.value})}
            placeholder="장르 (예: 사이버펑크)"
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group panel">
          <label className="mono text-cyan"><Activity size={14} /> 경험 수치 <span className="text-muted">/ EXPERIENTIAL_METRICS</span></label>
          <div className="sliders-grid">
            {Sliders.map(s => (
              <div key={s.key} className="slider-item">
                <div className="slider-labels">
                  <span className="kr-label">{s.labelKr}</span>
                  <span className="en-label mono text-muted">{s.labelEn}</span>
                </div>
                <div className="slider-wrapper">
                  <input 
                    type="range" min="0" max="100" 
                    className={`sf-slider ${s.color}-slider`}
                    value={formData.experiences[s.key]}
                    onChange={e => handleSlider(s.key, e.target.value)}
                    disabled={isSubmitting}
                  />
                  <span className={`mono slider-val text-${s.color}`}>{formData.experiences[s.key]}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="form-group panel">
          <label className="mono text-cyan"><HeartPulse size={14} /> 감정 잔류물 <span className="text-muted">/ EMOTIONAL_RESIDUE</span></label>
          <div className="tag-grid small">
            {EMOTION_TAGS.map(tag => (
              <button 
                key={tag} type="button"
                className={`sf-tag mono outline ${formData.emotions.includes(tag) ? 'active' : ''}`}
                onClick={() => toggleTag('emotions', tag)}
                disabled={isSubmitting}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group panel">
          <label className="mono text-cyan"><Lightbulb size={14} /> 획득 이데아 <span className="text-muted">/ ACQUIRED_IDEAS</span></label>
          <div className="tag-grid small">
            {IDEA_TAGS.map(tag => (
              <button 
                key={tag} type="button"
                className={`sf-tag mono outline ${formData.ideas.includes(tag) ? 'active' : ''}`}
                onClick={() => toggleTag('ideas', tag)}
                disabled={isSubmitting}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group panel">
          <label className="mono text-cyan">탐사 노트 <span className="text-muted">/ FIELD_NOTES</span></label>
          <textarea 
            placeholder="기록을 남기세요..." 
            className="sf-textarea mono"
            value={formData.memo}
            onChange={e => setFormData({...formData, memo: e.target.value})}
            disabled={isSubmitting}
          ></textarea>
        </div>

        <button 
          type="submit" 
          className="submit-btn panel glitch-hover"
          disabled={!formData.title || isSubmitting}
        >
          <Save size={18} />
          <span className="mono">{isSubmitting ? 'TRANSMITTING_TO_ARCHIVE...' : '탐사 완료 / COMMIT_LOG'}</span>
          {isSubmitting && <div className="scanning-bar"></div>}
        </button>

        <div className="sticky-submit-bar panel">
          <div className="sticky-readout mono">
            <CheckCircle2 size={13} />
            <span>{formData.title ? `TARGET_LOCKED // ${formData.title}` : 'TARGET_REQUIRED'}</span>
          </div>
          <button
            type="submit"
            className="sticky-submit-btn"
            disabled={!formData.title || isSubmitting}
          >
            <Save size={16} />
            <span className="mono">{isSubmitting ? '송신 중...' : '탐사보고서 제출'}</span>
          </button>
        </div>
      </form>
    </PageTransition>
  );
};

export default LogEntry;
