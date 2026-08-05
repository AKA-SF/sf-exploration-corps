import { useMemo } from 'react';

function getPosition(id, index) {
  const hash = String(id || index).split('').reduce((sum, character) => sum + character.charCodeAt(0), index * 17);
  return {
    x: 10 + (Math.abs(Math.sin(hash * 0.91)) * 80),
    y: 12 + (Math.abs(Math.cos(hash * 1.17)) * 74),
  };
}

function publicSignalTitle(log) {
  return log.spoiler === 'CLASSIFIED_SIGNAL'
    ? '분류된 탐사 신호'
    : log.title || '제목 없는 탐사 신호';
}

export default function NetworkMapV2({ logs, onSelect }) {
  const nodes = useMemo(() => logs.slice(0, 28).map((log, index) => ({
    ...getPosition(log.id, index),
    log,
  })), [logs]);

  const edges = useMemo(() => nodes.slice(1).map((node, index) => {
    const previous = nodes[index];
    return {
      id: `${previous.log.id}-${node.log.id}`,
      x1: previous.x,
      x2: node.x,
      y1: previous.y,
      y2: node.y,
    };
  }), [nodes]);

  if (nodes.length === 0) {
    return <div className="network-v2-empty panel"><strong>표시할 공개 신호가 없습니다.</strong><p>새로운 공개 탐사 기록이 생기면 지도에 연결점이 나타납니다.</p></div>;
  }

  return (
    <div className="network-v2-map" aria-label="공개 탐사 신호 지도">
      <svg aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 100 100">
        {edges.map(edge => <line key={edge.id} x1={edge.x1} x2={edge.x2} y1={edge.y1} y2={edge.y2} />)}
      </svg>
      {nodes.map(({ log, x, y }) => (
        <button
          aria-label={`${publicSignalTitle(log)} 상세 보기`}
          key={log.id}
          onClick={() => onSelect(log)}
          style={{ left: `${x}%`, top: `${y}%` }}
          type="button"
        >
          <i aria-hidden="true" />
          <span>{publicSignalTitle(log)}</span>
        </button>
      ))}
      <div className="network-v2-map-key mono"><i /> 공개 탐사 신호 <span>{nodes.length}개</span></div>
    </div>
  );
}
