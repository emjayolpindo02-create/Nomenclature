import React, { useEffect, useRef, useState } from 'react';
import { X, RotateCcw, Check, Crosshair } from 'lucide-react';
import guidePhotoUrl from '../../assets/guide-photo.jpg';
import { useGuide } from '../../context/GuideContext';
import { FaceCalibration } from '../../types/guide';
import { DEFAULT_FACE_CALIBRATION } from '../../engine/guideSpeechTimeline';
import { stripOuterCheckerboard } from '../../utils/avatarCutout';

type LandmarkKey = 'mouthLeft' | 'mouthRight' | 'mouthTop' | 'chin' | 'leftEye' | 'rightEye';

const LANDMARK_STEPS: { key: LandmarkKey; label: string; prompt: string }[] = [
  { key: 'mouthLeft', label: 'Left Mouth Corner', prompt: 'Tap the left corner of the mouth.' },
  { key: 'mouthRight', label: 'Right Mouth Corner', prompt: 'Tap the right corner of the mouth.' },
  { key: 'mouthTop', label: 'Top of Lips', prompt: 'Tap the top center of the upper lip.' },
  { key: 'chin', label: 'Bottom of Chin', prompt: 'Tap the bottom edge of the chin.' },
  { key: 'leftEye', label: 'Left Eye', prompt: 'Tap the center of the left eye.' },
  { key: 'rightEye', label: 'Right Eye', prompt: 'Tap the center of the right eye.' },
];

export const CalibrateGuideModal: React.FC = () => {
  const {
    calibrateModalOpen,
    setCalibrateModalOpen,
    guideSettings,
    updateCalibration,
    resetCalibration,
  } = useGuide();

  const [draft, setDraft] = useState<FaceCalibration>(guideSettings.calibration);
  const [stepIdx, setStepIdx] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (calibrateModalOpen) {
      setDraft({ ...guideSettings.calibration });
      setStepIdx(0);
    }
  }, [calibrateModalOpen, guideSettings.calibration]);

  // Render bundled portrait onto canvas so it cannot be directly downloaded as an image file
  useEffect(() => {
    if (!calibrateModalOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      const size = 260;
      const off = document.createElement('canvas');
      off.width = img.naturalWidth || 148;
      off.height = img.naturalHeight || 148;
      const octx = off.getContext('2d');
      if (octx) {
        octx.drawImage(img, 0, 0, off.width, off.height);
        try {
          const data = octx.getImageData(0, 0, off.width, off.height);
          stripOuterCheckerboard(data.data, off.width, off.height);
          octx.putImageData(data, 0, 0);
        } catch {
          // ignore if canvas pixel read unavailable
        }
      }
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(octx ? off : img, 0, 0, size, size);

      // Draw landmarks
      LANDMARK_STEPS.forEach((step, idx) => {
        const pt = draft[step.key];
        const px = pt.x * size;
        const py = pt.y * size;
        const isCurrent = idx === stepIdx;
        ctx.save();
        ctx.beginPath();
        ctx.arc(px, py, isCurrent ? 7 : 5, 0, Math.PI * 2);
        ctx.fillStyle = isCurrent ? '#0ea5e9' : '#10b981';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(idx + 1), px, py);
        ctx.restore();
      });
    };
    img.src = guidePhotoUrl;
  }, [calibrateModalOpen, draft, stepIdx]);

  if (!calibrateModalOpen) return null;

  const activeStep = LANDMARK_STEPS[stepIdx];

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = Math.min(0.95, Math.max(0.05, Number(((e.clientX - rect.left) / rect.width).toFixed(4))));
    const y = Math.min(0.95, Math.max(0.05, Number(((e.clientY - rect.top) / rect.height).toFixed(4))));

    setDraft((prev) => ({
      ...prev,
      [activeStep.key]: { x, y },
      isCustom: true,
    }));

    if (stepIdx + 1 < LANDMARK_STEPS.length) {
      setStepIdx(stepIdx + 1);
    }
  };

  const handleSave = () => {
    updateCalibration({ ...draft, isCustom: true });
    setCalibrateModalOpen(false);
  };

  const handleResetDefault = () => {
    setDraft({ ...DEFAULT_FACE_CALIBRATION, isCustom: false });
    resetCalibration();
    setStepIdx(0);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/70"
      role="dialog"
      aria-modal="true"
      aria-label="Calibrate Virtual Guide"
      onClick={() => setCalibrateModalOpen(false)}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-sky-500" />
              <span>Calibrate guide</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tap each facial point in order so lip movement and blinks align naturally.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCalibrateModalOpen(false)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            aria-label="Close calibration"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Active Step Prompt */}
        <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-xs">
          <span className="font-bold text-sky-700 dark:text-sky-300 block">
            Step {stepIdx + 1} of {LANDMARK_STEPS.length}: {activeStep.label}
          </span>
          <span className="text-slate-700 dark:text-slate-300">{activeStep.prompt}</span>
        </div>

        {/* Canvas Touch Target */}
        <div className="flex justify-center">
          <canvas
            ref={canvasRef}
            width={260}
            height={260}
            onClick={handleCanvasClick}
            data-testid="calibration-canvas"
            className="w-[260px] h-[260px] rounded-2xl border-2 border-slate-300 dark:border-slate-700 cursor-crosshair select-none bg-gradient-to-b from-slate-800 to-slate-900"
          />
        </div>

        {/* Landmark selector pills for adjusting individual points */}
        <div className="grid grid-cols-3 gap-1.5">
          {LANDMARK_STEPS.map((st, idx) => (
            <button
              key={st.key}
              type="button"
              onClick={() => setStepIdx(idx)}
              className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold border transition cursor-pointer truncate ${
                idx === stepIdx
                  ? 'bg-sky-600 text-white border-sky-600'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              {idx + 1}. {st.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleResetDefault}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to default</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCalibrateModalOpen(false)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-sm transition cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Calibration</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
