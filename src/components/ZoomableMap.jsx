import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const distance = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

const midpoint = (a, b) => ({
  clientX: (a.clientX + b.clientX) / 2,
  clientY: (a.clientY + b.clientY) / 2,
});

export const ZoomableMap = forwardRef(({
  children,
  width = 3000,
  height = 2000,
  minScale = 0.45,
  maxScale = 4,
  initialScale = 1,
  className = '',
  contentClassName = '',
  onCameraChange,
}, ref) => {
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const frameRef = useRef(null);
  const inertiaRef = useRef(null);
  const pointersRef = useRef(new Map());
  const dragRef = useRef({
    active: false,
    moved: false,
    x: 0,
    y: 0,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    lastTime: 0,
    vx: 0,
    vy: 0,
  });
  const pinchRef = useRef(null);
  const suppressClickRef = useRef(false);
  const targetRef = useRef({ x: 0, y: 0, scale: initialScale });
  const cameraRef = useRef({ x: 0, y: 0, scale: initialScale });
  const onCameraChangeRef = useRef(onCameraChange);
  const cameraStepRef = useRef(null);
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: initialScale });

  useEffect(() => {
    onCameraChangeRef.current = onCameraChange;
  }, [onCameraChange]);

  const isSameCamera = useCallback((a, b) => (
    Math.abs(a.x - b.x) < 0.001 &&
    Math.abs(a.y - b.y) < 0.001 &&
    Math.abs(a.scale - b.scale) < 0.0001
  ), []);

  const publishCamera = useCallback((next) => {
    cameraRef.current = next;
    setCamera(previous => (isSameCamera(previous, next) ? previous : next));
    onCameraChangeRef.current?.(next);
  }, [isSameCamera]);

  const scheduleCameraFrame = useCallback(() => {
    if (frameRef.current) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      cameraStepRef.current?.();
    });
  }, []);

  const boundsFor = useCallback((scale) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };

    const excessX = Math.max(0, width * scale - rect.width);
    const excessY = Math.max(0, height * scale - rect.height);
    return {
      x: excessX / 2 + rect.width * 0.42,
      y: excessY / 2 + rect.height * 0.42,
    };
  }, [height, width]);

  const normalize = useCallback((next) => {
    const scale = clamp(next.scale, minScale, maxScale);
    const bounds = boundsFor(scale);
    return {
      x: clamp(next.x, -bounds.x, bounds.x),
      y: clamp(next.y, -bounds.y, bounds.y),
      scale,
    };
  }, [boundsFor, maxScale, minScale]);

  const setTarget = useCallback((next) => {
    const normalized = normalize({ ...targetRef.current, ...next });
    if (isSameCamera(targetRef.current, normalized)) return;
    targetRef.current = normalized;
    scheduleCameraFrame();
  }, [isSameCamera, normalize, scheduleCameraFrame]);

  const setCameraImmediate = useCallback((next) => {
    const normalized = normalize({ ...targetRef.current, ...next });
    targetRef.current = normalized;
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    publishCamera(normalized);
  }, [normalize, publishCamera]);

  const zoomAt = useCallback((point, nextScale) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const current = targetRef.current;
    const baseLeft = rect.width / 2 - width / 2;
    const baseTop = rect.height / 2 - height / 2;
    const localX = (point.clientX - rect.left - baseLeft - current.x) / current.scale;
    const localY = (point.clientY - rect.top - baseTop - current.y) / current.scale;
    const scale = clamp(nextScale, minScale, maxScale);

    setTarget({
      scale,
      x: point.clientX - rect.left - baseLeft - localX * scale,
      y: point.clientY - rect.top - baseTop - localY * scale,
    });
  }, [height, maxScale, minScale, setTarget, width]);

  const focusWorldPoint = useCallback(({ x, y, scale = targetRef.current.scale, immediate = false }) => {
    const nextCamera = {
      x: width / 2 - x * scale,
      y: height / 2 - y * scale,
      scale,
    };

    if (immediate) {
      setCameraImmediate(nextCamera);
      return;
    }

    setTarget(nextCamera);
  }, [height, setCameraImmediate, setTarget, width]);

  const zoomBy = useCallback((factor) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    zoomAt({
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
    }, targetRef.current.scale * factor);
  }, [zoomAt]);

  const panBy = useCallback((dx, dy) => {
    setTarget({
      x: targetRef.current.x + dx,
      y: targetRef.current.y + dy,
    });
  }, [setTarget]);

  const resetView = useCallback(() => {
    setTarget({ x: 0, y: 0, scale: initialScale });
  }, [initialScale, setTarget]);

  useImperativeHandle(ref, () => ({
    focusWorldPoint,
    zoomBy,
    panBy,
    resetView,
    setCamera: setTarget,
  }), [focusWorldPoint, panBy, resetView, setTarget, zoomBy]);

  const stopInertia = useCallback(() => {
    if (inertiaRef.current) cancelAnimationFrame(inertiaRef.current);
    inertiaRef.current = null;
  }, []);

  const startInertia = useCallback((vx, vy) => {
    stopInertia();
    let velocityX = vx * 16;
    let velocityY = vy * 16;

    const coast = () => {
      velocityX *= 0.92;
      velocityY *= 0.92;
      if (Math.hypot(velocityX, velocityY) < 0.08) {
        inertiaRef.current = null;
        return;
      }

      setTarget({
        x: targetRef.current.x + velocityX,
        y: targetRef.current.y + velocityY,
      });
      inertiaRef.current = requestAnimationFrame(coast);
    };

    inertiaRef.current = requestAnimationFrame(coast);
  }, [setTarget, stopInertia]);

  useEffect(() => {
    cameraStepRef.current = () => {
      const current = cameraRef.current;
      const target = targetRef.current;
      const eased = {
        x: current.x + (target.x - current.x) * 0.2,
        y: current.y + (target.y - current.y) * 0.2,
        scale: current.scale + (target.scale - current.scale) * 0.18,
      };
      const isAtRest =
        Math.abs(eased.x - target.x) < 0.02 &&
        Math.abs(eased.y - target.y) < 0.02 &&
        Math.abs(eased.scale - target.scale) < 0.0005;

      const next = isAtRest
        ? target
        : eased;

      if (!isSameCamera(current, next)) {
        publishCamera(next);
      }

      if (!isAtRest) {
        scheduleCameraFrame();
      }
    };

    scheduleCameraFrame();
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      cameraStepRef.current = null;
      stopInertia();
    };
  }, [isSameCamera, publishCamera, scheduleCameraFrame, stopInertia]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return undefined;

    const handleWheel = (event) => {
      event.preventDefault();
      const delta = -event.deltaY;
      const zoomFactor = Math.exp(delta * 0.0014);
      zoomAt(event, targetRef.current.scale * zoomFactor);
    };

    element.addEventListener('wheel', handleWheel, { passive: false });
    return () => element.removeEventListener('wheel', handleWheel);
  }, [zoomAt]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const target = event.target;
      if (target?.closest?.('input, textarea, select, [contenteditable="true"]')) return;

      const step = event.shiftKey ? 180 : 92;
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
        event.preventDefault();
        panBy(step, 0);
      }
      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
        event.preventDefault();
        panBy(-step, 0);
      }
      if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') {
        event.preventDefault();
        panBy(0, step);
      }
      if (event.key === 'ArrowDown' || event.key.toLowerCase() === 's') {
        event.preventDefault();
        panBy(0, -step);
      }
      if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        zoomBy(1.16);
      }
      if (event.key === '-' || event.key === '_') {
        event.preventDefault();
        zoomBy(0.86);
      }
      if (event.key === '0') {
        event.preventDefault();
        resetView();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [panBy, resetView, zoomBy]);

  const handlePointerDown = (event) => {
    if (event.button !== undefined && event.button !== 0) return;

    event.currentTarget.setPointerCapture?.(event.pointerId);
    pointersRef.current.set(event.pointerId, event);
    stopInertia();

    if (pointersRef.current.size === 1) {
      dragRef.current = {
        active: true,
        moved: false,
        x: targetRef.current.x,
        y: targetRef.current.y,
        startX: event.clientX,
        startY: event.clientY,
        lastX: event.clientX,
        lastY: event.clientY,
        lastTime: performance.now(),
        vx: 0,
        vy: 0,
      };
      pinchRef.current = null;
    }

    if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()];
      pinchRef.current = {
        distance: Math.max(distance(a, b), 1),
        scale: targetRef.current.scale,
      };
      dragRef.current.active = false;
    }
  };

  const handlePointerMove = (event) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, event);

    if (pointersRef.current.size === 2 && pinchRef.current) {
      event.preventDefault();
      const [a, b] = [...pointersRef.current.values()];
      const nextDistance = Math.max(distance(a, b), 1);
      const nextScale = pinchRef.current.scale * (nextDistance / pinchRef.current.distance);
      zoomAt(midpoint(a, b), nextScale);
      return;
    }

    const drag = dragRef.current;
    if (!drag.active || pointersRef.current.size !== 1) return;

    event.preventDefault();
    const now = performance.now();
    const dt = Math.max(now - drag.lastTime, 1);
    const dx = event.clientX - drag.lastX;
    const dy = event.clientY - drag.lastY;
    const totalDx = event.clientX - drag.startX;
    const totalDy = event.clientY - drag.startY;
    if (Math.hypot(totalDx, totalDy) > 6) drag.moved = true;
    drag.vx = dx / dt;
    drag.vy = dy / dt;
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    drag.lastTime = now;

    setTarget({
      x: targetRef.current.x + dx,
      y: targetRef.current.y + dy,
    });
  };

  const handlePointerUp = (event) => {
    pointersRef.current.delete(event.pointerId);
    event.currentTarget.releasePointerCapture?.(event.pointerId);

    if (pointersRef.current.size < 2) pinchRef.current = null;

    const drag = dragRef.current;
    if (drag.active) {
      if (drag.moved) suppressClickRef.current = true;
      drag.active = false;
      startInertia(drag.vx, drag.vy);
    }
  };

  const handleClickCapture = (event) => {
    if (!suppressClickRef.current) return;
    suppressClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  const renderedChildren = typeof children === 'function' ? children(camera) : children;

  return (
    <div
      ref={containerRef}
      className={`zoomable-container ${className}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onLostPointerCapture={handlePointerUp}
      onClickCapture={handleClickCapture}
    >
      <div
        ref={contentRef}
        className={`zoomable-canvas ${contentClassName}`}
        style={{
          width,
          height,
          transform: `translate3d(${camera.x}px, ${camera.y}px, 0) scale(${camera.scale})`,
          left: `calc(50% - ${width / 2}px)`,
          top: `calc(50% - ${height / 2}px)`,
        }}
      >
        {renderedChildren}
      </div>
    </div>
  );
});

ZoomableMap.displayName = 'ZoomableMap';
