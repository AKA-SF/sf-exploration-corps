import { useEffect, useMemo, useRef, useState } from 'react';

const toneColors = {
  cyan: ['#19f7f1', '#075966', '#00131c'],
  blue: ['#7cc7ff', '#174f80', '#001226'],
  amber: ['#f0b85a', '#7d4b17', '#1e1002'],
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function nodeToPoint(node, time = 0) {
  const seed = node.renderSeed ?? getSeed(node.id);
  const driftA = time * (0.00036 + (seed % 5) * 0.000026) + seed;
  const driftB = time * (0.00028 + (seed % 7) * 0.000022) + seed * 0.37;

  if (node.center) {
    return {
      x: Math.sin(driftA) * 20,
      y: Math.cos(driftB) * 14,
      z: Math.sin(driftA * 0.72) * 34,
    };
  }

  const tier = node.tier ?? (node.secondary ? 2 : 1);
  const longitude = ((node.x / 100) * Math.PI * 2) - Math.PI + Math.sin(driftA * 0.16) * 0.05;
  const latitude = ((node.y / 100) - 0.5) * Math.PI * 0.92 + Math.cos(driftB * 0.14) * 0.035;
  const radius = tier === 2
    ? 430 + (node.orbit ?? 1) * 24 + (seed % 9) * 3
    : 360 + (node.orbit ?? 3) * 34 + (seed % 11) * 4;
  const breathing = Math.sin(driftA * 0.58) * (tier === 2 ? 20 : 28);

  return {
    x: Math.cos(latitude) * Math.cos(longitude) * (radius + breathing) + Math.sin(driftA) * 18,
    y: Math.sin(latitude) * (radius * 0.78 + breathing) + Math.cos(driftB) * 12,
    z: Math.cos(latitude) * Math.sin(longitude) * (radius + breathing) + Math.sin(driftB * 0.86) * 36,
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

function getMotionProfile() {
  if (typeof window === 'undefined') {
    return { compact: false, reduced: false };
  }

  return {
    compact: window.matchMedia('(max-width: 760px)').matches,
    reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  };
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

function drawSphereGuide(context, width, height, time, view) {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.36 * view.zoom;

  context.save();
  context.translate(centerX, centerY);
  context.globalCompositeOperation = 'lighter';

  const glow = context.createRadialGradient(0, 0, radius * 0.05, 0, 0, radius * 1.18);
  glow.addColorStop(0, 'rgba(25, 247, 241, 0.05)');
  glow.addColorStop(0.55, 'rgba(25, 247, 241, 0.018)');
  glow.addColorStop(1, 'rgba(25, 247, 241, 0)');
  context.fillStyle = glow;
  context.beginPath();
  context.arc(0, 0, radius * 1.16, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = 'rgba(25, 247, 241, 0.13)';
  context.lineWidth = 0.7;
  for (let index = 0; index < 4; index += 1) {
    const tilt = view.yaw * 0.35 + index * (Math.PI / 4) + time * 0.000015;
    context.beginPath();
    context.ellipse(0, 0, radius, radius * 0.28, tilt, 0, Math.PI * 2);
    context.stroke();
  }

  for (let index = -2; index <= 2; index += 1) {
    const lineRadius = radius * (1 - Math.abs(index) * 0.14);
    context.globalAlpha = 0.5 - Math.abs(index) * 0.08;
    context.beginPath();
    context.ellipse(0, index * radius * 0.22, lineRadius, lineRadius * 0.18, view.yaw * 0.14, 0, Math.PI * 2);
    context.stroke();
  }

  context.globalAlpha = 0.65;
  context.strokeStyle = 'rgba(240, 184, 90, 0.1)';
  context.beginPath();
  context.arc(0, 0, radius * 1.02, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}

function drawSignalCluster(context, planet, time) {
  const [light] = toneColors[planet.node.tone] ?? toneColors.cyan;
  const seed = planet.node.renderSeed ?? getSeed(planet.node.id);
  const isSecondary = planet.node.secondary;
  const count = isSecondary ? 2 : Math.min(12, 5 + (planet.node.signals ?? 8));
  const clusterRadius = planet.radius * (planet.selected ? 5.4 : isSecondary ? 2.8 : 4.1);

  context.save();
  context.globalCompositeOperation = 'lighter';
  for (let index = 0; index < count; index += 1) {
    const angle = seed * 0.19 + index * 2.399 + time * (0.00003 + (index % 4) * 0.000004);
    const distance = clusterRadius * (0.34 + ((seed + index * 17) % 100) / 140);
    const x = planet.x + Math.cos(angle) * distance;
    const y = planet.y + Math.sin(angle) * distance * 0.46;
    const alpha = planet.muted ? 0.08 : isSecondary ? 0.12 : 0.2 + (index % 5) * 0.045;
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

function quadraticPoint(start, control, end, progress) {
  const inverse = 1 - progress;
  return {
    x: inverse * inverse * start.x + 2 * inverse * progress * control.x + progress * progress * end.x,
    y: inverse * inverse * start.y + 2 * inverse * progress * control.y + progress * progress * end.y,
  };
}

function drawConnection(context, start, end, active, hasFocus, time, index) {
  const control = {
    x: (start.x + end.x) / 2 + (end.y - start.y) * 0.055,
    y: (start.y + end.y) / 2 - (end.x - start.x) * 0.055,
  };
  const dimmed = hasFocus && !active;
  const secondaryLink = start.node.secondary || end.node.secondary;
  const alpha = dimmed ? 0.12 : active ? 0.92 : secondaryLink ? 0.32 : 0.54;
  const stroke = active ? 'rgba(240, 184, 90, 0.9)' : 'rgba(25, 247, 241, 0.68)';

  context.save();
  context.globalCompositeOperation = 'lighter';
  context.strokeStyle = stroke;
  context.lineWidth = active ? 2.2 : secondaryLink ? 0.72 : 1.15;
  context.globalAlpha = alpha * 0.38;
  context.setLineDash([]);
  context.beginPath();
  context.moveTo(start.x, start.y);
  context.quadraticCurveTo(control.x, control.y, end.x, end.y);
  context.stroke();

  context.globalAlpha = alpha;
  context.lineWidth = active ? 1.15 : secondaryLink ? 0.48 : 0.72;
  context.setLineDash(active ? [12, 10] : [4, 9]);
  context.lineDashOffset = -time * 0.018 - index * 7;
  context.beginPath();
  context.moveTo(start.x, start.y);
  context.quadraticCurveTo(control.x, control.y, end.x, end.y);
  context.stroke();

  const packetCount = active ? 2 : secondaryLink ? 0 : 1;
  for (let packet = 0; packet < packetCount; packet += 1) {
    const progress = ((time * (active ? 0.00018 : 0.00011)) + packet / packetCount + index * 0.067) % 1;
    const point = quadraticPoint(start, control, end, progress);
    context.globalAlpha = dimmed ? 0.18 : active ? 0.92 : 0.62;
    context.fillStyle = active ? '#f0b85a' : '#dffcff';
    context.shadowColor = active ? '#f0b85a' : '#19f7f1';
    context.shadowBlur = active ? 16 : 10;
    context.beginPath();
    context.arc(point.x, point.y, active ? 2.1 : 1.45, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function drawPlanet(context, planet) {
  const [light, mid, dark] = toneColors[planet.node.tone] ?? toneColors.cyan;
  const isSecondary = planet.node.secondary;
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
  context.strokeStyle = planet.selected ? 'rgba(240, 184, 90, 0.9)' : isSecondary ? 'rgba(25, 247, 241, 0.16)' : 'rgba(25, 247, 241, 0.28)';
  context.lineWidth = planet.selected ? 1.6 : isSecondary ? 0.55 : 0.8;
  context.beginPath();
  context.ellipse(planet.x, planet.y, planet.radius * (isSecondary ? 1.72 : 2.25), planet.radius * (isSecondary ? 0.34 : 0.44), -0.2, 0, Math.PI * 2);
  context.stroke();

  const shouldLabel = planet.selected || planet.related || !isSecondary;
  if (!shouldLabel) {
    context.restore();
    return;
  }

  context.fillStyle = planet.selected ? '#ffffff' : 'rgba(232, 251, 255, 0.9)';
  context.font = `${planet.selected ? 800 : 700} ${planet.selected ? 13 : isSecondary ? 9 : 10}px system-ui, sans-serif`;
  context.fillText(planet.node.label, planet.x + planet.radius + 10, planet.y - 3);
  context.fillStyle = planet.selected ? 'rgba(240, 184, 90, 0.86)' : 'rgba(136, 219, 225, 0.78)';
  context.font = '9px "Courier New", monospace';
  if (!isSecondary || planet.selected) {
    context.fillText(planet.node.en, planet.x + planet.radius + 10, planet.y + 11);
  }
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
  const seedsRef = useRef(null);
  const lastFrameRef = useRef(0);
  const sizeRef = useRef({ height: 0, ratio: 1, width: 0 });
  const [view, setView] = useState({ yaw: -0.24, pitch: 0.18, zoom: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [isRenderable, setIsRenderable] = useState(true);
  const [motionProfile, setMotionProfile] = useState(getMotionProfile);
  const renderNodes = useMemo(() => (
    nodes.map(node => ({
      ...node,
      renderSeed: getSeed(node.id),
    }))
  ), [nodes]);

  useEffect(() => {
    onViewChange?.(view);
  }, [onViewChange, view]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = canvas?.parentElement;
    if (!canvas || !wrapper) return undefined;

    const updateSize = () => {
      const rect = wrapper.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = Math.floor(rect.width * ratio);
      const height = Math.floor(rect.height * ratio);
      sizeRef.current = { width: rect.width, height: rect.height, ratio };
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
    };

    updateSize();

    if ('ResizeObserver' in window) {
      const observer = new ResizeObserver(updateSize);
      observer.observe(wrapper);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

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
    if (typeof window === 'undefined') return undefined;

    const compactQuery = window.matchMedia('(max-width: 760px)');
    const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateProfile = () => {
      seedsRef.current = null;
      setMotionProfile(getMotionProfile());
    };

    compactQuery.addEventListener('change', updateProfile);
    reducedQuery.addEventListener('change', updateProfile);

    return () => {
      compactQuery.removeEventListener('change', updateProfile);
      reducedQuery.removeEventListener('change', updateProfile);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const wrapper = canvas.parentElement;
    if (!wrapper || !('IntersectionObserver' in window)) return undefined;

    let isIntersecting = true;
    const updateRenderable = () => {
      setIsRenderable(isIntersecting && !document.hidden);
    };

    const observer = new IntersectionObserver(([entry]) => {
      isIntersecting = entry?.isIntersecting ?? true;
      updateRenderable();
    }, {
      rootMargin: '180px 0px',
      threshold: 0.01,
    });

    observer.observe(wrapper);
    document.addEventListener('visibilitychange', updateRenderable);

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', updateRenderable);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isRenderable) return undefined;
    const context = canvas.getContext('2d');
    if (!seedsRef.current) {
      const seedCount = motionProfile.reduced ? 28 : motionProfile.compact ? 42 : 72;
      seedsRef.current = {
        starSeeds: Array.from({ length: seedCount }, (_, index) => ({
          x: ((index * 73) % 997) / 997,
          y: ((index * 151) % 991) / 991,
          r: 0.4 + (index % 5) * 0.16,
          a: 0.18 + (index % 7) * 0.07,
          tint: index % 13 === 0 ? '#f0b85a' : index % 5 === 0 ? '#7cc7ff' : '#ffffff',
        })),
        dustSeeds: Array.from({ length: seedCount }, (_, index) => ({
          progress: ((index * 37) % 239) / 239,
          angle: ((index * 83) % 360) * (Math.PI / 180),
          scale: 0.7 + (index % 13) * 0.03,
          tint: index % 7 === 0 ? '#f0b85a' : '#dffcff',
          alpha: 0.02 + (index % 6) * 0.01,
          size: 0.25 + (index % 4) * 0.14,
        })),
      };
    }

    const { dustSeeds, starSeeds } = seedsRef.current;
    const frameInterval = motionProfile.reduced ? 96 : motionProfile.compact ? 48 : 32;
    const autoYawScale = motionProfile.reduced ? 0 : motionProfile.compact ? 0.55 : 1;

    const render = time => {
      if (time - lastFrameRef.current < frameInterval) {
        animationRef.current = requestAnimationFrame(render);
        return;
      }
      lastFrameRef.current = time;

      const { height, ratio, width } = sizeRef.current;
      if (!width || !height) {
        animationRef.current = requestAnimationFrame(render);
        return;
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      drawAtlasBackground(context, width, height, time, starSeeds, dustSeeds);
      drawSphereGuide(context, width, height, time, view);

      const autoYaw = view.yaw + Math.sin(time * 0.0001) * 0.065 * autoYawScale;
      const autoPitch = view.pitch + Math.cos(time * 0.00008) * 0.032 * autoYawScale;
      const projectedNodes = renderNodes.map(node => {
        const rotated = rotatePoint(nodeToPoint(node, time), autoYaw, autoPitch);
        const projected = project(rotated, width, height, view.zoom);
        const selected = selectedId === node.id;
        const related = relatedIds?.has(node.id);
        const muted = hasFocus && !selected && !related;
        const radius = selected
          ? 15
          : node.secondary
            ? 3.8 + node.orbit * 0.7
            : 7 + node.orbit * 1.55;
        return {
          node,
          selected,
          related,
          muted,
          x: projected.x,
          y: projected.y,
          z: rotated.z,
          radius: radius * projected.depth,
          alpha: muted ? 0.18 : clamp(0.58 + projected.depth * 0.28, 0.5, 0.95),
        };
      });

      projectedNodes
        .sort((a, b) => a.z - b.z)
        .forEach(planet => drawSignalCluster(context, planet, time));

      const nodeMap = new Map(projectedNodes.map(item => [item.node.id, item]));
      connections.forEach(([from, to], index) => {
        const start = nodeMap.get(from);
        const end = nodeMap.get(to);
        if (!start || !end) return;
        const active = selectedId && (from === selectedId || to === selectedId);
        drawConnection(context, start, end, active, hasFocus, time, index);
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
  }, [connections, hasFocus, isRenderable, motionProfile, relatedIds, renderNodes, selectedId, view]);

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
