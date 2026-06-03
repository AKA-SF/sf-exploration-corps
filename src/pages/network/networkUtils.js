import { Activity, AlertTriangle, Hexagon, Skull } from 'lucide-react';

export const LOG_TYPES = {
  WARNING: { color: 'var(--accent-amber)', icon: AlertTriangle },
  DEEP_SIGNAL: { color: 'var(--primary-cyan)', icon: Activity },
  ANOMALY: { color: '#a855f7', icon: Hexagon },
  LOST_TRANSMISSION: { color: '#ef4444', icon: Skull },
};

export const SIGNAL_ACTIONS = ['RESONATE', 'DECODE_REQ', 'ECHO', 'DISTORT', 'ARCHIVE'];
export const MAX_VISIBLE_NODES = 80;
export const MAX_VISIBLE_EDGES = 160;
export const MAX_ANIMATED_EDGES = 72;
export const MAX_EDGE_COMPARE_WINDOW = 26;
export const RADIO_MESSAGE_LIMIT = 48;
export const NETWORK_AUX_SIGNAL_LIMIT = 8;

export const NETWORK_REACTIONS = [
  { id: 'confirm', label: '수신 확인', points: 1, status: 'CONFIRM' },
  { id: 'amplify', label: '신호 증폭', points: 2, status: 'AMPLIFY' },
  { id: 'bookmark', label: '좌표 저장', points: 1, status: 'BOOKMARK' },
];

