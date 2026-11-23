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

        ctx.fillStyle = '#1f3a56';
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
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#1f3a56]/25 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Calibrate Virtual Guide"
      onClick={() => setCalibrateModalOpen(false)}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-[#ffffff] border border-[#dbe9f4] shadow-2xl p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#dbe9f4] pb-3">
          <div>
            <h3 className="text-lg font-extrabold text-[#1f3a56] flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-[#0284c7]" />
              <span>Calibrate guide</span>
            </h3>
            <p className="text-xs text-[#3b5775] mt-0.5">
              Tap each facial point in order so lip movement and blinks align naturally.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCalibrateModalOpen(false)}
            className="p-1.5 rounded-xl text-[#3b5775] hover:text-[#1f3a56] hover:bg-[#f4f9fe] cursor-pointer"
            aria-label="Close calibration"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Active Step Prompt */}
        <div className="p-3 rounded-xl bg-[#f4f9fe] border border-[#dbe9f4] text-xs">
          <span className="font-bold text-[#0284c7] block">
            Step {stepIdx + 1} of {LANDMARK_STEPS.length}: {activeStep.label}
          </span>
          <span className="text-[#1f3a56]">{activeStep.prompt}</span>
        </div>

        {/* Canvas Touch Target */}
        <div className="flex justify-center">
          <canvas
            ref={canvasRef}
            width={260}
            height={260}
            onClick={handleCanvasClick}
            data-testid="calibration-canvas"
            className="w-[260px] h-[260px] rounded-2xl border border-[#dbe9f4] cursor-crosshair select-none bg-[#f4f9fe]"
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
                  ? 'bg-[#0284c7] text-white border-[#0284c7]'
                  : 'bg-[#ffffff] text-[#1f3a56] border-[#dbe9f4] hover:bg-[#f4f9fe]'
              }`}
            >
              {idx + 1}. {st.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#dbe9f4]">
          <button
            type="button"
            onClick={handleResetDefault}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#1f3a56] bg-[#ffffff] hover:bg-[#f4f9fe] border border-[#dbe9f4] transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#0284c7]" />
            <span>Reset to default</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCalibrateModalOpen(false)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#ffffff] border border-[#dbe9f4] text-[#1f3a56] hover:bg-[#f4f9fe] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold shadow-sm transition cursor-pointer"
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
