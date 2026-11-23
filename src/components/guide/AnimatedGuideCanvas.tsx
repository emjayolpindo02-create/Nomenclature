import React, { useEffect, useRef, useState } from 'react';
import guidePhotoUrl from '../../assets/guide-photo.jpg';
import { useGuide } from '../../context/GuideContext';
import {
  CLOSED_MOUTH_POSE,
  sampleFaceLifeState,
  sampleMouthAnimation,
} from '../../engine/guideSpeechTimeline';
import { renderAnimatedGuideFrame } from '../../engine/faceMeshWarp';
import { stripOuterCheckerboard } from '../../utils/avatarCutout';

interface AnimatedGuideCanvasProps {
  dimension?: number;
  paused?: boolean;
}

export const AnimatedGuideCanvas: React.FC<AnimatedGuideCanvasProps> = ({
  dimension = 148,
  paused = false,
}) => {
  const {
    guideSettings,
    visualState,
    effectiveAnimationMode,
    speechTimingRef,
    setActiveWordIndex,
  } = useGuide();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const preparedBitmapRef = useRef<HTMLCanvasElement | null>(null);
  const [imageReady, setImageReady] = useState(false);
  const [canvasFailed, setCanvasFailed] = useState(false);

  const lastReportedWordRef = useRef<number>(-1);

  // Load bundled photo locally once into an offscreen canvas with transparent cutout
  useEffect(() => {
    let active = true;
    const img = new Image();
    img.onload = () => {
      if (!active) return;
      try {
        const w = img.naturalWidth || 148;
        const h = img.naturalHeight || 148;
        const offscreen = document.createElement('canvas');
        offscreen.width = w;
        offscreen.height = h;
        const octx = offscreen.getContext('2d');
        if (octx) {
          octx.drawImage(img, 0, 0, w, h);
          const data = octx.getImageData(0, 0, w, h);
          stripOuterCheckerboard(data.data, w, h);
          octx.putImageData(data, 0, 0);
          preparedBitmapRef.current = offscreen;
          setImageReady(true);
        } else {
          setCanvasFailed(true);
        }
      } catch {
        setCanvasFailed(true);
      }
    };
    img.onerror = () => {
      if (active) setCanvasFailed(true);
    };
    img.src = guidePhotoUrl;
    return () => {
      active = false;
    };
  }, []);

  // Capped ~30fps animation loop that auto-pauses when hidden or tab is in background
  useEffect(() => {
    if (!imageReady || canvasFailed || paused || effectiveAnimationMode === 'still') {
      // Still render one static frame if canvas is ready and still mode is active
      if (imageReady && !canvasFailed && canvasRef.current && preparedBitmapRef.current) {
        try {
          const ctx = canvasRef.current.getContext('2d');
          const bmp = preparedBitmapRef.current;
          if (ctx) {
            ctx.clearRect(0, 0, dimension, dimension);
            ctx.drawImage(bmp, 0, 0, dimension, dimension);
          }
        } catch {
          setCanvasFailed(true);
        }
      }
      return;
    }

    let rafId = 0;
    let lastDrawTime = 0;
    const frameIntervalMs = 1000 / 30; // Cap at 30fps for low-end mobile phones

    const tick = (nowMs: number) => {
      rafId = window.requestAnimationFrame(tick);
      if (typeof document !== 'undefined' && document.hidden) return;
      if (nowMs - lastDrawTime < frameIntervalMs) return;
      lastDrawTime = nowMs;

      const timing = speechTimingRef.current;
      const elapsedMs = timing.isSpeaking ? Math.max(0, nowMs - timing.startTimeMs) : 0;
      const sample = sampleMouthAnimation(timing.timeline, elapsedMs, {
        isSpeaking: timing.isSpeaking,
        boundaryWordIndex: timing.boundaryWordIndex,
        msSinceLastBoundary: nowMs - timing.lastBoundaryAtMs,
      });

      if (sample.activeWordIndex !== lastReportedWordRef.current) {
        lastReportedWordRef.current = sample.activeWordIndex;
        setActiveWordIndex(sample.activeWordIndex);
      }

      const life = sampleFaceLifeState(nowMs, visualState, false);
      const canvas = canvasRef.current;
      const bmp = preparedBitmapRef.current;
      if (!canvas || !bmp) return;

      try {
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setCanvasFailed(true);
          return;
        }
        if (effectiveAnimationMode === 'simple') {
          ctx.clearRect(0, 0, dimension, dimension);
          ctx.drawImage(bmp, 0, 0, dimension, dimension);
          return;
        }
        renderAnimatedGuideFrame(
          ctx,
          bmp,
          bmp.width,
          bmp.height,
          dimension,
          dimension,
          guideSettings.calibration,
          timing.isSpeaking ? sample.pose : CLOSED_MOUTH_POSE,
          life
        );
      } catch {
        setCanvasFailed(true);
      }
    };

    rafId = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [
    imageReady,
    canvasFailed,
    paused,
    dimension,
    effectiveAnimationMode,
    guideSettings.calibration,
    visualState,
    speechTimingRef,
    setActiveWordIndex,
  ]);

  const ringClass =
    visualState === 'talking'
      ? 'ring-3 ring-sky-500 shadow-[0_0_20px_rgba(14,165,233,0.35)]'
      : visualState === 'listening'
        ? 'ring-3 ring-emerald-500 shadow-[0_0_18px_rgba(16,185,129,0.35)]'
        : visualState === 'thinking'
          ? 'ring-3 ring-amber-400 shadow-[0_0_16px_rgba(245,158,11,0.3)]'
          : 'ring-2 ring-sky-300';

  const simpleMotionClass =
    effectiveAnimationMode === 'simple'
      ? visualState === 'talking'
        ? 'scale-[1.03] transition-transform duration-150'
        : visualState === 'listening'
          ? 'scale-[1.02] transition-transform duration-200'
          : ''
      : '';

  return (
    <div
      data-testid="virtual-guide-visual"
      data-state={visualState}
      data-mode={canvasFailed ? 'still' : effectiveAnimationMode}
      onContextMenu={(e) => e.preventDefault()}
      className={`relative rounded-full overflow-hidden bg-gradient-to-b from-[#e0f2fe] to-[#f4f9fc] select-none shrink-0 ${ringClass} ${simpleMotionClass}`}
      style={{ width: `${dimension}px`, height: `${dimension}px` }}
      aria-label="Virtual Guide animated teacher avatar"
    >
      {!canvasFailed ? (
        <canvas
          ref={canvasRef}
          width={dimension}
          height={dimension}
          className="w-full h-full block pointer-events-none select-none"
        />
      ) : (
        <img
          src={guidePhotoUrl}
          alt="Virtual Guide still portrait"
          draggable={false}
          className="w-full h-full object-cover pointer-events-none select-none"
        />
      )}
    </div>
  );
};
