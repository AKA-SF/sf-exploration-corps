import { useEffect, useRef, useState } from 'react';

const toneColors = {
  cyan: ['#19f7f1', '#075966', '#00131c'],
  blue: ['#7cc7ff', '#174f80', '#001226'],
  amber: ['#f0b85a', '#7d4b17', '#1e1002'],
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function nodeToPoint(node, time = 0) {
  const seed = node.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const driftA = time * (0.00016 + (seed % 5) * 0.000012) + seed;
  const driftB = time * (0.00012 + (seed % 7) * 0.00001) + seed * 0.37;
  return {
    x: (node.x - 50) * 18 + Math.sin(driftA) * 20,
    y: (node.y - 50) * 12 + Math.cos(driftB) * 14,
    z: Math.sin(seed * 0.41) * 260 + Math.cos(seed * 0.17) * 110 + Math.sin(driftA * 0.78) * 42,
  };
}

function rotatePoint(point, yaw, pitch) {
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  const cosX = Math.cos(pitch);
  const sinX = Math.sin(pitch);
  const x = point.x * cosY - point.z * sinY;
  const z = point.x * sinY + point.z * cosY;
  return {
    x,
    y: point.y * cosX - z * sinX,
    z: point.y * sinX + z * cosX,
  };
}

function project(point, width, height, zoom) {
  const cameraDistance = 1380;
  const depth = cameraDistance / (cameraDistance + point.z);
  return {
    x: width / 2 + point.x * depth * zoom,
    y: height / 2 + point.y * depth * zoom,
    depth,
  };
}

function getSeed(id) {
  return id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function drawAtlasBackground(context, width, height, time, starSeeds, dustSeeds) {
  const background = context.createRadialGradient(width * 0.48, height * 0.47, 60, width * 0.48, height * 0.47, width * 0.76);
  background.addColorStop(0, 'rgba(25, 247, 241, 0.1)');
  background.addColorStop(0.42, 'rgba(2, 18, 28, 0.82)');
  background.addColorStop(1, 'rgba(0, 3, 8, 1)');
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  context.save();
  context.translate(width * 0.5, height * 0.5);
  context.rotate(-0.18 + time * 0.000004);
  context.globalCompositeOperation = 'lighter';

  dustSeeds.forEach((dust, index) => {
    const radius = Math.sqrt(dust.progress) * Math.min(width, height) * 0.54 * dust.scale;
    const angle = dust.angle + time * (0.000006 + (index % 5) * 0.000001);
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius * 0.42;
    context.globalAlpha = dust.alpha;
    context.fillStyle = dust.tint;
    context.beginPath();
    context.arc(x, y, dust.size, 0, Math.PI * 2);
    context.fill();
  });

  const atlasGlow = context.createRadialGradient(0, 0, 30, 0, 0, Math.min(width, height) * 0.58);
  atlasGlow.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
  atlasGlow.addColorStop(0.26, 'rgba(25, 247, 241, 0.065)');
  atlasGlow.addColorStop(0.72, 'rgba(124, 199, 255, 0.025)');
  atlasGlow.addColorStop(1, 'rgba(25, 247, 241, 0)');
  context.fillStyle = atlasGlow;
  context.beginPath();
  context.ellipse(0, 0, width * 0.48, height * 0.2, 0, 0, Math.PI * 2);
  context.fill();
  context.restore();

  starSeeds.forEach(star => {
    const twinkle = Math.sin(time * 0.001 + star.x * 12.7 + star.y * 9.2) * 0.08;
    context.globalAlpha = star.a + twinkle;
    context.fillStyle = star.tint;
    context.beginPath();
    context.arc(star.x * width, star.y * height, star.r, 0, Math.PI * 2);
    context.fill();
  });
  context.globalAlpha = 1;
}

function drawSignalCluster(context, planet, time) {
  const [light] = toneColors[planet.node.tone] ?? toneColors.cyan;
  const seed = getSeed(planet.node.id);
  const count = Math.min(18, 7 + (planet.node.signals ?? 8));
  const clusterRadius = planet.radius * (planet.selected ? 5.4 : 4.1);

  context.save();
  context.globalCompositeOperation = 'lighter';
  for (let index = 0; index < count; index += 1) {
    const angle = seed * 0.19 + index * 2.399 + time * (0.00003 + (index % 4) * 0.000004);
    const distance = clusterRadius * (0.34 + ((seed + index * 17) % 100) / 140);
    const x = planet.x + Math.cos(angle) * distance;
    const y = planet.y + Math.sin(angle) * distance * 0.46;
    const alpha = planet.muted ? 0.08 : 0.2 + (index % 5) * 0.045;
    context.globalAlpha = alpha * planet.alpha;
    context.fillStyle = index % 4 === 0 ? light : '#dffcff';
    context.beginPath();
    context.arc(x, y, index % 6 === 0 ? 1.35 : 0.72, 0, Math.PI * 2);
    context.fill();
  }

  context.globalAlpha = planet.muted ? 0.05 : 0.18;
  context.strokeStyle = light;
  context.lineWidth = 0.7;
  context.beginPath();
  context.ellipse(planet.x, planet.y, clusterRadius * 0.88, clusterRadius * 0.32, -0.16, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}

function drawPlanet(context, planet) {
  const [light, mid, dark] = toneColors[planet.node.tone] ?? toneColors.cyan;
  const gradient = context.createRadialGradient(
    planet.x - planet.radius * 0.35,
    planet.y - planet.radius * 0.42,
    2,
    planet.x,
    planet.y,
    planet.radius,
  );
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.18, light);
  gradient.addColorStop(0.58, mid);
  gradient.addColorStop(1, dark);

  context.save();
  context.globalAlpha = planet.alpha;
  context.shadowColor = light;
  context.shadowBlur = planet.selected ? 30 : 14;
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(planet.x, planet.y, planet.radius, 0, Math.PI * 2);
  context.fill();

  context.shadowBlur = 0;
  context.strokeStyle = planet.selected ? 'rgba(240, 184, 90, 0.9)' : 'rgba(25, 247, 241, 0.28)';
  context.lineWidth = planet.selected ? 1.6 : 0.8;
  context.beginPath();
  context.ellipse(planet.x, planet.y, planet.radius * 2.25, planet.radius * 0.44, -0.2, 0, Math.PI * 2);
  context.stroke();

  context.fillStyle = planet.selected ? '#ffffff' : 'rgba(232, 251, 255, 0.9)';
  context.font = `${planet.selected ? 800 : 700} ${planet.selected ? 13 : 10}px system-ui, sans-serif`;
  context.fillText(planet.node.label, planet.x + planet.radius + 10, planet.y - 3);
  context.fillStyle = planet.selected ? 'rgba(240, 184, 90, 0.86)' : 'rgba(136, 219, 225, 0.78)';
  context.font = '9px "Courier New", monospace';
  context.fillText(planet.node.en, planet.x + planet.radius + 10, planet.y + 11);
  context.restore();
}

export default function CoordinateUniverse({
  activeGenre,
  className = '',
  connections,
  hasFocus,
  nodes,
  onNodeSelect,
  onReset,
  onViewChange,
  relatedIds,
  selectedId,
}) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const hitPlanetsRef = useRef([]);
  const dragRef = useRef(null);
  const [view, setView] = useState({ yaw: -0.24, pitch: 0.18, zoom: 1 });
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    onViewChange?.(view);
  }, [onViewChange, view]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = canvas?.parentElement;
    if (!wrapper) return undefined;

    const preventPageWheel = event => {
      event.preventDefault();
      event.stopPropagation();
      setView(current => ({
        ...current,
        zoom: clamp(Number((current.zoom + (event.deltaY > 0 ? -0.08 : 0.08)).toFixed(2)), 0.65, 1.8),
      }));
    };

    wrapper.addEventListener('wheel', preventPageWheel, { passive: false });
    return () => wrapper.removeEventListener('wheel', preventPageWheel);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const context = canvas.getContext('2d');
    const starSeeds = Array.from({ length: 120 }, (_, index) => ({
      x: ((index * 73) % 997) / 997,
      y: ((index * 151) % 991) / 991,
      r: 0.4 + (index % 5) * 0.18,
      a: 0.2 + (index % 7) * 0.08,
      tint: index % 13 === 0 ? '#f0b85a' : index % 5 === 0 ? '#7cc7ff' : '#ffffff',
    }));
    const dustSeeds = Array.from({ length: 160 }, (_, index) => ({
      progress: ((index * 37) % 239) / 239,
      angle: ((index * 83) % 360) * (Math.PI / 180),
      scale: 0.7 + (index % 13) * 0.03,
      tint: index % 7 === 0 ? '#f0b85a' : '#dffcff',
      alpha: 0.025 + (index % 6) * 0.012,
      size: 0.28 + (index % 4) * 0.16,
    }));

    const render = time => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      if (canvas.width !== Math.floor(rect.width * ratio) || canvas.height !== Math.floor(rect.height * ratio)) {
        canvas.width = Math.floor(rect.width * ratio);
        canvas.height = Math.floor(rect.height * ratio);
      }

      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const width = rect.width;
      const height = rect.height;
      context.clearRect(0, 0, width, height);
      drawAtlasBackground(context, width, height, time, starSeeds, dustSeeds);

      const projectedNodes = nodes.map(node => {
        const autoYaw = view.yaw + Math.sin(time * 0.00006) * 0.028;
        const autoPitch = view.pitch + Math.cos(time * 0.00005) * 0.014;
        const rotated = rotatePoint(nodeToPoint(node, time), autoYaw, autoPitch);
        const projected = project(rotated, width, height, view.zoom);
        const selected = selectedId === node.id;
        const related = relatedIds?.has(node.id);
        const muted = hasFocus && !selected && !related;
        return {
          node,
          selected,
          related,
          muted,
          x: projected.x,
          y: projected.y,
          z: rotated.z,
          radius: (selected ? 15 : 7 + node.orbit * 1.55) * projected.depth,
          alpha: muted ? 0.18 : clamp(0.58 + projected.depth * 0.28, 0.5, 0.95),
        };
      });

      projectedNodes
        .sort((a, b) => a.z - b.z)
        .forEach(planet => drawSignalCluster(context, planet, time));

      const nodeMap = new Map(projectedNodes.map(item => [item.node.id, item]));
      connections.forEach(([from, to]) => {
        const start = nodeMap.get(from);
        const end = nodeMap.get(to);
        if (!start || !end) return;
        const active = selectedId && (from === selectedId || to === selectedId);
        context.save();
        context.globalAlpha = hasFocus && !active ? 0.08 : active ? 0.74 : 0.24;
        context.strokeStyle = active ? 'rgba(240, 184, 90, 0.82)' : 'rgba(25, 247, 241, 0.44)';
        context.lineWidth = active ? 1.25 : 0.55;
        context.setLineDash(active ? [] : [2, 7]);
        context.beginPath();
        const midX = (start.x + end.x) / 2 + (end.y - start.y) * 0.03;
        const midY = (start.y + end.y) / 2 - (end.x - start.x) * 0.03;
        context.moveTo(start.x, start.y);
        context.quadraticCurveTo(midX, midY, end.x, end.y);
        context.stroke();
        context.restore();
      });

      projectedNodes
        .sort((a, b) => a.z - b.z)
        .forEach(planet => drawPlanet(context, planet));

      hitPlanetsRef.current = projectedNodes
        .map(planet => ({ ...planet, hitRadius: Math.max(24, planet.radius + 12) }))
        .sort((a, b) => b.z - a.z);

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationRef.current);
  }, [connections, hasFocus, nodes, relatedIds, selectedId, view]);

  const zoom = amount => {
    setView(current => ({ ...current, zoom: clamp(Number((current.zoom + amount).toFixed(2)), 0.65, 1.8) }));
  };

  const handlePointerDown = event => {
    if (event.target.closest('button')) return;
    dragRef.current = { x: event.clientX, y: event.clientY, yaw: view.yaw, pitch: view.pitch, moved: false };
    setIsDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = event => {
    if (!dragRef.current) return;
    const deltaX = event.clientX - dragRef.current.x;
    const deltaY = event.clientY - dragRef.current.y;
    if (Math.abs(deltaX) + Math.abs(deltaY) > 4) dragRef.current.moved = true;
    setView(current => ({
      ...current,
      yaw: dragRef.current.yaw + deltaX * 0.006,
      pitch: clamp(dragRef.current.pitch + deltaY * 0.004, -0.58, 0.58),
    }));
  };

  const handlePointerUp = event => {
    const drag = dragRef.current;
    dragRef.current = null;
    setIsDragging(false);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    if (drag?.moved) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const target = hitPlanetsRef.current.find(planet => Math.hypot(planet.x - x, planet.y - y) <= planet.hitRadius);
    if (target) onNodeSelect(target.node);
  };

  const handleWheel = event => {
    event.preventDefault();
    event.stopPropagation();
    zoom(event.deltaY > 0 ? -0.08 : 0.08);
  };

  return (
    <div
      className={`coordinate-universe ${className} ${isDragging ? 'is-dragging' : ''}`}
      onPointerCancel={handlePointerUp}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
    >
      <canvas ref={canvasRef} />
      <div className="map-zoom-controls" aria-label="탐사 좌표 확대 축소">
        <button type="button" onClick={onReset}>ROOT</button>
        <button type="button" onClick={() => zoom(0.08)}>+</button>
        <button type="button" onClick={() => setView({ yaw: -0.24, pitch: 0.18, zoom: 1 })}>100</button>
        <button type="button" onClick={() => zoom(-0.08)}>-</button>
      </div>
      {activeGenre && (
        <button className="map-back-button" type="button" onClick={onReset}>
          상위 좌표로 돌아가기
        </button>
      )}
      <div className="map-hud map-hud-top">
        <span>{activeGenre ? '3D SUB-SECTOR' : '3D SECTOR'}</span>
        <strong>{activeGenre ? activeGenre.en : 'DEEP SPACE CARTOGRAPHY'}</strong>
      </div>
      <div className="map-hud map-hud-bottom">
        <span>CAMERA</span>
        <strong>DRAG ORBIT / WHEEL ZOOM</strong>
      </div>
    </div>
  );
}
