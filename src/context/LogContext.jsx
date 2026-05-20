/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useContext, useEffect } from 'react';

const LogContext = createContext();

export const LogProvider = ({ children }) => {
  // 로컬 스토리지에서 기존 로그를 불러오거나 기본값 사용
  const [logs, setLogs] = useState(() => {
    const saved = localStorage.getItem('sf_exploration_logs_v3');
    if (saved) {
      return JSON.parse(saved);
    }
    return [
      { 
        id: "LOG-A92", 
        title: "Blade Runner 2049", 
        type: "사이버펑크", 
        experiences: { immersion: 90, addiction: 70, complexity: 60, visual: 100, derealization: 85, scale: 80 },
        emotions: ["압도감", "외로움"],
        ideas: ["인간성 질문", "여운"],
        memo: "인간보다 더 인간적인..."
      },
      { 
        id: "LOG-B11", 
        title: "2001: A Space Odyssey", 
        type: "우주 오페라", 
        experiences: { immersion: 80, addiction: 50, complexity: 95, visual: 90, derealization: 100, scale: 100 },
        emotions: ["기괴함", "압도감"],
        ideas: ["미래 상상력", "기술 공포"],
        memo: "도구의 발견과 진화"
      },
    ];
  });

  const [networkLogs, setNetworkLogs] = useState(() => {
    const saved = localStorage.getItem('sf_network_logs_v1');
    if (saved) {
      return JSON.parse(saved);
    }
    return [
      {
        id: "NET-X01",
        explorerId: "USR-109B",
        title: "Dune",
        type: "우주 오페라",
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        experiences: { immersion: 95, addiction: 80, complexity: 70, visual: 90, derealization: 85, scale: 100 },
        emotions: ["압도감", "공포감"],
        ideas: ["기술 공포", "여운"],
        memo: "모래 벌레의 진동이 아직도 느껴진다.",
        encryptionLevel: 0, // 0: always unlocked
        responseSignals: [
          { signalId: "SIG-01", sender: "USR-7734", message: "스파이스의 향기가 전해지네요.", time: new Date(Date.now() - 3600000).toISOString() }
        ]
      },
      {
        id: "NET-Y42",
        explorerId: "USR-404E",
        title: "The Matrix",
        type: "디스토피아",
        timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
        experiences: { immersion: 100, addiction: 95, complexity: 60, visual: 80, derealization: 100, scale: 80 },
        emotions: ["기괴함", "우울함"],
        ideas: ["인간성 질문", "미래 상상력"],
        memo: "시스템 밖을 본 것 같다.",
        encryptionLevel: 2, // Needs at least 2 personal logs to unlock
        responseSignals: []
      },
      {
        id: "NET-Z99",
        explorerId: "USR-X999",
        title: "Arrival",
        type: "하드 SF",
        timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
        experiences: { immersion: 80, addiction: 60, complexity: 90, visual: 70, derealization: 75, scale: 95 },
        emotions: ["외로움", "희망"],
        ideas: ["여운", "인간성 질문"],
        memo: "시간은 선형적이지 않다.",
        encryptionLevel: 4, // Needs at least 4 personal logs to unlock
        responseSignals: []
      }
    ];
  });

  const [currentSystemState, setCurrentSystemState] = useState({
    riskLevel: 0,
    isTyping: false,
    selectedGenre: null
  });

  useEffect(() => {
    localStorage.setItem('sf_exploration_logs_v3', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem('sf_network_logs_v1', JSON.stringify(networkLogs));
  }, [networkLogs]);

  const addLog = (log) => {
    const timestamp = log.timestamp || new Date().toISOString();
    const normalizedLog = {
      ...log,
      timestamp,
      explorerId: log.explorerId || 'ORBIT-7734',
    };

    setLogs((prev) => {
      if (prev.some(existing => existing.id === normalizedLog.id)) return prev;
      return [normalizedLog, ...prev];
    });

    setNetworkLogs((prev) => {
      if (prev.some(existing => existing.id === normalizedLog.id)) return prev;
      return [
        {
          ...normalizedLog,
          encryptionLevel: 0,
          responseSignals: [
            {
              signalId: `SIG-${Math.floor(Math.random() * 9000 + 1000)}`,
              sender: 'ARCHIVE-CORE',
              message: '신규 탐사 보고서가 공용 신호망에 동기화되었습니다.',
              time: timestamp,
            }
          ],
        },
        ...prev,
      ];
    });
  };

  const addResponseSignal = (networkId, message) => {
    setNetworkLogs(prev => prev.map(log => {
      if (log.id === networkId) {
        return {
          ...log,
          responseSignals: [
            ...log.responseSignals,
            { signalId: `SIG-${Math.floor(Math.random()*9000+1000)}`, sender: "USER-7734", message, time: new Date().toISOString() }
          ]
        };
      }
      return log;
    }));
  };

  return (
    <LogContext.Provider value={{ logs, networkLogs, addLog, addResponseSignal, currentSystemState, setCurrentSystemState }}>
      {children}
    </LogContext.Provider>
  );
};

export const useLogs = () => useContext(LogContext);
