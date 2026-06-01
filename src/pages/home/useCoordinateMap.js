import { useMemo, useState } from 'react';

import { genreNodes, genreSubmaps, mapConnections, sfCoreNode } from '../../data/sfCoordinateTaxonomy';

const externalNodeSlots = [
  { x: 13, y: 17 },
  { x: 87, y: 17 },
  { x: 89, y: 84 },
  { x: 11, y: 84 },
  { x: 50, y: 92 },
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getWorkSearchText(work) {
  return [
    work.title,
    work.subtitle,
    work.medium,
    work.recommender,
    ...(work.tags ?? []),
  ].filter(Boolean).join(' ').toLowerCase();
}

function findRelatedWorksForNode(node, works) {
  const keywords = [node.label, node.en, ...(node.keywords ?? [])]
    .filter(Boolean)
    .map(keyword => keyword.toLowerCase());

  const scoredWorks = works
    .map(work => {
      const searchText = getWorkSearchText(work);
      const score = keywords.reduce((total, keyword) => (
        searchText.includes(keyword.replace(/\s/g, '').toLowerCase()) || searchText.includes(keyword)
          ? total + 1
          : total
      ), 0);
      return { work, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return scoredWorks.map(item => item.work).slice(0, 5);
}

function findRelatedConceptsForNode(node, concepts) {
  const keywords = [node.label, node.en, ...(node.keywords ?? []), ...(node.concepts ?? [])]
    .filter(Boolean)
    .map(keyword => keyword.toLowerCase());

  return concepts
    .filter(concept => {
      const searchText = [
        concept.term,
        concept.english,
        concept.category,
        concept.summary,
        ...(concept.keywords ?? []),
      ].filter(Boolean).join(' ').toLowerCase();

      return keywords.some(keyword => searchText.includes(keyword.replace(/\s/g, '').toLowerCase()) || searchText.includes(keyword));
    })
    .slice(0, 4);
}

function clampPosition(value) {
  return clamp(value, 6, 94);
}

function getTextSeed(text) {
  return text.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function getRootSecondaryNodes() {
  const nodeMap = new Map();

  Object.entries(genreSubmaps).forEach(([parentId, submap]) => {
    const parent = genreNodes.find(node => node.id === parentId);
    if (!parent) return;

    submap.nodes.forEach((node, index) => {
      if (nodeMap.has(node.id)) return;

      const angle = index * 2.399 + getTextSeed(parentId) * 0.01;
      const spreadX = (node.x - 50) * 0.24 + Math.cos(angle) * 2.8;
      const spreadY = (node.y - 50) * 0.2 + Math.sin(angle) * 2.3;

      nodeMap.set(node.id, {
        ...node,
        x: clampPosition(parent.x + spreadX),
        y: clampPosition(parent.y + spreadY),
        orbit: 1 + (index % 2),
        parentId,
        secondary: true,
        tier: 2,
      });
    });
  });

  return [...nodeMap.values()];
}

function getRootSecondaryConnections() {
  const connectionSet = new Set();

  Object.entries(genreSubmaps).forEach(([parentId, submap]) => {
    submap.nodes.forEach(node => {
      connectionSet.add(`${parentId}::${node.id}`);
    });

    (submap.connections ?? []).forEach(([from, to]) => {
      connectionSet.add(`${from}::${to}`);
    });
  });

  return [...connectionSet].map(item => item.split('::'));
}

export default function useCoordinateMap({ concepts, setDashboard, works }) {
  const [activeGenreId, setActiveGenreId] = useState(null);
  const [selectedCoordinateId, setSelectedCoordinateId] = useState('');
  const [mapView, setMapView] = useState({ yaw: -0.24, pitch: 0.18, zoom: 1 });
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [coordinateLogUrl, setCoordinateLogUrl] = useState('');
  const [coordinateLogStatus, setCoordinateLogStatus] = useState('idle');
  const [coordinateLogMessage, setCoordinateLogMessage] = useState('');

  const activeGenre = activeGenreId ? genreNodes.find(node => node.id === activeGenreId) : null;
  const activeSubmap = activeGenreId ? genreSubmaps[activeGenreId] : null;
  const rootSecondaryNodes = useMemo(() => getRootSecondaryNodes(), []);
  const rootSecondaryConnections = useMemo(() => getRootSecondaryConnections(), []);
  const activeSubmapNodeIds = new Set(activeSubmap?.nodes.map(node => node.id) ?? []);
  const submapExternalNodes = activeSubmap
    ? [...new Set((activeSubmap.connections ?? []).flat())]
      .filter(id => id !== activeGenreId && !activeSubmapNodeIds.has(id))
      .map((id, index) => {
        const linkedGenre = genreNodes.find(node => node.id === id);
        if (!linkedGenre) return null;
        return {
          ...linkedGenre,
          ...externalNodeSlots[index % externalNodeSlots.length],
          orbit: Math.max(1, linkedGenre.orbit - 1),
          external: true,
        };
      })
      .filter(Boolean)
    : [];
  const visibleNodes = activeSubmap
    ? [
      ...activeSubmap.nodes.map(node => ({
        ...node,
        parentId: activeGenreId,
        secondary: true,
        tier: 2,
      })),
      ...submapExternalNodes.map(node => ({ ...node, tier: 1 })),
    ]
    : [
      { ...sfCoreNode, center: true, tier: 0 },
      ...genreNodes.map(node => ({ ...node, tier: 1 })),
      ...rootSecondaryNodes,
    ];
  const visibleConnections = activeSubmap
    ? activeSubmap.connections ?? activeSubmap.nodes.map(node => [activeGenreId, node.id])
    : [...mapConnections, ...rootSecondaryConnections];
  const mapPositions = activeSubmap && activeGenre
    ? [{ ...activeGenre, x: 50, y: 50, orbit: 5, center: true, tier: 1 }, ...visibleNodes]
    : visibleNodes;
  const selectedCoordinate = mapPositions.find(node => node.id === selectedCoordinateId) ?? activeGenre ?? sfCoreNode;
  const selectedCoordinateConnections = selectedCoordinateId
    ? visibleConnections.filter(([from, to]) => from === selectedCoordinateId || to === selectedCoordinateId)
    : [];
  const relatedCoordinateIds = new Set(selectedCoordinateConnections.flat());
  const hasCoordinateFocus = Boolean(selectedCoordinateId);
  const selectedCoordinateWorks = findRelatedWorksForNode(selectedCoordinate, works);
  const selectedCoordinateConcepts = findRelatedConceptsForNode(selectedCoordinate, concepts);
  const selectedCoordinateQuestions = selectedCoordinate.questions?.length
    ? selectedCoordinate.questions
    : ['이 좌표는 어떤 인간 이후의 조건을 상상하게 만드는가?'];
  const mapDescription = activeSubmap?.description
    ?? '탐사 좌표는 SF 문학을 중심으로 상위 계열과 2차 하위 노드를 하나의 구형 네트워크로 배치합니다. 큰 좌표는 장르권, 작은 위성 좌표는 세부 장르와 개념 신호입니다.';
  const minimapViewportWidth = clamp(66 / mapView.zoom, 28, 72);
  const minimapViewportHeight = clamp(66 / mapView.zoom, 28, 72);
  const minimapViewport = {
    width: minimapViewportWidth,
    height: minimapViewportHeight,
    x: clamp(50 + (mapView.yaw * 5) - minimapViewportWidth / 2, 4, 96 - minimapViewportWidth),
    y: clamp(50 + (mapView.pitch * 14) - minimapViewportHeight / 2, 4, 96 - minimapViewportHeight),
  };

  const resetCoordinateMap = () => {
    setActiveGenreId(null);
    setSelectedCoordinateId('');
    setMapView({ yaw: -0.24, pitch: 0.18, zoom: 1 });
  };

  const handleGenreNodeClick = node => {
    if (node.id === sfCoreNode.id) {
      resetCoordinateMap();
      return;
    }

    if (node.id === selectedCoordinateId && !genreSubmaps[node.id]) {
      setSelectedCoordinateId('');
      return;
    }

    setSelectedCoordinateId(node.id);
    if (genreSubmaps[node.id]) {
      setActiveGenreId(node.id);
    }
  };

  const openCoordinateLogModal = () => {
    if (!selectedCoordinateId) return;
    setCoordinateLogUrl('');
    setCoordinateLogStatus('idle');
    setCoordinateLogMessage('');
    setIsLogModalOpen(true);
  };

  const submitCoordinateLog = async event => {
    event.preventDefault();
    if (!coordinateLogUrl.trim()) {
      setCoordinateLogStatus('error');
      setCoordinateLogMessage('인스타 서평 주소를 입력해주세요.');
      return;
    }

    setCoordinateLogStatus('submitting');
    setCoordinateLogMessage('');

    try {
      const response = await fetch('/api/exploration-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instagramUrl: coordinateLogUrl,
          nodeId: selectedCoordinate.id,
          nodeLabel: selectedCoordinate.label,
          nodeEnglish: selectedCoordinate.en,
          workTitle: selectedCoordinate.label,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.notion?.message || data?.error || '탐사 로그 저장에 실패했습니다.');
      }

      setCoordinateLogStatus('success');
      setCoordinateLogMessage('탐사 로그가 노션에 저장되었습니다.');
      setDashboard(state => ({
        ...state,
        logs: data.log ? [data.log, ...state.logs] : state.logs,
        status: { ...state.status, logs: true },
      }));
      setCoordinateLogUrl('');
    } catch (error) {
      setCoordinateLogStatus('error');
      setCoordinateLogMessage(error.message);
    }
  };

  return {
    activeGenre,
    coordinateLogMessage,
    coordinateLogStatus,
    coordinateLogUrl,
    handleGenreNodeClick,
    hasCoordinateFocus,
    isLogModalOpen,
    mapDescription,
    mapPositions,
    minimapViewport,
    openCoordinateLogModal,
    relatedCoordinateIds,
    resetCoordinateMap,
    selectedCoordinate,
    selectedCoordinateConcepts,
    selectedCoordinateId,
    selectedCoordinateQuestions,
    selectedCoordinateWorks,
    setCoordinateLogUrl,
    setIsLogModalOpen,
    setMapView,
    submitCoordinateLog,
    visibleConnections,
  };
}