export function formatSignalTime(value) {
  return new Date(value).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getSignalLine(log, index) {
  const emotion = log.emotions?.[0] || '미확인 감정';
  const idea = log.ideas?.[0] || '미확인 개념';
  const action = SIGNAL_ACTIONS[index % SIGNAL_ACTIONS.length];
  return `${log.explorerId} // ${log.type} 섹터에서 '${log.title}' ${action} / ${emotion} + ${idea}`;
}

export const DAILY_NETWORK_MISSIONS = [
  {
    id: 'trace-work',
    title: '작품 좌표 1개 추적',
    detail: '작품 아카이브에서 오늘 끌리는 작품 하나를 열고 읽고 싶어요로 등록하세요.',
    reward: '+10 MP',
    href: '/works/novels',
    signal: 'ARCHIVE_CARD',
  },
  {
    id: 'open-community',
    title: '커뮤니티 신호 확인',
    detail: '커뮤니티 게시판에서 질문 또는 추천 글 하나를 열어 다른 대원의 신호를 확인하세요.',
    reward: '+8 MP',
    href: '/questions',
    signal: 'COMMUNITY_POST',
  },
  {
    id: 'send-radio',
    title: '공개 무전 1회 송신',
    detail: '현재 읽고 있는 작품, 감지한 장르 좌표, 짧은 생각을 무전 채널에 남기세요.',
    reward: '+4 MP',
    href: '/network',
    signal: 'OPEN_RADIO',
  },
  {
    id: 'decode-concept',
    title: '개념 신호 1개 해독',
    detail: 'SF 개념 사전에서 오늘의 키워드를 하나 열어 장르 감각을 보정하세요.',
    reward: '+5 MP',
    href: '/#concept-dictionary',
    signal: 'CONCEPT_SIGNAL',
  },
];

export function getDayIndex(length) {
  const today = new Date().toLocaleDateString('sv-SE');
  const seed = today.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return length > 0 ? seed % length : 0;
}

export function getDailyNetworkMission() {
  return DAILY_NETWORK_MISSIONS[getDayIndex(DAILY_NETWORK_MISSIONS.length)];
}

export function getSignalColor(signalType) {
  if (signalType.includes('COMMUNITY')) return 'var(--accent-amber)';
  if (signalType.includes('ARCHIVE')) return 'var(--primary-cyan)';
  if (signalType.includes('BADGE')) return '#a855f7';
  if (signalType.includes('CONCEPT')) return '#70e0ff';
  if (signalType.includes('UNKNOWN')) return '#ef4444';
  if (signalType.includes('RADIO') || signalType.includes('REPLY')) return 'var(--primary-cyan)';
  return 'var(--text-muted)';
}

export function getActivitySignal(activity) {
  const metadata = activity.metadata ?? {};
  const title = metadata.question_title || metadata.work_title || metadata.title || activity.genre || '탐사 활동';
  const actionType = activity.action_type;

  if (actionType === 'post') {
    return {
      body: `커뮤니티 새 글 // ${title}`,
      href: metadata.question_id ? `/questions/${metadata.question_id}` : '/questions',
      status: 'COMMUNITY_POST',
    };
  }
  if (actionType === 'comment' && metadata.question_id) {
    return {
      body: `커뮤니티 댓글 교신 // ${metadata.question_title || title}`,
      href: `/questions/${metadata.question_id}`,
      status: 'COMMUNITY_COMMENT',
    };
  }
  if (actionType === 'comment' && metadata.work_code) {
    return {
      body: `작품 카드 댓글 // ${metadata.work_title || title}`,
      href: `/works/novels?work=${encodeURIComponent(metadata.work_code)}`,
      status: 'ARCHIVE_COMMENT',
    };
  }
  if (actionType === 'work_status') {
    return {
      body: `작품 카드 상태 갱신 // ${metadata.work_title || title}`,
      href: metadata.work_code ? `/works/novels?work=${encodeURIComponent(metadata.work_code)}` : '/works/novels',
      status: 'ARCHIVE_CARD',
    };
  }
  if (actionType === 'media_visit') {
    return {
      body: `미디어 신호 열람 // ${title}`,
      href: '/media/interviews',
      status: 'MEDIA_SIGNAL',
    };
  }
  if (actionType === 'concept_read') {
    return {
      body: `개념 신호 해독 // ${title}`,
      href: '/#concept-dictionary',
      status: 'CONCEPT_SIGNAL',
    };
  }
  if (actionType === 'taste_test') {
    return {
      body: `성향 분석 완료 // ${metadata.taste_title || title}`,
      href: '/profile',
      status: 'PROFILE_SCAN',
    };
  }
  if (actionType === 'radio_message' || actionType === 'radio_reply') {
    return {
      body: `${actionType === 'radio_reply' ? '무전 답신' : '공개 무전'} // ${metadata.body || title}`,
      href: '/network',
      status: actionType === 'radio_reply' ? 'REPLY_SIGNAL' : 'OPEN_RADIO',
    };
  }

  return {
    body: `${activity.genre || '활동'} // ${title}`,
    href: '/profile',
    status: 'SYSTEM_ACTIVITY',
  };
}

export function getBoardSignal(question) {
  return {
    id: `question-${question.id || question.title}`,
    body: `커뮤니티 ${question.category || '교신'} // ${question.title}`,
    color: getSignalColor('COMMUNITY_POST'),
    href: question.id ? `/questions/${question.id}` : '/questions',
    sender: question.author || question.name || 'COMMUNITY',
    status: 'COMMUNITY_POST',
    time: question.createdAt ? formatSignalTime(question.createdAt) : 'BOARD',
  };
}

export function getWorkCommentSignal(comment) {
  return {
    id: `work-comment-${comment.id}`,
    body: `작품 카드 댓글 // ${comment.work_title || comment.work_code || '아카이브 좌표'}`,
    color: getSignalColor('ARCHIVE_COMMENT'),
    href: comment.work_code ? `/works/novels?work=${encodeURIComponent(comment.work_code)}` : '/works/novels',
    sender: comment.author_name || 'ARCHIVE-CREW',
    status: 'ARCHIVE_COMMENT',
    time: formatSignalTime(comment.created_at),
  };
}

export function getNetworkMissionProgress({ activitySignals = [], dailyMission, radioMessages = [], user }) {
  const today = new Date().toLocaleDateString('sv-SE');
  const isToday = value => value && new Date(value).toLocaleDateString('sv-SE') === today;

  if (dailyMission.id === 'send-radio') {
    const completed = radioMessages.some(message => message.user_id === user?.id && isToday(message.created_at));
    return { completed, label: completed ? '완료' : '0 / 1' };
  }

  if (dailyMission.id === 'open-community') {
    const completed = activitySignals.some(signal => signal.status?.includes('COMMUNITY'));
    return { completed, label: completed ? '완료' : '커뮤니티 신호 대기' };
  }

  if (dailyMission.id === 'trace-work') {
    const completed = activitySignals.some(signal => signal.status?.includes('ARCHIVE'));
    return { completed, label: completed ? '완료' : '작품 좌표 대기' };
  }

  if (dailyMission.id === 'decode-concept') {
    const completed = activitySignals.some(signal => signal.status?.includes('CONCEPT'));
    return { completed, label: completed ? '완료' : '개념 신호 대기' };
  }

  return { completed: false, label: '진행 중' };
}

export function getUnknownSignalTarget({ activitySignals = [], radioMessages = [], spatialLogs = [] }) {
  const candidates = [
    ...activitySignals.filter(signal => signal.href).map(signal => ({
      body: signal.body,
      href: signal.href,
      label: signal.status,
    })),
    ...radioMessages.map(message => ({
      body: message.body,
      href: '/network',
      label: message.parent_id ? 'REPLY_SIGNAL' : 'OPEN_RADIO',
    })),
    ...spatialLogs.map(log => ({
      body: log.title,
      href: `/network/${log.id}`,
      label: log.typeKey || 'DEEP_SIGNAL',
    })),
    { body: '오늘의 랜덤 작품 좌표', href: '/works/novels', label: 'ARCHIVE_CARD' },
    { body: '커뮤니티 질문 저장소', href: '/questions', label: 'COMMUNITY_POST' },
  ];
  const target = candidates[getDayIndex(candidates.length)];
  return {
    ...target,
    status: 'UNKNOWN_SIGNAL',
    color: getSignalColor('UNKNOWN_SIGNAL'),
  };
}
